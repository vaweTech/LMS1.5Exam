"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CheckAuth from "../../lib/CheckAuth";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ChartBarIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockOpenIcon,
  LockClosedIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";

// Dummy assigned classes for CRT Trainer
const ASSIGNED_CLASSES = [
  {
    id: "batch-crt-1",
    programName: "Campus Recruitment Training",
    programSlug: "campus-recruitment-training",
    batchName: "CRT Batch A - 2025",
    courseName: "Aptitude & Reasoning",
    courseId: "aptitude-reasoning",
    schedule: "Mon, Wed, Fri",
    time: "10:00 AM - 12:00 PM",
    startDate: "2025-01-06",
    endDate: "2025-04-30",
    studentsCount: 28,
    totalSessions: 48,
    completedSessions: 12,
    status: "active",
    color: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    id: "batch-crt-2",
    programName: "Campus Recruitment Training",
    programSlug: "campus-recruitment-training",
    batchName: "CRT Batch B - 2025",
    courseName: "Technical (DSA & Coding)",
    courseId: "technical-dsa",
    schedule: "Tue, Thu, Sat",
    time: "2:00 PM - 4:00 PM",
    startDate: "2025-01-07",
    endDate: "2025-05-15",
    studentsCount: 32,
    totalSessions: 52,
    completedSessions: 8,
    status: "active",
    color: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    id: "batch-crt-3",
    programName: "Campus Recruitment Training",
    programSlug: "campus-recruitment-training",
    batchName: "CRT Batch A - 2025",
    courseName: "Communication Skills",
    courseId: "communication-skills",
    schedule: "Mon, Thu",
    time: "4:00 PM - 5:30 PM",
    startDate: "2025-01-06",
    endDate: "2025-03-28",
    studentsCount: 28,
    totalSessions: 24,
    completedSessions: 18,
    status: "active",
    color: "from-amber-500 to-orange-600",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "batch-crt-4",
    programName: "Campus Recruitment Training",
    programSlug: "campus-recruitment-training",
    batchName: "CRT Batch C - 2024",
    courseName: "Aptitude & Reasoning",
    courseId: "aptitude-reasoning",
    schedule: "Wed, Fri",
    time: "11:00 AM - 1:00 PM",
    startDate: "2024-09-01",
    endDate: "2024-12-20",
    studentsCount: 24,
    totalSessions: 32,
    completedSessions: 32,
    status: "completed",
    color: "from-slate-500 to-slate-600",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
  },
];

// Dummy students per class (classId -> students)
const DUMMY_STUDENTS_BY_CLASS = {
  "batch-crt-1": [
    { id: "s1", name: "Rahul Kumar", rollNo: "CRT-A-001", email: "rahul@example.com" },
    { id: "s2", name: "Priya Sharma", rollNo: "CRT-A-002", email: "priya@example.com" },
    { id: "s3", name: "Amit Singh", rollNo: "CRT-A-003", email: "amit@example.com" },
    { id: "s4", name: "Sneha Reddy", rollNo: "CRT-A-004", email: "sneha@example.com" },
    { id: "s5", name: "Vikram Patel", rollNo: "CRT-A-005", email: "vikram@example.com" },
    { id: "s6", name: "Kavya Nair", rollNo: "CRT-A-006", email: "kavya@example.com" },
    { id: "s7", name: "Arjun Mehta", rollNo: "CRT-A-007", email: "arjun@example.com" },
    { id: "s8", name: "Ananya Iyer", rollNo: "CRT-A-008", email: "ananya@example.com" },
  ],
  "batch-crt-2": [
    { id: "s9", name: "Rohan Verma", rollNo: "CRT-B-001", email: "rohan@example.com" },
    { id: "s10", name: "Ishita Gupta", rollNo: "CRT-B-002", email: "ishita@example.com" },
    { id: "s11", name: "Karan Joshi", rollNo: "CRT-B-003", email: "karan@example.com" },
    { id: "s12", name: "Divya Krishnan", rollNo: "CRT-B-004", email: "divya@example.com" },
  ],
  "batch-crt-3": [
    { id: "s1", name: "Rahul Kumar", rollNo: "CRT-A-001", email: "rahul@example.com" },
    { id: "s2", name: "Priya Sharma", rollNo: "CRT-A-002", email: "priya@example.com" },
    { id: "s3", name: "Amit Singh", rollNo: "CRT-A-003", email: "amit@example.com" },
    { id: "s4", name: "Sneha Reddy", rollNo: "CRT-A-004", email: "sneha@example.com" },
  ],
  "batch-crt-4": [
    { id: "s13", name: "Neha Agarwal", rollNo: "CRT-C-001", email: "neha@example.com" },
    { id: "s14", name: "Suresh Rao", rollNo: "CRT-C-002", email: "suresh@example.com" },
  ],
};

