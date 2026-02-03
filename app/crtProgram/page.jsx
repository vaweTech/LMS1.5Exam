"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "../../lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import {
  BookOpen,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

export default function CRTProgramPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentDocId, setStudentDocId] = useState(null);
  const [crts, setCrts] = useState([]);
  const [crtCourseCounts, setCrtCourseCounts] = useState({});
  const [selectedCrt, setSelectedCrt] = useState(null);
  const [crtCourses, setCrtCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const studentsRef = collection(db, "students");
          const q = query(studentsRef, where("uid", "==", u.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setStudentDocId(snap.docs[0].id);
          } else {
            setStudentDocId(null);
          }
        } catch (e) {
          console.error("Failed to get student:", e);
          setStudentDocId(null);
        }
      } else {
        setStudentDocId(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Fetch CRTs where this student is assigned
  useEffect(() => {
    if (!user || !studentDocId) {
      setCrts([]);
      return;
    }

    let unsubCrts = null;

    async function loadCrts() {
      try {
        setLoading(true);
        const crtRef = collection(db, "crt");
        const crtSnap = await getDocs(crtRef);
        const allCrts = crtSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const assignedCrtIds = new Set();
        for (const crt of allCrts) {
          const studentsRef = collection(db, "crt", crt.id, "students");
          const studentsSnap = await getDocs(studentsRef);
          const isAssigned = studentsSnap.docs.some(
            (d) => d.data().studentId === studentDocId
          );
          if (isAssigned) assignedCrtIds.add(crt.id);
        }

        const filtered = allCrts.filter((c) => assignedCrtIds.has(c.id));
        setCrts(filtered);

        const counts = {};
        for (const crt of filtered) {
          const coursesSnap = await getDocs(
            collection(db, "crt", crt.id, "courses")
          );
          counts[crt.id] = coursesSnap.size;
        }
        setCrtCourseCounts(counts);
      } catch (e) {
        console.error("Failed to load CRTs:", e);
      } finally {
        setLoading(false);
      }
    }

    loadCrts();
  }, [user, studentDocId]);

  // Load courses when a CRT is selected
  useEffect(() => {
    if (!selectedCrt) {
      setCrtCourses([]);
      return;
    }

    setLoadingCourses(true);
    const coursesRef = collection(db, "crt", selectedCrt.id, "courses");
    const unsub = onSnapshot(
      coursesRef,
      async (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (studentDocId && list.length > 0) {
          try {
            const studentRef = doc(db, "students", studentDocId);
            const studentSnap = await getDoc(studentRef);
            const studentData = studentSnap.exists() ? studentSnap.data() : {};
            const chapterAccess = studentData.chapterAccess || {};

            const withProgress = await Promise.all(
              list.map(async (course) => {
                try {
                  const chaptersRef = collection(
                    db,
                    "crt",
                    selectedCrt.id,
                    "courses",
                    course.id,
                    "chapters"
                  );
                  const chaptersSnap = await getDocs(chaptersRef);
                  const totalChapters = chaptersSnap.size;
                  const openedChapters = Array.isArray(chapterAccess[course.id])
                    ? chapterAccess[course.id].length
                    : 0;
                  const percentage =
                    totalChapters > 0
                      ? Math.round((openedChapters / totalChapters) * 100)
                      : 0;
                  return {
                    ...course,
                    _progress: { totalChapters, openedChapters, percentage },
                  };
                } catch {
                  return {
                    ...course,
                    _progress: {
                      totalChapters: 0,
                      openedChapters: 0,
                      percentage: 0,
                    },
                  };
                }
              })
            );
            setCrtCourses(withProgress);
          } catch {
            setCrtCourses(list);
          }
        } else {
          setCrtCourses(list);
        }
        setLoadingCourses(false);
      },
      (err) => {
        console.error("Failed to load CRT courses:", err);
        setCrtCourses([]);
        setLoadingCourses(false);
      }
    );

    return () => unsub();
  }, [selectedCrt, studentDocId]);

  async function refreshCrts() {
    if (!studentDocId) return;
    setLoading(true);
    try {
      const crtSnap = await getDocs(collection(db, "crt"));
      const allCrts = crtSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const assignedCrtIds = new Set();
      for (const crt of allCrts) {
        const studentsSnap = await getDocs(
          collection(db, "crt", crt.id, "students")
        );
        if (studentsSnap.docs.some((d) => d.data().studentId === studentDocId)) {
          assignedCrtIds.add(crt.id);
        }
      }
      setCrts(allCrts.filter((c) => assignedCrtIds.has(c.id)));

      const counts = {};
      for (const crt of allCrts.filter((c) => assignedCrtIds.has(c.id))) {
        const coursesSnap = await getDocs(
          collection(db, "crt", crt.id, "courses")
        );
        counts[crt.id] = coursesSnap.size;
      }
      setCrtCourseCounts(counts);
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-200" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-indigo-600" />
              CRT Programs
            </h1>
            <p className="text-slate-600 mt-1">
              Your assigned CRT programs and courses
            </p>
          </div>
          <button
            onClick={refreshCrts}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* CRT list or course grid */}
        {loading && crts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-200 animate-pulse mx-auto mb-4" />
            Loading your programs...
          </div>
        ) : crts.length === 0 ? (
          <div className="text-center py-16 bg-white/80 backdrop-blur rounded-2xl border border-slate-200/80 shadow-sm">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No CRT Programs Assigned
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You are not assigned to any CRT program yet. Please contact your
              admin if you believe this is an error.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-6 px-6 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : selectedCrt ? (
          <div>
            <button
              onClick={() => {
                setSelectedCrt(null);
                setCrtCourses([]);
              }}
              className="mb-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to CRT Programs
            </button>

            <div className="mb-6 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                {selectedCrt.name || selectedCrt.id}
              </h2>
              {selectedCrt.description && (
                <p className="text-slate-600 mt-1">{selectedCrt.description}</p>
              )}
            </div>

            {loadingCourses ? (
              <div className="text-center py-12 text-slate-500">
                Loading courses...
              </div>
            ) : crtCourses.length === 0 ? (
              <div className="text-center py-12 bg-white/80 rounded-2xl border border-slate-200/80">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No courses in this program yet.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {crtCourses.map((c) => {
                  const progress =
                    c._progress ||
                    { totalChapters: 0, openedChapters: 0, percentage: 0 };
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/crtProgram/${selectedCrt.id}/courses/${c.id}`
                        )
                      }
                      className="group text-left w-full bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md hover:border-indigo-200/80 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-indigo-700">
                            {c.title || "Untitled Course"}
                          </h3>
                          {c.courseCode && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {c.courseCode}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 flex-shrink-0" />
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-500">
                            Progress
                          </span>
                          <span className="text-xs font-semibold text-indigo-600">
                            {progress.openedChapters} / {progress.totalChapters}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-2 bg-indigo-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, progress.percentage)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-indigo-600 font-medium">
                        Open course →
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {crts.map((crt) => {
              const count =
                typeof crtCourseCounts[crt.id] === "number"
                  ? crtCourseCounts[crt.id]
                  : null;
              const created = crt.createdAt
                ? new Date(crt.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "";

              return (
                <button
                  key={crt.id}
                  type="button"
                  onClick={() => setSelectedCrt(crt)}
                  className="group text-left w-full bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200/80 transition-all"
                >
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold line-clamp-2">
                          {crt.name || crt.id}
                        </h3>
                        {created && (
                          <p className="text-xs text-indigo-200 mt-1">
                            {created}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-6 h-6 text-indigo-200 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      {count !== null
                        ? `${count} course${count !== 1 ? "s" : ""}`
                        : "Loading..."}
                    </span>
                    <span className="text-sm font-medium text-indigo-600">
                      View courses →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
