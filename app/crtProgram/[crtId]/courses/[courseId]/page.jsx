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
import { BookOpen, ArrowLeft, Play, FileText } from "lucide-react";
import { createCourseUrl } from "../../../../../lib/urlUtils";

function getEmbedUrl(url) {
  if (!url) return "";

  const youtubeRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  if (url.includes("youtube.com/embed/")) return url;

  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveMatch = url.match(driveRegex);
  if (driveMatch) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  if (url.includes("drive.google.com/file/d/") && url.includes("/preview")) {
    return url;
  }

  return url;
}

export default function CRTProgramCoursePage() {
  const router = useRouter();
  const params = useParams();
  const crtId = params?.crtId;
  const courseId = params?.courseId;

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [crt, setCrt] = useState(null);

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [progressTests, setProgressTests] = useState([]);
  const [progressTestSubmissions, setProgressTestSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [accessibleChapters, setAccessibleChapters] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!crtId || !courseId || !user) return;
      try {
        setLoading(true);

        const crtRef = doc(db, "crt", crtId);
        const crtSnap = await getDoc(crtRef);
        if (crtSnap.exists()) {
          setCrt({ id: crtSnap.id, ...crtSnap.data() });
        }

        const courseRef = doc(db, "crt", crtId, "courses", courseId);
        const courseSnap = await getDoc(courseRef);

        if (courseSnap.exists()) {
          const data = courseSnap.data();
          setCourse({ id: courseSnap.id, ...data });
        }

        const chaptersRef = collection(
          db,
          "crt",
          crtId,
          "courses",
          courseId,
          "chapters"
        );
        const qCh = query(chaptersRef, orderBy("order", "asc"));
        const chaptersSnap = await getDocs(qCh);
        const list = chaptersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChapters(list);

        try {
          const testsSnap = await getDocs(
            collection(mcqDb, "copiedcourses", courseId, "assignments")
          );
          const tests = testsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setProgressTests(tests);

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
                  const submissionQuery = query(
                    submissionsRef,
                    where("studentId", "==", user.uid)
                  );
                  const submissionSnap = await getDocs(submissionQuery);

                  if (!submissionSnap.empty) {
                    const userSubmission = submissionSnap.docs[0];
                    submissionsMap[test.id] = {
                      id: userSubmission.id,
                      ...userSubmission.data(),
                      submittedAt:
                        userSubmission.data().submittedAt?.toDate?.() ||
                        new Date(),
                    };
                  }
                } catch (err) {
                  console.error(
                    `Error fetching submission for test ${test.id}:`,
                    err
                  );
                }
              })
            );
            setProgressTestSubmissions(submissionsMap);
          }
        } catch (err) {
          console.error("Failed to load progress tests:", err);
          setProgressTests([]);
        }
      } catch (e) {
        console.error("Failed to load CRT course:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [crtId, courseId, user]);

  useEffect(() => {
    async function loadAccess() {
      if (!user || !courseId || !crtId) return;

      try {
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
        console.error("Failed to load chapter access:", e);
        setAccessibleChapters([]);
      }
    }
    loadAccess();
  }, [user, courseId, crtId]);

  if (loadingUser || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
        Loading course...
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
        <p className="text-gray-600 mb-4">Course not found.</p>
        <button
          onClick={() => router.push("/crtProgram")}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Back to CRT Programs
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <button
          onClick={() => router.push("/crtProgram")}
          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to CRT Programs
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                {course.title || "Untitled Course"}
              </h1>
              {course.description && (
                <p className="text-sm text-slate-600">{course.description}</p>
              )}
              {course.courseCode && (
                <p className="mt-1 text-xs text-slate-500">
                  Code: {course.courseCode}
                </p>
              )}
              {crt && (
                <p className="mt-1 text-xs text-indigo-600">
                  {crt.name || "CRT Program"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-7 space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Chapters</h2>
          {chapters.length === 0 ? (
            <p className="text-sm text-slate-500">No chapters added yet.</p>
          ) : (
            <div className="space-y-3">
              {chapters.map((ch, idx) => {
                const dayNumber =
                  typeof ch.order === "number" ? ch.order : idx + 1;
                const dayTests = progressTests.filter(
                  (t) => typeof t.day === "number" && t.day === dayNumber
                );
                const hasAccess = accessibleChapters.includes(ch.id);

                return (
                  <div
                    key={ch.id}
                    className={`border rounded-xl p-3 sm:p-4 flex flex-col gap-2 ${
                      hasAccess
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50/80 opacity-90"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          {ch.title || "Untitled Chapter"}
                        </h3>
                        {!hasAccess && (
                          <p className="mt-0.5 text-[11px] font-medium text-amber-600">
                            Locked – wait for your trainer to unlock.
                          </p>
                        )}
                        {ch.topics && (
                          <p className="mt-1 text-xs sm:text-sm text-slate-600">
                            {ch.topics}
                          </p>
                        )}
                      </div>
                      {typeof ch.order !== "undefined" && (
                        <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                          Day {ch.order}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      {hasAccess && ch.video && (
                        <button
                          type="button"
                          onClick={() => {
                            const embed = getEmbedUrl(ch.video);
                            if (!embed) return;
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
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Topic Video
                        </button>
                      )}

                      {hasAccess && ch.pptUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `/view-ppt?url=${encodeURIComponent(
                                ch.pptUrl
                              )}&title=${encodeURIComponent(
                                ch.title || course.title || "Presentation"
                              )}`
                            );
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View PPT
                        </button>
                      )}

                      {hasAccess && ch.pdfDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `/view-pdf-secure?url=${encodeURIComponent(
                                ch.pdfDocument
                              )}&title=${encodeURIComponent(
                                ch.title || course.title || "PDF Document"
                              )}`
                            );
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          View PDF
                        </button>
                      )}

                      {hasAccess && ch.liveClassLink && (
                        <a
                          href={ch.liveClassLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Live Class
                        </a>
                      )}

                      {hasAccess && ch.recordedClassLink && (
                        <button
                          type="button"
                          onClick={() => {
                            const embed = getEmbedUrl(ch.recordedClassLink);
                            if (!embed) return;
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
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Recorded Class
                        </button>
                      )}

                      {hasAccess && ch.classDocs && (
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `/view-ppt?url=${encodeURIComponent(
                                ch.classDocs
                              )}&title=${encodeURIComponent(
                                ch.title || course.title || "Class Docs"
                              )}`
                            );
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Class Docs
                        </button>
                      )}

                      {hasAccess && ch.referenceDocument && (
                        <button
                          type="button"
                          onClick={() => {
                            router.push(
                              `/view-pdf-secure?url=${encodeURIComponent(
                                ch.referenceDocument
                              )}&title=${encodeURIComponent(
                                `${ch.title || course.title || "Reference"} - Reference Document`
                              )}`
                            );
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Reference Document
                        </button>
                      )}
                    </div>

                    {hasAccess && activeVideoUrl && activeChapterId === ch.id && (
                      <div className="mt-3 w-full">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mb-1">
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

                    {hasAccess && dayTests.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {dayTests.map((test) => {
                          const submission =
                            progressTestSubmissions[test.id] || null;
                          const isSubmitted = !!submission;

                          return (
                            <div key={test.id} className="space-y-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const slug = createCourseUrl(
                                    course.title || ""
                                  );
                                  if (!slug) return;
                                  router.push(
                                    `/courses/${slug}/assignments/${test.id}`
                                  );
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                              >
                                {test.title ||
                                  test.name ||
                                  `Progress Test (Day ${dayNumber})`}
                                {isSubmitted && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-green-500 rounded-full text-[10px] font-medium text-white">
                                    ✓
                                  </span>
                                )}
                              </button>

                              {isSubmitted && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 space-y-1">
                                  <div className="text-xs font-medium text-green-800">
                                    Submission Results:
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-700 font-medium truncate flex-1 mr-2">
                                      {test.title ||
                                        test.name ||
                                        "Progress Test"}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {typeof submission.autoScore ===
                                        "number" && (
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            submission.autoScore >= 80
                                              ? "bg-green-100 text-green-800"
                                              : submission.autoScore >= 50
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-red-100 text-red-800"
                                          }`}
                                        >
                                          {submission.autoScore}%
                                        </span>
                                      )}
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          submission.resultStatus === "success"
                                            ? "bg-green-200 text-green-800"
                                            : submission.resultStatus ===
                                                "partial"
                                              ? "bg-yellow-200 text-yellow-800"
                                              : submission.resultStatus ===
                                                  "fail"
                                                ? "bg-red-200 text-red-800"
                                                : "bg-blue-200 text-blue-800"
                                        }`}
                                      >
                                        {submission.resultStatus === "success"
                                          ? "Completed"
                                          : submission.resultStatus ===
                                              "partial"
                                            ? "Partial"
                                            : submission.resultStatus === "fail"
                                              ? "Failed"
                                              : "Submitted"}
                                      </span>
                                    </div>
                                  </div>
                                  {submission.testSummary && (
                                    <div className="text-xs text-gray-600">
                                      Tests:{" "}
                                      {submission.testSummary.passCount}/
                                      {submission.testSummary.totalCount}{" "}
                                      passed
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    Submitted:{" "}
                                    {submission.submittedAt?.toLocaleDateString?.() ||
                                      "N/A"}
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

          {course && course.title && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 mb-3">
                Full MCQ Practice
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-3">
                Use this link to attempt full MCQ practice for this course.
              </p>
              <button
                type="button"
                onClick={() => {
                  const slug = createCourseUrl(course.title || "");
                  if (!slug) return;
                  router.push(`/practice/${slug}`);
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
              >
                Full MCQ Practice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