// Dummy chapters/topics per course (courseId -> chapters)
const DUMMY_CHAPTERS_BY_COURSE = {
  "aptitude-reasoning": [
    { id: "ch1", title: "Number System & HCF/LCM", order: 1 },
    { id: "ch2", title: "Percentages & Profit Loss", order: 2 },
    { id: "ch3", title: "Time & Work, Pipes & Cisterns", order: 3 },
    { id: "ch4", title: "Time, Speed & Distance", order: 4 },
    { id: "ch5", title: "Ratio & Proportion", order: 5 },
    { id: "ch6", title: "Logical Reasoning - Syllogisms", order: 6 },
    { id: "ch7", title: "Blood Relations & Direction Sense", order: 7 },
    { id: "ch8", title: "Coding-Decoding & Series", order: 8 },
  ],
  "technical-dsa": [
    { id: "tc1", title: "Arrays & Two Pointers", order: 1 },
    { id: "tc2", title: "Strings & Pattern Matching", order: 2 },
    { id: "tc3", title: "Stacks & Queues", order: 3 },
    { id: "tc4", title: "Linked List", order: 4 },
    { id: "tc5", title: "Trees & BST", order: 5 },
    { id: "tc6", title: "Graphs - BFS/DFS", order: 6 },
  ],
  "communication-skills": [
    { id: "cs1", title: "Introduction to Communication", order: 1 },
    { id: "cs2", title: "Body Language & Etiquette", order: 2 },
    { id: "cs3", title: "Group Discussion Basics", order: 3 },
    { id: "cs4", title: "Interview Preparation", order: 4 },
  ],
};

