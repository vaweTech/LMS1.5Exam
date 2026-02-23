"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CheckAuth from "../../../../../lib/CheckAuth";
import { getProgramBySlug, CRT_COMMON_200HR, CRT_TECHNICAL_200HR } from "../../../../../lib/crtProgramsData";
import { createSlug, createCourseUrl } from "../../../../../lib/urlUtils";
import { db, auth } from "../../../../../lib/firebase";
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
import {
  ArrowLeftIcon,
  BookOpenIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  AcademicCapIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

function titleFromSlug(slug) {
  return slug
    ?.split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ") || "";
}

function getEmbedUrl(url) {
  if (!url) return "";
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\\s]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  if (url.includes("youtube.com/embed/")) return url;
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const driveMatch = url.match(driveRegex);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  return url;
}

// Dummy day-wise data when no course/chapters from Firebase (for demo)
const DUMMY_CHAPTERS = [
  {
    id: "dummy-1",
    order: 1,
    title: "Introduction and History of Python",
    topics: "Introduction to Python\nHistory of Python\nWhy Python Became Popular",
    pdfDocument: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pptUrl: "https://docs.google.com/presentation/d/1/dummy/view",
    liveClassLink: "https://meet.google.com/dummy",
    recordedClassLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    classDocs: "https://docs.google.com/document/d/1/dummy/view",
  },
  {
    id: "dummy-2",
    order: 2,
    title: "Variables and Data Types",
    topics: "Variables and Identifiers\nNumeric Types\nStrings and Basic Operations",
    pdfDocument: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pptUrl: "https://docs.google.com/presentation/d/2/dummy/view",
    liveClassLink: "https://meet.google.com/dummy",
    recordedClassLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    classDocs: "https://docs.google.com/document/d/2/dummy/view",
  },
  {
    id: "dummy-3",
    order: 3,
    title: "Control Flow and Functions",
    topics: "Conditionals and Loops\nDefining Functions\nScope and Return Values",
    pdfDocument: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pptUrl: "https://docs.google.com/presentation/d/3/dummy/view",
    liveClassLink: "",
    recordedClassLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    classDocs: "https://docs.google.com/document/d/3/dummy/view",
  },
];

