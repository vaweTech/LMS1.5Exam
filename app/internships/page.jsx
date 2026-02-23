"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import CheckAuth from "../../lib/CheckAuth";
import {
  CodeBracketIcon,
  ChartBarIcon,
  Squares2X2Icon,
  XMarkIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";

const INTERNSHIP_PROGRAMS = [
  {
    id: "python",
    title: "Python",
    description: "Hands-on Python internship covering fundamentals, OOP, Django/Flask, and real-world projects.",
    icon: CodeBracketIcon,
    duration: "3-6 months",
    gradient: "from-amber-100 via-orange-50 to-white",
    iconBg: "bg-amber-400/90",
  },
  {
    id: "java-fullstack",
    title: "Java Full Stack",
    description: "End-to-end Java Full Stack internship: Core Java, Spring Boot, React, and database integration.",
    icon: CodeBracketIcon,
    duration: "4-6 months",
    gradient: "from-rose-100 via-pink-50 to-white",
    iconBg: "bg-rose-400/90",
  },
  {
    id: "data-science",
    title: "Data Science",
    description: "Data Science internship with Python, statistics, ML, and visualization using real datasets.",
    icon: ChartBarIcon,
    duration: "3-6 months",
    gradient: "from-sky-100 via-blue-50 to-white",
    iconBg: "bg-sky-500/90",
  },
  {
    id: "data-analytics",
    title: "Data Analytics",
    description: "Data Analytics internship: SQL, Excel, Power BI/Tableau, and business reporting.",
    icon: Squares2X2Icon,
    duration: "2-4 months",
    gradient: "from-emerald-100 via-green-50 to-white",
    iconBg: "bg-emerald-500/90",
  },
];

// Dummy courses per program (shown when Firestore has no courses)
const DUMMY_COURSES_BY_PROGRAM = {
  python: [
    { id: "html", title: "HTML", totalChapters: 15, openedChapters: 0 },
    { id: "css", title: "CSS", totalChapters: 12, openedChapters: 0 },
    { id: "javascript", title: "JavaScript", totalChapters: 20, openedChapters: 0 },
    { id: "python", title: "Python", totalChapters: 18, openedChapters: 0 },
    { id: "advance-python", title: "Advance Python", totalChapters: 14, openedChapters: 0 },
  ],
  "java-fullstack": [
    { id: "html", title: "HTML", totalChapters: 15, openedChapters: 0 },
    { id: "css", title: "CSS", totalChapters: 12, openedChapters: 0 },
    { id: "js", title: "JS", totalChapters: 20, openedChapters: 0 },
    { id: "mysql", title: "MySQL", totalChapters: 16, openedChapters: 0 },
    { id: "core-java", title: "Core Java", totalChapters: 22, openedChapters: 0 },
    { id: "advanced-java", title: "Advanced Java", totalChapters: 18, openedChapters: 0 },
  ],
  "data-science": [
    { id: "python", title: "Python", totalChapters: 18, openedChapters: 0 },
    { id: "statistics", title: "Statistics", totalChapters: 14, openedChapters: 0 },
    { id: "ml", title: "Machine Learning", totalChapters: 20, openedChapters: 0 },
    { id: "visualization", title: "Data Visualization", totalChapters: 12, openedChapters: 0 },
  ],
  "data-analytics": [
    { id: "html", title: "Power BI", totalChapters: 10, openedChapters: 0 },
    { id: "css", title: "Tableau", totalChapters: 8, openedChapters: 0 },
    { id: "js", title: "Power Point & Excel", totalChapters: 12, openedChapters: 0 },
    { id: "sql", title: "SQL", totalChapters: 14, openedChapters: 0 },
  ],
};

export default function InternshipsPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [studentChapterAccess, setStudentChapterAccess] = useState({});

  // Resolve student doc for chapterAccess (progress)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStudentChapterAccess({});
        return;
      }
      try {
        const q = query(collection(db, "students"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setStudentChapterAccess(data.chapterAccess || {});
        } else {
          const byUid = doc(db, "students", user.uid);
          const byUidSnap = await getDoc(byUid);
          if (byUidSnap.exists())
            setStudentChapterAccess(byUidSnap.data().chapterAccess || {});
          else setStudentChapterAccess({});
        }
      } catch {
        setStudentChapterAccess({});
      }
    });
    return () => unsub();
  }, []);

  // When modal opens for a program, fetch its courses and progress
  useEffect(() => {
    if (!modalOpen || !selectedProgram) {
      setCourses([]);
      return;
    }
    let cancelled = false;
    setLoadingCourses(true);

    (async () => {
      try {
        const coursesRef = collection(db, "internships", selectedProgram.id, "courses");
        const snap = await getDocs(coursesRef);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (list.length === 0) {
          const dummy = DUMMY_COURSES_BY_PROGRAM[selectedProgram.id] || [];
          if (!cancelled) {
            setCourses(dummy);
            setLoadingCourses(false);
          }
          return;
        }

        const withProgress = await Promise.all(
          list.map(async (course) => {
            if (cancelled) return { ...course, totalChapters: 0, openedChapters: 0 };
            try {
              const chaptersRef = collection(
                db,
                "internships",
                selectedProgram.id,
                "courses",
                course.id,
                "chapters"
              );
              const chSnap = await getDocs(chaptersRef);
              const totalChapters = chSnap.size;
              const openedChapters = Array.isArray(studentChapterAccess[course.id])
                ? studentChapterAccess[course.id].length
                : 0;
              return {
                ...course,
                totalChapters,
                openedChapters,
              };
            } catch {
              return {
                ...course,
                totalChapters: 0,
                openedChapters: 0,
              };
            }
          })
        );

        if (!cancelled) setCourses(withProgress);
      } catch {
        const dummy = DUMMY_COURSES_BY_PROGRAM[selectedProgram?.id] || [];
        if (!cancelled) setCourses(dummy);
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depend on selectedProgram?.id only
  }, [modalOpen, selectedProgram?.id, studentChapterAccess]);

  const openModal = (program) => {
    setSelectedProgram(program);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedProgram(null);
  };

  const openCourse = (courseId) => {
    if (!selectedProgram) return;
    closeModal();
    router.push(`/internships/${selectedProgram.id}/courses/${courseId}`);
  };

  return (
    <CheckAuth>
      <div className="min-h-screen bg-gradient-to-r from-stone-50 via-slate-50 to-blue-50/40 pt-20 pb-16 px-4 sm:px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 text-[#1e3a5f]"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            Internship Programs
          </h1>
          <p className="text-center text-gray-600 text-base sm:text-lg mb-10 sm:mb-12 max-w-2xl mx-auto">
            Build industry-ready skills with our structured internship programs. Choose your track and start your journey.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INTERNSHIP_PROGRAMS.map((program) => {
              const Icon = program.icon;
              return (
                <div
                  key={program.id}
                  onClick={() => openModal(program)}
                  className="group flex flex-col bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className={`bg-gradient-to-b ${program.gradient} px-5 pt-6 pb-5`}>
                    <div className={`w-12 h-12 rounded-xl ${program.iconBg} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{program.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{program.duration}</p>
                  </div>
                  <div className="px-5 pt-4 pb-5 flex-1 flex flex-col">
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-4 flex-1">
                      {program.description}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(program);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#00448a] hover:bg-[#003a76] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      View Program
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-layer modal: courses list */}
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeModal}
              aria-hidden="true"
            />
            <div
              className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedProgram?.title} – Courses
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-sky-50/30 to-emerald-50/20">
                {loadingCourses ? (
                  <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-2 border-[#00448a]/30 border-t-[#00448a] rounded-full animate-spin" />
                  </div>
                ) : courses.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">No courses in this program yet.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {courses.map((course) => {
                      const title = course.title || course.name || course.id;
                      return (
                        <div
                          key={course.id}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col"
                        >
                          <h3 className="text-base font-bold text-gray-900 mb-4">{title}</h3>
                          <div className="flex items-center justify-between gap-2 mt-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCourse(course.id);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                              Course
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openCourse(course.id);
                              }}
                              className="inline-flex items-center gap-1 text-[#00448a] font-semibold text-sm hover:underline"
                            >
                              Open
                              <ArrowRightIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CheckAuth>
  );
}