// Dummy reference notes per course (courseId -> notes)
const DUMMY_REFERENCE_NOTES_BY_COURSE = {
  "aptitude-reasoning": [
    { id: "n1", title: "Number System Formulas", type: "PDF", shared: true, sharedAt: "2025-01-10" },
    { id: "n2", title: "Reasoning Shortcuts", type: "PDF", shared: false },
    { id: "n3", title: "Practice Problems - Percentages", type: "PDF", shared: true, sharedAt: "2025-01-15" },
    { id: "n4", title: "Time & Work Cheat Sheet", type: "PDF", shared: false },
  ],
  "technical-dsa": [
    { id: "n5", title: "Array Patterns Summary", type: "PDF", shared: true, sharedAt: "2025-01-08" },
    { id: "n6", title: "Tree Traversals Reference", type: "PDF", shared: false },
    { id: "n7", title: "Graph Algorithms Notes", type: "PDF", shared: false },
  ],
  "communication-skills": [
    { id: "n8", title: "GD Topics List", type: "PDF", shared: true, sharedAt: "2025-01-12" },
    { id: "n9", title: "Common HR Questions", type: "PDF", shared: false },
  ],
};

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function progressPercent(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function CRTTrainerPage() {
  const [filter, setFilter] = useState("all");
  const [activeModal, setActiveModal] = useState(null); // 'attendance' | 'unlock' | 'notes'
  const [selectedClass, setSelectedClass] = useState(null);
  // Dummy state: attendance for "today" per class -> studentId -> present (true/false)
  const [attendance, setAttendance] = useState({});
  // Dummy state: unlocked chapters per class key (classId-courseId) -> Set of chapterIds
  const [unlockedChapters, setUnlockedChapters] = useState({});
  // Dummy state: shared note ids per class key -> Set of noteIds
  const [sharedNotes, setSharedNotes] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [unlockSaving, setUnlockSaving] = useState(false);
  const [notesSharing, setNotesSharing] = useState(false);
  // Share reference notes: link input and shared links per class
  const [referenceLinkUrl, setReferenceLinkUrl] = useState("");
  const [referenceLinkTitle, setReferenceLinkTitle] = useState("");
  const [sharedLinksByClass, setSharedLinksByClass] = useState({}); // classKey -> [{ id, url, title, sharedAt }]
  const [linkShareSuccess, setLinkShareSuccess] = useState(false);
  // When user clicks Share on a reference material, show text field + upload
  const [expandedShareNoteId, setExpandedShareNoteId] = useState(null);
  const [shareLinkInput, setShareLinkInput] = useState("");

  const openModal = (modal, cls) => {
    setSelectedClass(cls);
    setActiveModal(modal);
    setAttendanceSaved(false);
    if (modal === "notes") {
      setReferenceLinkUrl("");
      setReferenceLinkTitle("");
      setLinkShareSuccess(false);
      setExpandedShareNoteId(null);
      setShareLinkInput("");
    }
  };
  const closeModal = () => {
    setActiveModal(null);
    setSelectedClass(null);
  };

  const classKey = (cls) => (cls ? `${cls.id}-${cls.courseId}` : "");
  const studentsForClass = (cls) =>
    DUMMY_STUDENTS_BY_CLASS[cls?.id] || [];
  const chaptersForClass = (cls) =>
    DUMMY_CHAPTERS_BY_COURSE[cls?.courseId] || [];
  const notesForClass = (cls) =>
    DUMMY_REFERENCE_NOTES_BY_COURSE[cls?.courseId] || [];

  const getAttendanceForClass = (cls) => {
    const key = cls?.id;
    if (!key) return {};
    return attendance[key] ?? {};
  };
  const setAttendanceForClass = (cls, studentId, present) => {
    const key = cls?.id;
    if (!key) return;
    setAttendance((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [studentId]: present },
    }));
  };
  const isChapterUnlocked = (cls, chapterId) => {
    const key = classKey(cls);
    const set = unlockedChapters[key];
    return set ? set.has(chapterId) : false;
  };
  const toggleChapterUnlock = (cls, chapterId) => {
    const key = classKey(cls);
    setUnlockedChapters((prev) => {
      const next = new Set(prev[key] || []);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return { ...prev, [key]: next };
    });
  };
  const isNoteShared = (cls, noteId) => {
    const key = classKey(cls);
    const set = sharedNotes[key];
    return set ? set.has(noteId) : false;
  };
  const getNoteSharedFromDummy = (cls, note) => {
    return note.shared || isNoteShared(cls, note.id);
  };
  const shareNote = (cls, noteId) => {
    const key = classKey(cls);
    setSharedNotes((prev) => {
      const next = new Set(prev[key] || []);
      next.add(noteId);
      return { ...prev, [key]: next };
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass) return;
    setAttendanceSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setAttendanceSaving(false);
    setAttendanceSaved(true);
  };
  const handleSaveUnlock = async () => {
    if (!selectedClass) return;
    setUnlockSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setUnlockSaving(false);
    closeModal();
  };
  const handleShareNote = async (cls, noteId) => {
    setNotesSharing(true);
    await new Promise((r) => setTimeout(r, 500));
    shareNote(cls, noteId);
    setNotesSharing(false);
  };

  const openShareForNote = (noteId) => {
    setExpandedShareNoteId((prev) => (prev === noteId ? null : noteId));
    if (expandedShareNoteId !== noteId) setShareLinkInput("");
  };

  const handleUploadShareNote = async (cls, note) => {
    const url = shareLinkInput?.trim();
    if (url) {
      const key = classKey(cls);
      const newEntry = {
        id: `link-${note.id}-${Date.now()}`,
        url: url.startsWith("http") ? url : `https://${url}`,
        title: note.title,
        sharedAt: getTodayStr(),
      };
      setSharedLinksByClass((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), newEntry],
      }));
    }
    setNotesSharing(true);
    await new Promise((r) => setTimeout(r, 400));
    shareNote(cls, note.id);
    setNotesSharing(false);
    setExpandedShareNoteId(null);
    setShareLinkInput("");
  };

  const sharedLinksForClass = (cls) => {
    const key = classKey(cls);
    return sharedLinksByClass[key] || [];
  };

  const handleShareReferenceLink = async (e) => {
    e?.preventDefault();
    if (!selectedClass) return;
    const url = referenceLinkUrl?.trim();
    if (!url) return;
    setNotesSharing(true);
    setLinkShareSuccess(false);
    await new Promise((r) => setTimeout(r, 400));
    const key = classKey(selectedClass);
    const newEntry = {
      id: `link-${Date.now()}`,
      url: url.startsWith("http") ? url : `https://${url}`,
      title: referenceLinkTitle?.trim() || "Reference link",
      sharedAt: getTodayStr(),
    };
    setSharedLinksByClass((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newEntry],
    }));
    setReferenceLinkUrl("");
    setReferenceLinkTitle("");
    setNotesSharing(false);
    setLinkShareSuccess(true);
  };

  const filteredClasses =
    filter === "all"
      ? ASSIGNED_CLASSES
      : ASSIGNED_CLASSES.filter((c) => c.status === filter);

  const stats = {
    total: ASSIGNED_CLASSES.length,
    active: ASSIGNED_CLASSES.filter((c) => c.status === "active").length,
    completed: ASSIGNED_CLASSES.filter((c) => c.status === "completed").length,
    totalStudents: ASSIGNED_CLASSES.reduce((s, c) => s + c.studentsCount, 0),
  };

  return (
    <CheckAuth>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/crt"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-[#00448a] font-medium text-sm transition-colors p-1.5 rounded-lg hover:bg-white/80"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to CRT
              </Link>
              <div className="hidden sm:block w-px h-6 bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00448a] to-cyan-600 flex items-center justify-center shadow-lg shadow-[#00448a]/20">
                  <AcademicCapIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    CRT Trainer
                  </h1>
                  <p className="text-slate-600 text-sm mt-0.5">
                    Your assigned classes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <BookOpenIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Assigned Classes
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.active}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.completed}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00448a]/10 flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-[#00448a]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalStudents}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-medium text-slate-600 mr-2">
              Filter:
            </span>
            {["all", "active", "completed"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  filter === key
                    ? "bg-[#00448a] text-white shadow-md shadow-[#00448a]/25"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Class cards */}
          <div className="space-y-6">
            {filteredClasses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <BookOpenIcon className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">
                  No assigned classes for this filter.
                </p>
              </motion.div>
            ) : (
              filteredClasses.map((cls, i) => {
                const progress = progressPercent(
                  cls.completedSessions,
                  cls.totalSessions
                );
                const href = `/crt/${cls.programSlug}/courses/${cls.courseId}`;
                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-lg hover:border-slate-300/80 transition-all duration-200">
                      <div className="flex flex-col lg:flex-row">
                        <div className="flex-1 p-6 sm:p-8">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-14 h-14 rounded-xl ${cls.iconBg} ${cls.iconColor} flex items-center justify-center shrink-0 shadow-sm`}
                              >
                                <BookOpenIcon className="w-7 h-7" />
                              </div>
                              <div>
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                                  {cls.courseName}
                                </h2>
                                <p className="text-slate-600 text-sm mt-0.5">
                                  {cls.batchName}
                                </p>
                                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDaysIcon className="w-4 h-4" />
                                    {cls.schedule}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    {cls.time}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  cls.status === "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {cls.status === "active"
                                  ? "Active"
                                  : "Completed"}
                              </span>
                              <Link
                                href={href}
                                className="inline-flex items-center gap-1 text-sm font-medium text-[#00448a] hover:underline"
                              >
                                View course
                                <ChevronRightIcon className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-5">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <span className="text-slate-500 font-medium">
                                Sessions progress
                              </span>
                              <span className="text-slate-700 font-semibold">
                                {cls.completedSessions} / {cls.totalSessions} (
                                {progress}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${cls.color} transition-all duration-500`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-slate-100">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                              <UserGroupIcon className="w-4 h-4 text-slate-400" />
                              <strong className="text-slate-800">
                                {cls.studentsCount}
                              </strong>{" "}
                              students
                            </span>
                            <span className="text-sm text-slate-500">
                              {formatDate(cls.startDate)} –{" "}
                              {formatDate(cls.endDate)}
                            </span>
                          </div>

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openModal("attendance", cls)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-sm transition-colors border border-emerald-200/80"
                            >
                              <ClipboardDocumentCheckIcon className="w-4 h-4" />
                              Mark Attendance
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal("unlock", cls)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 font-semibold text-sm transition-colors border border-violet-200/80"
                            >
                              <LockOpenIcon className="w-4 h-4" />
                              Unlock Class
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal("notes", cls)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-sm transition-colors border border-amber-200/80"
                            >
                              <DocumentArrowUpIcon className="w-4 h-4" />
                              Share Reference Notes
                            </button>
                          </div>
                        </div>
                        <div
                          className={`hidden lg:block w-1.5 min-h-[120px] bg-gradient-to-b ${cls.color} opacity-90`}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Modals */}
          <AnimatePresence>
            {activeModal && selectedClass && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                  onClick={closeModal}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "tween", duration: 0.2 }}
                  className="fixed inset-4 sm:inset-8 md:inset-12 lg:max-w-3xl lg:mx-auto z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {activeModal === "attendance" && "Mark Attendance"}
                        {activeModal === "unlock" && "Unlock Class"}
                        {activeModal === "notes" && "Share Reference Notes"}
                      </h3>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {selectedClass.courseName} · {selectedClass.batchName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      aria-label="Close"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Attendance modal */}
                    {activeModal === "attendance" && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                          Date: <strong>{getTodayStr()}</strong>. Mark students present or absent.
                        </p>
                        {attendanceSaved && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
                            <CheckCircleIcon className="w-5 h-5 shrink-0" />
                            Attendance saved successfully.
                          </div>
                        )}
                        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                          {studentsForClass(selectedClass).map((student) => {
                            const present = getAttendanceForClass(selectedClass)[student.id];
                            return (
                              <li
                                key={student.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors"
                              >
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {student.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {student.rollNo} · {student.email}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttendanceForClass(
                                        selectedClass,
                                        student.id,
                                        true
                                      )
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                      present === true
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                                    }`}
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttendanceForClass(
                                        selectedClass,
                                        student.id,
                                        false
                                      )
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                      present === false
                                        ? "bg-red-100 text-red-800 border border-red-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                                    }`}
                                  >
                                    <XCircleIcon className="w-4 h-4" />
                                    Absent
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleSaveAttendance}
                            disabled={attendanceSaving}
                            className="px-5 py-2.5 rounded-xl bg-[#00448a] text-white font-semibold text-sm hover:bg-[#003a76] disabled:opacity-60 transition-colors"
                          >
                            {attendanceSaving ? "Saving…" : "Save Attendance"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Unlock class modal */}
                    {activeModal === "unlock" && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                          Unlock chapters for today so students can access the content.
                        </p>
                        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                          {chaptersForClass(selectedClass).map((ch) => {
                            const unlocked = isChapterUnlocked(selectedClass, ch.id);
                            return (
                              <li
                                key={ch.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors"
                              >
                                <span className="font-medium text-slate-900">
                                  {ch.title}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleChapterUnlock(selectedClass, ch.id)
                                  }
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                    unlocked
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700 border border-transparent"
                                  }`}
                                >
                                  {unlocked ? (
                                    <>
                                      <LockOpenIcon className="w-4 h-4" />
                                      Unlocked
                                    </>
                                  ) : (
                                    <>
                                      <LockClosedIcon className="w-4 h-4" />
                                      Locked
                                    </>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleSaveUnlock}
                            disabled={unlockSaving}
                            className="px-5 py-2.5 rounded-xl bg-[#00448a] text-white font-semibold text-sm hover:bg-[#003a76] disabled:opacity-60 transition-colors"
                          >
                            {unlockSaving ? "Saving…" : "Save & Close"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Share reference notes modal */}
                    {activeModal === "notes" && (
                      <div className="space-y-6">
                        <p className="text-sm text-slate-600">
                          Share reference notes with this class. Paste a link below or share from the list. Students will see them in their course view.
                        </p>
                        {/* Shared links list */}
                        {sharedLinksForClass(selectedClass).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 mb-2">Shared links</h4>
                            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                              {sharedLinksForClass(selectedClass).map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-slate-50/50"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                      <LinkIcon className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-slate-900 truncate">{item.title}</p>
                                      <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#00448a] hover:underline truncate block"
                                      >
                                        {item.url}
                                      </a>
                                    </div>
                                  </div>
                                  <span className="text-xs text-slate-500 shrink-0">
                                    Shared {formatDate(item.sharedAt)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Existing reference materials (dummy) */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 mb-2">Reference materials</h4>
                          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                            {notesForClass(selectedClass).map((note) => {
                              const shared =
                                getNoteSharedFromDummy(selectedClass, note);
                              const isExpanded = expandedShareNoteId === note.id;
                              return (
                                <li
                                  key={note.id}
                                  className="bg-white hover:bg-slate-50/50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                        <DocumentArrowUpIcon className="w-5 h-5 text-amber-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-900">
                                          {note.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {note.type}
                                          {shared && (
                                            <> · Shared{note.sharedAt ? ` ${formatDate(note.sharedAt)}` : ""}</>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    {shared ? (
                                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        Shared
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openShareForNote(note.id)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                          isExpanded
                                            ? "bg-[#00448a] text-white ring-2 ring-[#00448a] ring-offset-2"
                                            : "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
                                        }`}
                                      >
                                        <DocumentArrowUpIcon className="w-4 h-4" />
                                        Share
                                      </button>
                                    )}
                                  </div>
                                  {/* Expanded: text field + upload button */}
                                  {isExpanded && !shared && (
                                    <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-amber-50/30">
                                      <div className="flex flex-col sm:flex-row gap-3 mt-3">
                                        <input
                                          type="url"
                                          inputMode="url"
                                          placeholder="Paste link (e.g. https://drive.google.com/... or notes URL)"
                                          value={shareLinkInput}
                                          onChange={(e) => setShareLinkInput(e.target.value)}
                                          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleUploadShareNote(selectedClass, note)}
                                            disabled={notesSharing}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-60 transition-colors"
                                          >
                                            <DocumentArrowUpIcon className="w-4 h-4" />
                                            {notesSharing ? "Uploading…" : "Upload"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { setExpandedShareNoteId(null); setShareLinkInput(""); }}
                                            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </CheckAuth>
  );
}
