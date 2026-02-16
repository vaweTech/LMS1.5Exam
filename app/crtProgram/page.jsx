"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  GraduationCap,
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Video,
  FileText,
  Presentation,
  ClipboardList,
  MessageSquare,
  Radio,
  BookOpen,
  X,
} from "lucide-react";

// Dummy CRT programs (not from database)
const DUMMY_CRT_PROGRAMS = [
  { id: "java", name: "JAVA CRT", color: "from-amber-500 to-orange-600" },
  { id: "python", name: "Python CRT", color: "from-emerald-500 to-teal-600" },
  { id: "aiml", name: "AIML CRT", color: "from-violet-500 to-purple-600" },
];

// Course cards shown in popup when clicking Record class, Class PDF, PPT, Assignment, Feedback, or Trainer reference PDF
const RECENT_CLASS_CARDS = [
  { id: "java", name: "JAVA", gradient: "from-[#00448a] to-[#26ebe5]" },
  { id: "soft-skills", name: "Soft Skills", gradient: "from-[#26ebe5] to-[#0ea5e9]" },
  { id: "aptitude", name: "Aptitude", gradient: "from-[#f56c53] to-[#fdc377]" },
  { id: "html", name: "HTML", gradient: "from-[#00448a] to-[#f56c53]" },
];

// Dummy courses under each CRT with progress
const DUMMY_CRT_COURSES = {
  java: [
    { id: "java-core", title: "Java Core", openedChapters: 3, totalChapters: 10 },
    { id: "html", title: "HTML", openedChapters: 5, totalChapters: 10 },
    { id: "css", title: "CSS", openedChapters: 2, totalChapters: 8 },
    { id: "soft-skills", title: "Soft Skills", openedChapters: 1, totalChapters: 5 },
    {
      id: "aptitude-reasoning",
      title: "Aptitude & Reasoning",
      openedChapters: 4,
      totalChapters: 12,
    },
  ],
  python: [
    { id: "python-basics", title: "Python Basics", openedChapters: 4, totalChapters: 10 },
    { id: "django", title: "Django Web", openedChapters: 1, totalChapters: 6 },
  ],
  aiml: [
    { id: "ai-fundamentals", title: "AI Fundamentals", openedChapters: 0, totalChapters: 8 },
    { id: "ml-basics", title: "Machine Learning", openedChapters: 0, totalChapters: 10 },
  ],
};

