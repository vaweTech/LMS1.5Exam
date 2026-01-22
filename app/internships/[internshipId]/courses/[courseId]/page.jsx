"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "../../../../../lib/firebase";
import { mcqDb } from "../../../../../lib/firebaseMCQs";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { BookOpen, ArrowLeft, Play, FileText, Radio } from "lucide-react";
import { createCourseUrl } from "../../../../../lib/urlUtils";

// Helper to convert raw URLs into embeddable video URLs (YouTube / Google Drive)
function getEmbedUrl(url) {
  if (!url) return "";

  // YouTube
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  if (url.includes("youtube.com/embed/")) return url;

  // Google Drive
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveMatch = url.match(driveRegex);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  if (url.includes("drive.google.com/file/d/") && url.includes("/preview")) {
    return url;
  }

  // Fallback: return as-is
  return url;
}

export default function InternshipCoursePage() {
  const router = useRouter();
  const params = useParams();
  const internshipId = params?.internshipId;
  const courseId = params?.courseId;

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isTrainerUser, setIsTrainerUser] = useState(false);

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [progressTests, setProgressTests] = useState([]);
  const [progressTestSubmissions, setProgressTestSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  // Inline video player state (per chapter)
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [accessibleChapters, setAccessibleChapters] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        try {
          // Check role from users collection to see if this is a trainer/admin
          const userSnap = await getDoc(doc(db, "users", u.uid));
          const role = userSnap.exists() ? userSnap.data().role : undefined;
          const trainerLike =
            role === "trainer" || role === "admin" || role === "superadmin";
          setIsTrainerUser(trainerLike);
        } catch {
          setIsTrainerUser(false);
        }
      } else {
        setIsTrainerUser(false);
      }
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!internshipId || !courseId) return;
      try {
        setLoading(true);
        const courseRef = doc(db, "internships", internshipId, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
          const data = courseSnap.data();
          setCourse({ id: courseSnap.id, ...data });
        }

        const chaptersRef = collection(
          db,
          "internships",
          internshipId,
          "courses",
          courseId,
          "chapters"
        );
        const qCh = query(chaptersRef, orderBy("order", "asc"));
        const chaptersSnap = await getDocs(qCh);
        const list = chaptersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChapters(list);

        // Load progress tests / assignments from copiedcourses collection (separate from master courses)
        try {
          const testsSnap = await getDocs(
            collection(mcqDb, "copiedcourses", courseId, "assignments")
          );
          const tests = testsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setProgressTests(tests);
          
          // Load submissions for the current user (if logged in)
          if (user) {
            const submissionsMap = {};
            await Promise.all(
              tests.map(async (test) => {
                try {
                  const submissionsRef = collection(
                    mcqDb,
                    "copiedcourses",
                    courseId,
                    "assignments",
                    test.id,
                    "submissions"
                  );
                  const submissionQuery = query(submissionsRef, where("studentId", "==", user.uid));
                  const submissionSnap = await getDocs(submissionQuery);
                  
                  if (!submissionSnap.empty) {
                    const userSubmission = submissionSnap.docs[0];
                    submissionsMap[test.id] = {
                      id: userSubmission.id,
                      ...userSubmission.data(),
                      submittedAt: userSubmission.data().submittedAt?.toDate?.() || new Date(),
                    };
                  }
                } catch (err) {
                  console.error(`Error fetching submission for test ${test.id}:`, err);
                }
              })
            );
            setProgressTestSubmissions(submissionsMap);
          }
        } catch (err) {
          console.error("Failed to load progress tests for internship course:", err);
          setProgressTests([]);
        }
      } catch (e) {
        console.error("Failed to load internship course:", e);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      fetchData();
    }
  }, [internshipId, courseId, user]);

  // Load which chapters are unlocked for this user (internship course access)
  useEffect(() => {
    async function loadAccess() {
      if (!user || !courseId || !internshipId) return;

      try {
        // Trainers/admins: mirror what students see by looking at the first internship student's chapterAccess
        if (isTrainerUser) {
          const internsSnap = await getDocs(
            collection(db, "internships", internshipId, "students")
          );
          const firstWithId = internsSnap.docs
            .map((d) => d.data())
            .find(
              (s) =>
                typeof s.studentId === "string" && s.studentId.trim().length > 0
            );

          if (firstWithId) {
            const sSnap = await getDoc(doc(db, "students", firstWithId.studentId));
            if (sSnap.exists()) {
              const data = sSnap.data() || {};
              const chapterAccess = data.chapterAccess || {};
              const unlocked = Array.isArray(chapterAccess[courseId])
                ? chapterAccess[courseId]
                : [];
              setAccessibleChapters(unlocked);
              return;
            }
          }
          // Fallback: no student found → treat as all locked
          setAccessibleChapters([]);
          return;
        }

        // Students: use chapterAccess from their own student document
        let studentDoc = await getDoc(doc(db, "students", user.uid));
        if (!studentDoc.exists()) {
          const q = query(
            collection(db, "students"),
            where("uid", "==", user.uid)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            studentDoc = snap.docs[0];
          }
        }
        if (studentDoc && studentDoc.exists()) {
          const data = studentDoc.data() || {};
          const chapterAccess = data.chapterAccess || {};
          const unlocked = Array.isArray(chapterAccess[courseId])
            ? chapterAccess[courseId]
            : [];
          setAccessibleChapters(unlocked);
        } else {
          setAccessibleChapters([]);
        }
      } catch (e) {
        console.error("Failed to load internship chapter access:", e);
        setAccessibleChapters([]);
      }
    }
    loadAccess();
  }, [user, courseId, isTrainerUser, internshipId]);

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading course...
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-4">Course not found.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg bg-[#00448a] text-white"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-[#00448a] hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Internship Courses
        </button>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#00448a]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#00448a]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                {course.title || "Untitled Course"}
              </h1>
              {course.description && (
                <p className="text-sm text-gray-600">{course.description}</p>
              )}
              {course.courseCode && (
                <p className="mt-1 text-xs text-gray-500">
                  Code: {course.courseCode}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sm:p-7 space-y-6">
          <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Chapters</h2>
          {chapters.length === 0 ? (
            <p className="text-sm text-gray-500">No chapters added yet.</p>
          ) : (
            <div className="space-y-3">
              {chapters.map((ch, idx) => {
                const dayNumber =
                  typeof ch.order === "number" ? ch.order : idx + 1;
                const dayTests = progressTests.filter(
                  (t) => typeof t.day === "number" && t.day === dayNumber
                );
                // Access is driven by unlocks / chapterAccess
                const hasAccess = accessibleChapters.includes(ch.id);

                return (
                <div
                  key={ch.id}
                  className={`border rounded-lg p-3 sm:p-4 flex flex-col gap-2 ${
                    hasAccess ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                        {ch.title || "Untitled Chapter"}
                      </h3>
                      {!hasAccess && (
                        <p className="mt-0.5 text-[11px] font-medium text-red-600">
                          Locked – wait for your trainer to unlock this day.
                        </p>
                      )}
                      {ch.topics && (
                        <p className="mt-1 text-xs sm:text-sm text-gray-600">
                          {ch.topics}
                        </p>
                      )}
                    </div>
                    {typeof ch.order !== "undefined" && (
                      <span className="text-[11px] px-2 py-1 rounded-full bg-gray-50 border text-gray-500">
                        #{ch.order}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1">
                    {/* Topic / chapter video (inline player under this chapter) */}
                    {hasAccess && ch.video && (
                      <button
                        type="button"
                        onClick={() => {
                          const embed = getEmbedUrl(ch.video);
                          if (!embed) return;
                          // Toggle: if the same video is already open, close it
                          if (
                            activeChapterId === ch.id &&
                            activeVideoUrl === embed
                          ) {
                            setActiveVideoUrl("");
                            setActiveVideoTitle("");
                            setActiveChapterId(null);
                          } else {
                            setActiveVideoUrl(embed);
                            setActiveVideoTitle(
                              ch.title || course.title || "Topic Video"
                            );
                            setActiveChapterId(ch.id);
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Topic Video
                      </button>
                    )}

                      {/* PPT from dedicated PPT URL (Google Slides) */}
                      {hasAccess && ch.pptUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `/view-ppt?url=${encodeURIComponent(
                              ch.pptUrl
                            )}&title=${encodeURIComponent(
                              ch.title || course.title || "Presentation"
                            )}`;
                            router.push(url);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View PPT
                        </button>
                    )}

                      {/* PDF from Google Drive URL (secure PDF viewer) */}
                    {hasAccess && ch.pdfDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `/view-pdf-secure?url=${encodeURIComponent(
                              ch.pdfDocument
                            )}&title=${encodeURIComponent(
                              ch.title || course.title || "PDF Document"
                            )}`;
                            router.push(url);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        View PDF
                        </button>
                    )}

                      {/* Live class link (Zoom / Meet) */}
                      {hasAccess && ch.liveClassLink && (
                      <a
                          href={ch.liveClassLink}
                        target="_blank"
                        rel="noreferrer"
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                          Live Class
                      </a>
                    )}

                      {/* Recorded class video (inline player under this chapter) */}
                      {hasAccess && ch.recordedClassLink && (
                        <button
                          type="button"
                          onClick={() => {
                            const embed = getEmbedUrl(ch.recordedClassLink);
                            if (!embed) return;
                            // Toggle: if the same recorded video is already open, close it
                            if (
                              activeChapterId === ch.id &&
                              activeVideoUrl === embed
                            ) {
                              setActiveVideoUrl("");
                              setActiveVideoTitle("");
                              setActiveChapterId(null);
                            } else {
                              setActiveVideoUrl(embed);
                              setActiveVideoTitle(
                                `${ch.title || course.title || "Class"} - Recorded`
                              );
                              setActiveChapterId(ch.id);
                            }
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Recorded Class
                        </button>
                      )}

                      {/* Extra docs / class slides – open via secure PPT viewer */}
                      {hasAccess && ch.classDocs && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `/view-ppt?url=${encodeURIComponent(
                              ch.classDocs
                            )}&title=${encodeURIComponent(
                              ch.title || course.title || "Class Docs"
                            )}`;
                            router.push(url);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Class Docs
                        </button>
                    )}

                      {/* Reference Document (trainer-uploaded) - Always use secure PDF viewer */}
                      {hasAccess && ch.referenceDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            // Always use secure PDF viewer for reference documents
                            const docUrl = ch.referenceDocument;
                            const url = `/view-pdf-secure?url=${encodeURIComponent(
                              docUrl
                            )}&title=${encodeURIComponent(
                              `${ch.title || course.title || "Reference"} - Reference Document`
                            )}`;
                            router.push(url);
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Reference Document
                        </button>
                      )}
                  </div>

                  {/* Inline video player directly under this chapter */}
                  {hasAccess && activeVideoUrl && activeChapterId === ch.id && (
                    <div className="mt-3 w-full">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-1">
                        {activeVideoTitle}
                      </h4>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                        <iframe
                          src={activeVideoUrl}
                          title={activeVideoTitle}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                  </div>
                </div>
                  )}
                  
                  {/* Day-wise progress tests for this chapter */}
                  {hasAccess && dayTests.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {dayTests.map((test) => {
                        const submission = progressTestSubmissions[test.id] || null;
                        const isSubmitted = !!submission;
                        
                        return (
                          <div key={test.id} className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const slug = createCourseUrl(course.title || "");
                                if (!slug) return;
                                router.push(`/courses/${slug}/assignments/${test.id}`);
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                            >
                              <Radio className="w-3 h-3 mr-1" />
                              {test.title || test.name || `Progress Test (Day ${dayNumber})`}
                              {isSubmitted && (
                                <span className="ml-1 px-1.5 py-0.5 bg-green-500 rounded-full text-[10px] font-medium text-white">
                                  ✓
                                </span>
                              )}
                            </button>
                            
                            {/* Show submission results at a glance */}
                            {isSubmitted && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-2.5 space-y-1">
                                <div className="text-xs font-medium text-green-800">
                                  Submission Results:
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700 font-medium truncate flex-1 mr-2">
                                    {test.title || test.name || "Progress Test"}
                                  </span>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {typeof submission.autoScore === 'number' && (
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        submission.autoScore >= 80 ? 'bg-green-100 text-green-800' :
                                        submission.autoScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {submission.autoScore}%
                                      </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      submission.resultStatus === 'success' ? 'bg-green-200 text-green-800' :
                                      submission.resultStatus === 'partial' ? 'bg-yellow-200 text-yellow-800' :
                                      submission.resultStatus === 'fail' ? 'bg-red-200 text-red-800' :
                                      'bg-blue-200 text-blue-800'
                                    }`}>
                                      {submission.resultStatus === 'success' ? 'Completed' :
                                       submission.resultStatus === 'partial' ? 'Partial' :
                                       submission.resultStatus === 'fail' ? 'Failed' : 'Submitted'}
                                    </span>
                                  </div>
                                </div>
                                {submission.testSummary && (
                                  <div className="text-xs text-gray-600">
                                    Tests: {submission.testSummary.passCount}/{submission.testSummary.totalCount} passed
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  Submitted: {submission.submittedAt?.toLocaleDateString?.() || 'N/A'}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
              })}
              </div>
            )}
          </div>

          {/* Full MCQ practice for this course */}
          {course && course.title && (
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Full MCQ Practice
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-3">
                Use this link to attempt full MCQ practice for this course.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const slug = createCourseUrl(course.title || "");
                    if (!slug) return;
                    router.push(`/practice/${slug}`);
                  }}
                  className="inline-flex items-center px-3 py-1.5 text-xs rounded-full bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                >
                  <Radio className="w-3 h-3 mr-1" />
                  Full MCQ Practice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


