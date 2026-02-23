"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import CheckAuth from "../../../lib/CheckAuth";
import { getProgramBySlug, CRT_COMMON_200HR, CRT_TECHNICAL_200HR } from "../../../lib/crtProgramsData";
import { createSlug } from "../../../lib/urlUtils";
import { db, auth } from "../../../lib/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import {
  ArrowLeftIcon,
  AcademicCapIcon,
  ClockIcon,
  ChartBarIcon,
  CpuChipIcon,
  ChevronRightIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

function slugifyCourse(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function CRTProgramDetailPage() {
  const params = useParams();
  const slug = params?.slug;
  const program = slug ? getProgramBySlug(slug) : null;
  const [imageError, setImageError] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, percent: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!slug || !program || !user?.uid) {
      setAttendanceLoading(false);
      if (!user?.uid) setAttendanceStats({ total: 0, present: 0, percent: 0 });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setAttendanceLoading(true);
        const crtSnap = await getDocs(collection(db, "crt"));
        let resolvedCrtId = null;
        const coursesList = [];
        for (const crtDoc of crtSnap.docs) {
          const data = crtDoc.data();
          const matchesProgram =
            (data.programId && data.programId === slug) ||
            (data.name && createSlug(data.name) === slug) ||
            (data.name && data.name === program.title);
          if (!matchesProgram) continue;
          resolvedCrtId = crtDoc.id;
          const coursesRef = collection(db, "crt", crtDoc.id, "courses");
          const coursesSnap = await getDocs(coursesRef);
          coursesSnap.docs.forEach((c) => {
            coursesList.push({ id: c.id, ...c.data() });
          });
          break;
        }
        if (!resolvedCrtId || coursesList.length === 0 || cancelled) {
          if (!cancelled) setAttendanceStats({ total: 0, present: 0, percent: 0 });
          return;
        }
        const uid = user.uid;
        let studentDocId = uid;
        try {
          const directSnap = await getDoc(doc(db, "students", uid));
          if (!directSnap.exists()) {
            const sq = query(collection(db, "students"), where("uid", "==", uid));
            const sSnap = await getDocs(sq);
            if (!sSnap.empty) studentDocId = sSnap.docs[0].id;
          }
        } catch (_) {}
        const attCol = collection(db, "attendance");
        let totalSessions = 0;
        let presentSessions = 0;
        for (const course of coursesList) {
          const trainerSnap = await getDocs(
            query(attCol, where("type", "==", "trainer"), where("courseId", "==", course.id))
          );
          const selfSnap = await getDocs(
            query(attCol, where("type", "==", "self"), where("courseId", "==", course.id), where("userId", "==", uid))
          );
          const trainerChapters = new Set();
          const trainerPresentChapters = new Set();
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
          totalSessions += totalChapters.size;
          presentSessions += presentChapters.size;
        }
        const percent = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;
        if (!cancelled) setAttendanceStats({ total: totalSessions, present: presentSessions, percent });
      } catch (e) {
        if (!cancelled) setAttendanceStats({ total: 0, present: 0, percent: 0 });
      } finally {
        if (!cancelled) setAttendanceLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, program?.title, program, user?.uid]);


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

  const technicalCourses = CRT_TECHNICAL_200HR[program.id] || [];

  return (
    <CheckAuth>
      <div className="min-h-screen bg-slate-50 pt-16">
        {/* Hero – full bleed */}
        <header className="relative w-full mt-[-70px] min-h-[50vh] sm:min-h-[55vh] flex flex-col justify-end overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src={imageError ? "/LmsImg.jpg" : program.image}
              alt={program.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
          </div>
          <div className="relative max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12 sm:pb-16 pt-24">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
              <Link
                href="/crt"
                className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium text-sm transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                All CRT Programmes
              </Link>
              <Link
                href="/crtProgram"
                className="inline-flex items-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-2 text-white font-medium text-sm border border-white/30 transition-colors"
              >
                <ChartBarIcon className="w-4 h-4" />
                Go to Dashboard
              </Link>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-white mb-4 border border-white/20">
              <AcademicCapIcon className="w-3.5 h-3.5" />
              400 hr programme
            </span>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-2"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {program.title}
            </h1>
            <p className="flex items-center gap-2 text-white/90 text-sm sm:text-base font-medium">
              <ClockIcon className="w-4 h-4" />
              {program.duration}
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 pb-20">
          {/* Intro card */}
          <section className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-6 sm:p-8 mb-6">
            <p className="text-slate-600 leading-relaxed text-lg sm:text-xl">
              {program.description}
            </p>
          </section>

          {/* Attendance summary for this programme */}
          <section className="mb-8 rounded-2xl border border-slate-200/60 bg-white shadow-lg p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <UserGroupIcon className="w-6 h-6 text-blue-700" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-800 mb-0.5">Your attendance</h3>
              {attendanceLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : attendanceStats.total > 0 ? (
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-blue-700">{attendanceStats.present}</span>
                  <span className="text-slate-500"> / {attendanceStats.total} sessions</span>
                  <span className="ml-1.5 text-sm font-medium text-slate-600">
                    ({attendanceStats.percent}%)
                  </span>
                </p>
              ) : (
                <p className="text-sm text-slate-600">No attendance recorded yet for this programme</p>
              )}
            </div>
          </section>

          {/* 400 hr breakdown – two columns on desktop */}
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {/* 200 hr – Aptitude, Reasoning, Soft Skills */}
            <section className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-700 to-slate-600 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">200 hours</p>
                  <h2 className="font-bold text-white text-lg">Aptitude, Reasoning & Soft Skills</h2>
                </div>
              </div>
              <div className="p-4 sm:p-5 grid gap-3">
                {CRT_COMMON_200HR.map((name) => {
                  const courseSlug = slugifyCourse(name);
                  return (
                    <Link
                      key={name}
                      href={`/crt/${slug}/courses/${courseSlug}`}
                      className="group flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200"
                    >
                      <span className="font-medium text-slate-800">{name}</span>
                      <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-[#00448a] group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* 200 hr – Technical */}
            <section className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-[#1a5796] to-[#0d3a6e] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <CpuChipIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">200 hours</p>
                  <h2 className="font-bold text-white text-lg">Technical</h2>
                </div>
              </div>
              <div className="p-4 sm:p-5 grid gap-3">
                {technicalCourses.map((name) => {
                  const courseSlug = slugifyCourse(name);
                  return (
                    <Link
                      key={name}
                      href={`/crt/${slug}/courses/${courseSlug}`}
                      className={`group flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 transition-all duration-200 ${program.bg} hover:shadow-md hover:border-slate-300`}
                    >
                      <span className={`font-medium ${program.iconColor}`}>{name}</span>
                      <ChevronRightIcon className={`w-5 h-5 group-hover:translate-x-0.5 transition-all ${program.iconColor}`} />
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        </main>
      </div>
    </CheckAuth>
  );
}