export default function CRTCoursePage() {
  const router = useRouter();
  const params = useParams();
  const programSlug = params?.slug;
  const courseSlug = params?.courseId;
  const program = programSlug ? getProgramBySlug(programSlug) : null;

  const allCommon = CRT_COMMON_200HR.map((n) => ({ name: n, slug: createSlug(n) }));
  const allTechnical =
    program && CRT_TECHNICAL_200HR[program.id]
      ? CRT_TECHNICAL_200HR[program.id].map((n) => ({ name: n, slug: createSlug(n) }))
      : [];
  const commonMatch = allCommon.find((c) => c.slug === courseSlug);
  const technicalMatch = allTechnical.find((c) => c.slug === courseSlug);
  const courseName = commonMatch?.name || technicalMatch?.name || titleFromSlug(courseSlug);
  const isCommon = Boolean(commonMatch);

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [progressTests, setProgressTests] = useState([]);
  const [progressTestSubmissions, setProgressTestSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);
  const [initialExpandDone, setInitialExpandDone] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [user, setUser] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, percent: 0 });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Fetch attendance for this course (when course + user available)
  useEffect(() => {
    if (!course?.id || !user?.uid) {
      setAttendanceStats({ total: 0, present: 0, percent: 0 });
      return;
    }
    const courseId = course.id;
    let cancelled = false;
    (async () => {
      try {
        const attCol = collection(db, "attendance");
        const trainerSnap = await getDocs(
          query(attCol, where("type", "==", "trainer"), where("courseId", "==", courseId))
        );
        const selfSnap = await getDocs(
          query(attCol, where("type", "==", "self"), where("courseId", "==", courseId), where("userId", "==", user.uid))
        );
        const trainerChapters = new Set();
        const trainerPresentChapters = new Set();
        let studentDocId = user.uid;
        try {
          const directSnap = await getDoc(doc(db, "students", user.uid));
          if (!directSnap.exists()) {
            const sq = query(collection(db, "students"), where("uid", "==", user.uid));
            const sSnap = await getDocs(sq);
            if (!sSnap.empty) studentDocId = sSnap.docs[0].id;
          }
        } catch (_) {}
        trainerSnap.docs.forEach((d) => {
          const data = d.data() || {};
          const chId = data.chapterId;
          if (!chId) return;
          trainerChapters.add(chId);
          const presentArr = Array.isArray(data.present) ? data.present : [];
          if (presentArr.includes(studentDocId)) trainerPresentChapters.add(chId);
        });
        const selfChapters = new Set();
        selfSnap.docs.forEach((d) => {
          const data = d.data() || {};
          if (data.chapterId) selfChapters.add(data.chapterId);
        });
        const totalChapters = new Set([...trainerChapters, ...selfChapters]);
        const selfOnlyPresent = new Set([...selfChapters].filter((ch) => !trainerChapters.has(ch)));
        const presentChapters = new Set([...trainerPresentChapters, ...selfOnlyPresent]);
        const total = totalChapters.size;
        const present = presentChapters.size;
        const percent = total > 0 ? Math.round((present / total) * 100) : 0;
        if (!cancelled) setAttendanceStats({ total, present, percent });
      } catch (e) {
        if (!cancelled) setAttendanceStats({ total: 0, present: 0, percent: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, [course?.id, user?.uid]);

  useEffect(() => {
    async function resolveAndFetch() {
      if (!programSlug || !courseSlug || !program) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const crtSnap = await getDocs(collection(db, "crt"));
        let resolvedCrtId = null;
        let resolvedCourse = null;
        for (const crtDoc of crtSnap.docs) {
          const data = crtDoc.data();
          const matchesProgram =
            (data.programId && data.programId === programSlug) ||
            (data.name && createSlug(data.name) === programSlug) ||
            (data.name && data.name === program.title);
          if (!matchesProgram) continue;
          resolvedCrtId = crtDoc.id;
          const coursesRef = collection(db, "crt", crtDoc.id, "courses");
          const coursesSnap = await getDocs(coursesRef);
          const found = coursesSnap.docs.find(
            (c) => createSlug(c.data().title || "") === courseSlug
          );
          if (found) {
            resolvedCourse = { id: found.id, ...found.data() };
            break;
          }
        }
        if (!resolvedCourse || !resolvedCrtId) {
          setCourse(null);
          setChapters([]);
          setProgressTests([]);
          setLoading(false);
          return;
        }
        setCourse(resolvedCourse);

        const chaptersRef = collection(
          db,
          "crt",
          resolvedCrtId,
          "courses",
          resolvedCourse.id,
          "chapters"
        );
        const chaptersQuery = query(chaptersRef, orderBy("order", "asc"));
        const chaptersSnap = await getDocs(chaptersQuery);
        const chapterList = chaptersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChapters(chapterList);

        try {
          const testsSnap = await getDocs(
            collection(mcqDb, "copiedcourses", resolvedCourse.id, "assignments")
          );
          const tests = testsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setProgressTests(tests);

          if (user) {
            const submissionsMap = {};
            await Promise.all(
              tests.map(async (test) => {
                const submissionsRef = collection(
                  mcqDb,
                  "copiedcourses",
                  resolvedCourse.id,
                  "assignments",
                  test.id,
                  "submissions"
                );
                const q = query(submissionsRef, where("studentId", "==", user.uid));
                const subSnap = await getDocs(q);
                if (!subSnap.empty) {
                  const doc = subSnap.docs[0];
                  submissionsMap[test.id] = {
                    id: doc.id,
                    ...doc.data(),
                    submittedAt: doc.data().submittedAt?.toDate?.() || new Date(),
                  };
                }
              })
            );
            setProgressTestSubmissions(submissionsMap);
          }
        } catch {
          setProgressTests([]);
        }
      } catch (e) {
        console.error("CRT course fetch error:", e);
        setCourse(null);
        setChapters([]);
        setProgressTests([]);
      } finally {
        setLoading(false);
      }
    }
    resolveAndFetch();
  }, [programSlug, courseSlug, program?.id, program?.title, program, user?.uid, user]);

  // Expand first day by default for better experience (once content is ready)
  useEffect(() => {
    if (loading || initialExpandDone) return;
    const list = chapters.length > 0 ? chapters : DUMMY_CHAPTERS;
    if (list.length > 0) {
      setExpandedDay(list[0].id);
      setInitialExpandDone(true);
    }
  }, [loading, chapters, initialExpandDone]);

  if (!program) {
    return (
      <CheckAuth>
        <div className="min-h-screen bg-slate-50 pt-20 flex flex-col items-center justify-center px-4">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Programme not found</h1>
          <Link href="/crt" className="text-[#00448a] font-semibold hover:underline">
            ← Back to CRT Programmes
          </Link>
        </div>
      </CheckAuth>
    );
  }

  const openPdf = (url, title) => {
    if (!url) return;
    router.push(
      `/view-pdf-secure?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || "PDF")}`
    );
  };
  const openPpt = (url, title) => {
    if (!url) return;
    router.push(
      `/view-ppt?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || "PPT")}`
    );
  };
  const openProgressTest = (test) => {
    const slug = createCourseUrl(course?.title || courseName);
    if (!slug) return;
    router.push(
      `/courses/${slug}/assignments/${test.id}?courseId=${course?.id || ""}`
    );
  };

  const displayChapters = chapters.length > 0 ? chapters : DUMMY_CHAPTERS;

  const pendingAssignments = progressTests.filter((t) => !progressTestSubmissions[t.id]);

  return (
    <CheckAuth>
      <div className="min-h-screen bg-slate-100 pt-16 pb-20">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Link
            href={`/crt/${programSlug}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-[#00448a] font-medium text-sm mb-6 sm:mb-8 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to {program.title}
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
            {/* Main content: course card with days */}
            <div className="flex-1 min-w-0 order-2 lg:order-1">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div
                  className={`px-6 sm:px-8 lg:px-10 py-6 sm:py-7 flex items-center gap-4 ${
                    isCommon
                      ? "bg-gradient-to-r from-slate-700 to-slate-600"
                      : "bg-gradient-to-r from-[#1a5796] to-[#0d3a6e]"
                  }`}
                >
                  <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <BookOpenIcon className="w-7 h-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                      {program.title} • {isCommon ? "Aptitude & Soft Skills" : "Technical"}
                    </p>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-1 truncate">{courseName}</h1>
                  </div>
                </div>

                <div className="p-6 sm:p-8 lg:p-10">
                  {loading ? (
                    <p className="text-slate-500">Loading course content...</p>
                  ) : (
                    <>
                  <div className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-5">Course content (day-wise)</h2>
                  {displayChapters.map((ch, idx) => {
                    const dayNumber = typeof ch.order === "number" ? ch.order : idx + 1;
                    const dayTests = progressTests.filter(
                      (t) => (typeof t.day === "number" ? t.day : 1) === dayNumber
                    );
                    const isExpanded = expandedDay === ch.id || expandedDay === dayNumber;

                    return (
                      <div
                        key={ch.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDay(isExpanded ? null : ch.id)
                          }
                          className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/80 transition-colors text-left border-0"
                        >
                          <span className="font-semibold text-slate-800 text-base sm:text-lg">
                            Day {dayNumber}: {ch.title || `Day ${dayNumber}`}
                          </span>
                          {isExpanded ? (
                            <ChevronUpIcon className="w-5 h-5 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5 text-slate-500 shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-3 border-t border-slate-100 sm:px-5 sm:pb-5 sm:pt-4">
                            {ch.topics && (
                              <div className="mb-5">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-[#0d3a6e] mb-2">
                                  <BookOpenIcon className="w-4 h-4" />
                                  Topics
                                </h4>
                                <p className="text-sm sm:text-base text-slate-600 whitespace-pre-line leading-relaxed max-w-4xl">
                                  {ch.topics}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 sm:gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const url = ch.pdfDocument || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
                                  openPdf(url, ch.title || courseName || "PDF");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-100 text-violet-800 hover:bg-violet-200 text-sm font-medium"
                              >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const url = ch.pptUrl || "https://docs.google.com/presentation/d/1/dummy/view";
                                  openPpt(url, ch.title || courseName || "PPT");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm font-medium"
                              >
                                <DocumentTextIcon className="w-4 h-4" />
                                PPT
                              </button>
                              {ch.liveClassLink && (
                                <a
                                  href={ch.liveClassLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-sm font-medium"
                                >
                                  <VideoCameraIcon className="w-4 h-4" />
                                  Live Class
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const url = ch.recordedClassLink || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
                                  const embed = getEmbedUrl(url);
                                  if (!embed) return;
                                  if (activeChapterId === ch.id && activeVideoUrl === embed) {
                                    setActiveVideoUrl("");
                                    setActiveVideoTitle("");
                                    setActiveChapterId(null);
                                  } else {
                                    setActiveVideoUrl(embed);
                                    setActiveVideoTitle(`${ch.title || "Class"} - Recorded`);
                                    setActiveChapterId(ch.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-sm font-medium"
                              >
                                <VideoCameraIcon className="w-4 h-4" />
                                Recorded Class
                              </button>
                              {dayTests.length > 0 ? (
                                dayTests.map((test, testIdx) => {
                                  const submission = progressTestSubmissions[test.id];
                                  const isSubmitted = !!submission;
                                  const label = dayTests.length === 1 ? "Progress Test (1)" : `Progress Test (${testIdx + 1})`;
                                  return (
                                    <button
                                      key={test.id}
                                      type="button"
                                      onClick={() => openProgressTest(test)}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-medium"
                                    >
                                      <DocumentTextIcon className="w-4 h-4" />
                                      {test.title || label}
                                      {isSubmitted && (
                                        <span className="ml-1 w-4 h-4 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center">✓</span>
                                      )}
                                    </button>
                                  );
                                })
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => alert("Progress test will be available when assigned to this day.")}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-medium"
                                >
                                  <DocumentTextIcon className="w-4 h-4" />
                                  Progress Test (1)
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const url = ch.referenceDocument || ch.classDocs || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
                                  openPdf(url, `${ch.title || "Reference"} - Trainer document`);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 text-sm font-medium"
                              >
                                <AcademicCapIcon className="w-4 h-4" />
                                Trainer reference document
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const subject = encodeURIComponent(`Feedback: ${courseName} - Day ${dayNumber}`);
                                  window.location.href = `mailto:feedback@example.com?subject=${subject}`;
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-pink-100 text-pink-800 hover:bg-pink-200 text-sm font-medium"
                              >
                                <StarIcon className="w-4 h-4" />
                                Feedback
                              </button>
                            </div>

                            {activeVideoUrl && activeChapterId === ch.id && (
                              <div className="mt-5">
                                <h4 className="text-sm font-semibold text-slate-800 mb-2">
                                  {activeVideoTitle}
                                </h4>
                                <div className="aspect-video w-full max-w-4xl rounded-xl overflow-hidden bg-black">
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
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              )}
                </div>
              </div>
            </div>

            {/* Right sidebar: Pending assignments & Attendance (top right, uses remaining space) */}
            <div className="lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-24 order-1 lg:order-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white shadow-md p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <ClipboardDocumentListIcon className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Pending assignments</h3>
                    {pendingAssignments.length === 0 ? (
                      <p className="text-sm text-slate-600">No pending assignments</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-amber-700">{pendingAssignments.length} pending</p>
                        <ul className="mt-1.5 space-y-0.5">
                          {pendingAssignments.slice(0, 3).map((t) => (
                            <li key={t.id} className="text-xs text-slate-600 truncate">
                              Day {t.day ?? "—"}: {t.title || "Progress Test"}
                            </li>
                          ))}
                          {pendingAssignments.length > 3 && (
                            <li className="text-xs text-slate-500">+{pendingAssignments.length - 3} more</li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-md p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <UserGroupIcon className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Attendance</h3>
                    {course?.id ? (
                      attendanceStats.total > 0 ? (
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-blue-700">{attendanceStats.present}</span>
                          <span className="text-slate-500"> / {attendanceStats.total} sessions</span>
                          <span className="ml-1.5 text-xs font-medium text-slate-600">
                            ({attendanceStats.percent}%)
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-slate-600">No attendance recorded yet</p>
                      )
                    ) : (
                      <p className="text-sm text-slate-500">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CheckAuth>
  );
}