export default function CRTProgramPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCrtId, setSelectedCrtId] = useState(null);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    resume: "",
    education10: "",
    education12: "",
    educationDegree: "",
    educationPg: "",
    experience: "",
    educationEntries: [],
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfile, setEditProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    resume: "",
    education10: "",
    education12: "",
    educationDegree: "",
    educationPg: "",
    experience: "",
    education10College: "",
    education10Course: "",
    education10Marks: "",
    education12College: "",
    education12Course: "",
    education12Marks: "",
    educationDegreeCollege: "",
    educationDegreeCourse: "",
    educationDegreeMarks: "",
    educationPgCollege: "",
    educationPgCourse: "",
    educationPgMarks: "",
    educationEntries: [],
    educationType: "",
    educationCollege: "",
    educationCourse: "",
    educationMarks: "",
  });
  const [profileError, setProfileError] = useState("");
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [activeEducationLevel, setActiveEducationLevel] = useState("10"); // legacy, no longer used
  const [recentClassModal, setRecentClassModal] = useState(null); // 'record' | 'pdf' | 'ppt' | 'assignment' | 'feedback' | 'trainer-pdf'
  const [upcomingClassModal, setUpcomingClassModal] = useState(null); // 'live' | 'pdf' | 'ppt'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setProfile((prev) => ({
          ...prev,
          name:
            prev.name ||
            u.displayName ||
            u.email?.split("@")[0] ||
            "Student",
          email: prev.email || u.email || "",
        }));
      }
    });
    return () => unsub();
  }, []);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const trimmedName = editProfile.name.trim();
    const trimmedEmail = editProfile.email.trim();

    if (!trimmedName || !trimmedEmail) {
      setProfileError("Name and email are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setProfileError("Please enter a valid email address.");
      return;
    }

    const buildEducationString = (college, course, marks) => {
      const parts = [
        college?.trim() || "",
        course?.trim() || "",
        marks?.trim() || "",
      ].filter(Boolean);
      return parts.join(" | ");
    };

    const educationEntries = editProfile.educationEntries || [];

    const findFirstByType = (type) =>
      educationEntries.find((e) => e.type === type) || null;

    const mapEducationToString = (type) => {
      const entry = findFirstByType(type);
      if (!entry) return "";
      return buildEducationString(entry.college, entry.course, entry.marks);
    };

    setProfile({
      name: trimmedName,
      email: trimmedEmail,
      phone: editProfile.phone.trim(),
      address: editProfile.address.trim(),
      resume: editProfile.resume.trim(),
      education10: mapEducationToString("10th"),
      education12: mapEducationToString("Inter / 12th"),
      educationDegree: mapEducationToString("B.Tech"),
      educationPg: mapEducationToString("PG (MBA / MCA / M.Tech)"),
      experience: editProfile.experience.trim(),
      educationEntries,
    });
    setProfileError("");
    setShowEditProfile(false);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fdc377]/30 via-[#26ebe5]/20 to-[#00448a]/10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#00448a]/20" />
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const displayName =
    profile.name ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Student";
  const email = profile.email || user.email || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdc377]/30 via-[#26ebe5]/20 to-[#00448a]/10 p-4 sm:p-6 lg:p-8 2xl:p-10">
      <div className="w-full max-w-6xl xl:max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 space-y-4 sm:space-y-0">
          <h1 className="text-2xl sm:text-3xl font-bold">CRT Dashboard</h1>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm bg-white/90 border border-gray-200 px-3 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.6fr)] items-start">
          {/* Left column: profile + classes */}
          <div className="space-y-6">
            {/* Profile (dashboard theme + edit) */}
            <div className="border border-black bg-white/95 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full border-4 border-black shadow-lg bg-white/20">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-black truncate">
                      {displayName}
                    </h3>
                    {email && (
                      <p className="text-xs sm:text-sm opacity-80 text-black truncate">
                        {email}
                      </p>
                    )}
                    {profile.phone && (
                      <p className="text-xs sm:text-sm text-gray-700 mt-0.5 truncate">
                        {profile.phone}
                      </p>
                    )}
                    {profile.address && (
                      <p className="text-xs sm:text-sm text-gray-700 mt-0.5 truncate">
                        {profile.address}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
                      CRT Student
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 hover:border-[#00448a] text-gray-700 whitespace-nowrap"
                  onClick={() => {
                    setEditProfile({
                      name: displayName,
                      email,
                      phone: profile.phone || "",
                      address: profile.address || "",
                      resume: profile.resume || "",
                      education10: profile.education10 || "",
                      education12: profile.education12 || "",
                      educationDegree: profile.educationDegree || "",
                      educationPg: profile.educationPg || "",
                      experience: profile.experience || "",
                      education10College: "",
                      education10Course: "",
                      education10Marks: "",
                      education12College: "",
                      education12Course: "",
                      education12Marks: "",
                      educationDegreeCollege: "",
                      educationDegreeCourse: "",
                      educationDegreeMarks: "",
                      educationPgCollege: "",
                      educationPgCourse: "",
                      educationPgMarks: "",
                      educationEntries: profile.educationEntries || [],
                      educationType: "",
                      educationCollege: "",
                      educationCourse: "",
                      educationMarks: "",
                    });
                    setProfileError("");
                    setShowEditProfile(true);
                  }}
                >
                  Edit profile
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-[11px] px-2 py-1 rounded-full bg-[#26ebe5]/15 text-[#00448a] border border-[#26ebe5]/40">
                  CRT Program Access
                </span>
                <span className="text-[11px] px-2 py-1 rounded-full bg-[#fdc377]/20 text-[#6b4a13] border border-[#fdc377]/50">
                  Student Dashboard
                </span>
              </div>
            </div>

            {/* Recent class */}
            <div className="bg-white/90 border border-gray-200 rounded-2xl shadow-md p-4 sm:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-[#00448a]" />
                Recent class
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setRecentClassModal("record")}
                  className="inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl w-full sm:w-auto bg-[#00448a] text-white hover:bg-[#003a76] transition-colors"
                >
                  <Video className="w-4 h-4" />
                  Record class
                </button>
                <button
                  type="button"
                  onClick={() => setRecentClassModal("pdf")}
                  className="inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl w-full sm:w-auto bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#26ebe5] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#00448a]" />
                  Class PDF
                </button>
                <button
                  type="button"
                  onClick={() => setRecentClassModal("ppt")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#26ebe5] transition-colors"
                >
                  <Presentation className="w-4 h-4 text-[#00448a]" />
                  PPT
                </button>
                <button
                  type="button"
                  onClick={() => setRecentClassModal("assignment")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#26ebe5] transition-colors"
                >
                  <ClipboardList className="w-4 h-4 text-[#00448a]" />
                  Assignment
                </button>
                <button
                  type="button"
                  onClick={() => setRecentClassModal("feedback")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#26ebe5] transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#00448a]" />
                  Feedback
                </button>
                <button
                  type="button"
                  onClick={() => setRecentClassModal("trainer-pdf")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#26ebe5] transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-[#00448a]" />
                  Trainer reference PDF
                </button>
              </div>
            </div>

            {/* Upcoming / Current class */}
            <div className="bg-white/90 border border-gray-200 rounded-2xl shadow-md p-4 sm:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#00448a]" />
                Upcoming / Current class
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setUpcomingClassModal("live")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00448a] text-white hover:bg-[#003a76] transition-colors"
                >
                  <Radio className="w-4 h-4" />
                  Live class
                </button>
                <button
                  type="button"
                  onClick={() => setUpcomingClassModal("pdf")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#26ebe5] transition-colors"
                >
                  <FileText className="w-4 h-4 text-[#00448a]" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setUpcomingClassModal("ppt")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-[#26ebe5] transition-colors"
                >
                  <Presentation className="w-4 h-4 text-[#00448a]" />
                  PPT
                </button>
              </div>
            </div>
          </div>

          {/* Right column: CRT programs + courses */}
          <div className="space-y-6">
            {/* CRT Programs heading */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                <GraduationCap className="w-6 h-6 text-[#00448a]" />
                CRT Programs
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                Select a CRT program to view its courses and your progress.
              </p>

              {/* CRT cards - dummy, styled like dashboard programs */}
              <div className="grid gap-3 sm:grid-cols-3">
                {DUMMY_CRT_PROGRAMS.map((crt) => (
                  <button
                    key={crt.id}
                    type="button"
                    onClick={() =>
                      setSelectedCrtId((prev) => (prev === crt.id ? null : crt.id))
                    }
                    className={`group text-left bg-white border rounded-xl shadow-sm hover:shadow-md transition-all p-0 w-full overflow-hidden ${
                      selectedCrtId === crt.id
                        ? "border-[#00448a] ring-1 ring-[#00448a]/40"
                        : "border-gray-100 hover:border-indigo-100"
                    }`}
                  >
                    <div className="bg-gradient-to-r from-[#00448a] to-[#f56c53] p-4 text-white">
                      <h3 className="text-base font-semibold line-clamp-1">
                        {crt.name}
                      </h3>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-xs text-gray-600">Program</span>
                      <span className="text-sm font-semibold text-[#00448a]">
                        {selectedCrtId === crt.id ? "Hide courses ↑" : "View courses ↓"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected CRT courses with progress (dummy) */}
            {selectedCrtId && (DUMMY_CRT_COURSES[selectedCrtId] || []).length > 0 && (
              <div className="bg-white/95 border border-gray-200 rounded-2xl shadow-md p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  {DUMMY_CRT_PROGRAMS.find((c) => c.id === selectedCrtId)?.name} Courses
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {DUMMY_CRT_COURSES[selectedCrtId].map((course) => {
                    const { openedChapters, totalChapters } = course;
                    const percentage =
                      totalChapters > 0
                        ? Math.round((openedChapters / totalChapters) * 100)
                        : 0;
                    return (
                      <div
                        key={course.id}
                        className="bg-white border border-gray-100 rounded-xl shadow-sm p-4"
                      >
                        <h4 className="text-base font-semibold text-gray-900 line-clamp-2">
                          {course.title}
                        </h4>
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-gray-600">
                              Progress
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600">
                              {openedChapters} / {totalChapters}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                            <div
                              className="h-2.5 bg-emerald-500"
                              style={{ width: `${Math.min(100, percentage)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent class popup: Record class / Class PDF / PPT / Assignment / Feedback / Trainer reference PDF → JAVA, HTML, Soft Skills, Aptitude */}
      {recentClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setRecentClassModal(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00448a] to-[#26ebe5] text-white">
              <div className="flex items-center gap-2">
                {recentClassModal === "record" && <Video className="w-5 h-5" />}
                {recentClassModal === "pdf" && <FileText className="w-5 h-5" />}
                {recentClassModal === "ppt" && <Presentation className="w-5 h-5" />}
                {recentClassModal === "assignment" && <ClipboardList className="w-5 h-5" />}
                {recentClassModal === "feedback" && <MessageSquare className="w-5 h-5" />}
                {recentClassModal === "trainer-pdf" && <BookOpen className="w-5 h-5" />}
                <h2 className="text-base sm:text-lg font-semibold">
                  {recentClassModal === "record" && "Record class"}
                  {recentClassModal === "pdf" && "Class PDF"}
                  {recentClassModal === "ppt" && "PPT"}
                  {recentClassModal === "assignment" && "Assignment"}
                  {recentClassModal === "feedback" && "Feedback"}
                  {recentClassModal === "trainer-pdf" && "Trainer reference PDF"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRecentClassModal(null)}
                className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="px-5 sm:px-6 pt-3 text-xs sm:text-sm text-gray-600">
              Select a course
            </p>
            <div className="p-5 sm:p-6 grid grid-cols-2 gap-3 sm:gap-4">
              {RECENT_CLASS_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    // Optional: handle card click (e.g. open link or another view)
                    setRecentClassModal(null);
                  }}
                  className={`rounded-xl shadow-sm border border-white/20 overflow-hidden text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br ${card.gradient} p-4 text-white`}
                >
                  <span className="text-sm sm:text-base font-semibold line-clamp-1">
                    {card.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upcoming / Current class popup: Live class / PDF / PPT → course cards (no Trainer reference PDF here) */}
      {upcomingClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setUpcomingClassModal(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00448a] to-[#26ebe5] text-white">
              <div className="flex items-center gap-2">
                {upcomingClassModal === "live" && <Radio className="w-5 h-5" />}
                {upcomingClassModal === "pdf" && <FileText className="w-5 h-5" />}
                {upcomingClassModal === "ppt" && <Presentation className="w-5 h-5" />}
                <h2 className="text-base sm:text-lg font-semibold">
                  {upcomingClassModal === "live" && "Live class"}
                  {upcomingClassModal === "pdf" && "PDF"}
                  {upcomingClassModal === "ppt" && "PPT"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setUpcomingClassModal(null)}
                className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="px-5 sm:px-6 pt-3 text-xs sm:text-sm text-gray-600">
              Select a course
            </p>
            <div className="p-5 sm:p-6 grid grid-cols-2 gap-3 sm:gap-4">
              {RECENT_CLASS_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setUpcomingClassModal(null)}
                  className={`rounded-xl shadow-sm border border-white/20 overflow-hidden text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br ${card.gradient} p-4 text-white`}
                >
                  <span className="text-sm sm:text-base font-semibold line-clamp-1">
                    {card.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowEditProfile(false);
              setProfileError("");
            }}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[90vh]">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00448a] to-[#26ebe5] text-white">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">
                    Edit profile
                  </h2>
                  <p className="text-xs sm:text-[13px] opacity-90">
                    Update your details for CRT dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfile(false);
                    setProfileError("");
                  }}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form
                onSubmit={handleProfileSubmit}
                className="px-5 sm:px-6 py-5 space-y-4 bg-white overflow-y-auto"
                style={{ maxHeight: "calc(90vh - 56px)" }}
              >
                {profileError && (
                  <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {profileError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Full name
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={editProfile.name}
                      onChange={(e) =>
                        setEditProfile((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5]"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={editProfile.email}
                      onChange={(e) =>
                        setEditProfile((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5]"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Phone (optional)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={editProfile.phone}
                      onChange={(e) =>
                        setEditProfile((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5]"
                      placeholder="Add a contact number"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Resume (link or title)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={editProfile.resume}
                      onChange={(e) =>
                        setEditProfile((prev) => ({
                          ...prev,
                          resume: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5]"
                      placeholder="Paste resume link or short title"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <textarea
                      rows={2}
                      value={editProfile.address}
                      onChange={(e) =>
                        setEditProfile((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5] resize-none"
                      placeholder="Current address (city, state, country)"
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-dashed border-gray-200">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Education
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setShowEducationForm((open) => !open)
                      }
                      className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-white hover:border-[#26ebe5] text-gray-700"
                    >
                      {showEducationForm ? "Hide education" : "Add education"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-3">
                    Add your education from 10th to Degree / PG with college name, course and marks.
                  </p>
                  {showEducationForm && (
                    <div className="space-y-4">
                      {Array.isArray(editProfile.educationEntries) &&
                        editProfile.educationEntries.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-medium text-gray-600">
                              Added education
                            </p>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                              {editProfile.educationEntries.map((edu) => (
                                <div
                                  key={edu.id}
                                  className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-800 truncate">
                                      {edu.type || "Education"}
                                    </p>
                                    <p className="text-[11px] text-gray-600 truncate">
                                      {edu.college}
                                    </p>
                                    <p className="text-[11px] text-gray-500 truncate">
                                      {edu.course}
                                      {edu.marks ? ` • ${edu.marks}` : ""}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditProfile((prev) => ({
                                        ...prev,
                                        educationEntries: (
                                          prev.educationEntries || []
                                        ).filter((e) => e.id !== edu.id),
                                      }))
                                    }
                                    className="text-[11px] text-red-500 hover:text-red-600 px-1"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-3.5 py-3.5 space-y-3">
                        <p className="text-xs font-semibold text-gray-700">
                          Add new education
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-600">
                              Level
                            </label>
                            <select
                              value={editProfile.educationType}
                              onChange={(e) =>
                                setEditProfile((prev) => ({
                                  ...prev,
                                  educationType: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5] bg-white"
                            >
                              <option value="">Select level</option>
                              <option value="10th">10th</option>
                              <option value="Inter / 12th">Inter / 12th</option>
                              <option value="Diploma">Diploma</option>
                              <option value="B.Tech">B.Tech</option>
                              <option value="Dual Degree">Dual Degree</option>
                              <option value="PG (MBA / MCA / M.Tech)">
                                PG (MBA / MCA / M.Tech)
                              </option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-600">
                              Marks / CGPA
                            </label>
                            <input
                              type="text"
                              value={editProfile.educationMarks}
                              onChange={(e) =>
                                setEditProfile((prev) => ({
                                  ...prev,
                                  educationMarks: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5]"
                              placeholder="e.g. 8.2 CGPA / 85%"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-600">
                              College / School name
                            </label>
                            <input
                              type="text"
                              value={editProfile.educationCollege}
                              onChange={(e) =>
                                setEditProfile((prev) => ({
                                  ...prev,
                                  educationCollege: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5]"
                              placeholder="e.g. ABC College of Engineering"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-600">
                              Course / Branch
                            </label>
                            <input
                              type="text"
                              value={editProfile.educationCourse}
                              onChange={(e) =>
                                setEditProfile((prev) => ({
                                  ...prev,
                                  educationCourse: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5]"
                              placeholder="e.g. CSE, ECE, MPC, etc."
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const type =
                                editProfile.educationType || "Other";
                              const college =
                                editProfile.educationCollege.trim();
                              const course =
                                editProfile.educationCourse.trim();
                              const marks =
                                editProfile.educationMarks.trim();

                              if (!college && !course && !marks) {
                                return;
                              }

                              const newEntry = {
                                id: `${Date.now()}-${Math.random()
                                  .toString(36)
                                  .slice(2, 7)}`,
                                type,
                                college,
                                course,
                                marks,
                              };

                              setEditProfile((prev) => ({
                                ...prev,
                                educationEntries: [
                                  ...(prev.educationEntries || []),
                                  newEntry,
                                ],
                                educationType: "",
                                educationCollege: "",
                                educationCourse: "",
                                educationMarks: "",
                              }));
                            }}
                            className="text-[11px] sm:text-xs px-3 py-2 rounded-xl bg-[#00448a] text-white hover:bg-[#003a76] shadow-sm"
                          >
                            Add this education
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-gray-700">
                    Internship / Work experience
                  </label>
                  <textarea
                    rows={3}
                    value={editProfile.experience}
                    onChange={(e) =>
                      setEditProfile((prev) => ({
                        ...prev,
                        experience: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#26ebe5] focus:border-[#26ebe5] resize-none"
                    placeholder="Company, duration, role, technologies..."
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProfile(false);
                      setProfileError("");
                    }}
                    className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-[#00448a] text-white hover:bg-[#003a76] shadow-sm"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
