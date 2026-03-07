"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { auth, db, firestoreHelpers, isFirebaseConfigured } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, Search, RefreshCw, UserPlus, X, Phone, CheckCircle2 } from "lucide-react";

function isCrtStudent(s) {
  return s.role === "crtStudent" || s.isCrt === true;
}

const INITIAL_ADMISSION_FORM = {
  regNo: "",
  studentName: "",
  fatherName: "",
  gender: "",
  dateOfBirth: "",
  aadharNo: "",
  email: "",
  phone1: "",
  phone2: "",
  qualification: "",
  collegeUniversity: "",
  degree: "",
  branch: "",
  yearOfPassing: "",
  workExperienceYears: "",
  company: "",
  skillSet: "",
  courseProjectTitle: "",
  dateOfJoining: "",
  timings: "",
  totalFee: "",
  paidFee: "",
  remarks: "",
};

export default function CRTStudentUserManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [admissionForm, setAdmissionForm] = useState(INITIAL_ADMISSION_FORM);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpValue, setPhoneOtpValue] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const updateForm = (key, value) => {
    setAdmissionForm((f) => ({ ...f, [key]: value }));
  };

  const handleSendOtp = () => {
    if (!admissionForm.phone1 || admissionForm.phone1.length < 10) {
      alert("Enter a valid 10-digit mobile number.");
      return;
    }
    setPhoneOtpSent(true);
    setPhoneOtpValue("");
    setPhoneVerified(false);
  };

  const handleVerifyOtp = () => {
    setOtpVerifying(true);
    setTimeout(() => {
      if (phoneOtpValue === "1234") {
        setPhoneVerified(true);
      } else {
        alert("Invalid OTP. Use 1234 for demo.");
      }
      setOtpVerifying(false);
    }, 400);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = firestoreHelpers.doc(db, "users", u.uid);
        const snap = await firestoreHelpers.getDoc(ref);
        const role = snap.exists() ? snap.data().role : null;
        setIsAdmin(role === "admin" || role === "superadmin");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchStudents = useCallback(async () => {
    if (!db) return;
    setLoadingStudents(true);
    try {
      const snap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "students")
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStudents(list);
    } catch (err) {
      console.error(err);
      alert("Failed to load students.");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin && isFirebaseConfigured) {
      fetchStudents();
    }
  }, [user, isAdmin, fetchStudents]);

  const crtStudents = useMemo(() => {
    return students.filter(isCrtStudent);
  }, [students]);

  const filteredStudents = useMemo(() => {
    let list = [...crtStudents];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.email || "").toLowerCase().includes(q) ||
          (s.name || "").toLowerCase().includes(q) ||
          (s.regNo || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [crtStudents, search]);

  const openAdmissionModal = () => {
    setAdmissionForm({ ...INITIAL_ADMISSION_FORM });
    setPhoneOtpSent(false);
    setPhoneOtpValue("");
    setPhoneVerified(false);
    setShowAdmissionModal(true);
  };

  const closeAdmissionModal = () => {
    setShowAdmissionModal(false);
  };

  const handleAdmissionSubmit = (e) => {
    e.preventDefault();
    if (!phoneVerified) {
      alert("Please verify your mobile number with OTP first.");
      return;
    }
    alert("Admission form submitted (dummy).");
    setShowAdmissionModal(false);
    setAdmissionForm({ ...INITIAL_ADMISSION_FORM });
    setPhoneVerified(false);
    setPhoneOtpSent(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-xl border-2 border-[#00448a] border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full text-center p-10 rounded-3xl bg-white border border-slate-200 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-8">Admin access required.</p>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-3 bg-[#00448a] text-white rounded-xl hover:bg-[#003a76] transition-colors font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              Student User Management
            </h1>
            <p className="text-slate-600 mt-1">
              View and manage CRT students only.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={openAdmissionModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00448a] hover:bg-[#003a76] text-white font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create Admission
            </button>
            <Link
              href="/Admin/userManager"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium transition-colors"
            >
              Full Student Manager
            </Link>
            <Link
              href="/Admin/crt"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to CRT Admin
            </Link>
          </div>
        </div>

        {/* Create Admission Modal – CRT Student (dummy) */}
        {showAdmissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closeAdmissionModal}>
            <div className="w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-[#00448a] to-[#0066b3] px-6 py-4 rounded-t-2xl">
                <h2 className="text-lg font-bold text-white">CRT Student Admission</h2>
                <button type="button" onClick={closeAdmissionModal} className="rounded-lg p-1.5 text-white/90 hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAdmissionSubmit} className="p-6 bg-slate-50/50">
                <p className="text-xs text-slate-500 mb-5">Demo OTP: <strong>1234</strong></p>

                {/* Personal Information */}
                <section className="mb-5 rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">Personal Information</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Regd. No. (Unique) *</label>
                      <input type="text" value={admissionForm.regNo} onChange={(e) => updateForm("regNo", e.target.value)} placeholder="e.g. 1" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Student Name *</label>
                      <input type="text" value={admissionForm.studentName} onChange={(e) => updateForm("studentName", e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Father&apos;s Name *</label>
                      <input type="text" value={admissionForm.fatherName} onChange={(e) => updateForm("fatherName", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Gender *</label>
                        <select value={admissionForm.gender} onChange={(e) => updateForm("gender", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]">
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Date of Birth *</label>
                        <input type="text" value={admissionForm.dateOfBirth} onChange={(e) => updateForm("dateOfBirth", e.target.value)} placeholder="dd-mm-yyyy" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Aadhar No. *</label>
                      <input type="text" value={admissionForm.aadharNo} onChange={(e) => updateForm("aadharNo", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                  </div>
                </section>

                {/* Contact + Mobile verification */}
                <section className="mb-5 rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Phone className="w-4 h-4 text-[#00448a]" /> Contact &amp; Mobile Verification
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Email *</label>
                      <input type="email" value={admissionForm.email} onChange={(e) => updateForm("email", e.target.value)} placeholder="student@example.com" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Mobile (Primary) *</label>
                      <div className="flex gap-2">
                        <input type="tel" value={admissionForm.phone1} onChange={(e) => updateForm("phone1", e.target.value)} placeholder="10-digit number" maxLength={10} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a] flex-1" />
                        <button type="button" onClick={handleSendOtp} disabled={phoneVerified} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium whitespace-nowrap disabled:opacity-50">
                          Send OTP
                        </button>
                      </div>
                    </div>
                    {phoneOtpSent && !phoneVerified && (
                      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                        <div className="flex-1 min-w-[120px]">
                          <label className="mb-1 block text-xs font-medium text-amber-800">Enter OTP</label>
                          <input type="text" value={phoneOtpValue} onChange={(e) => setPhoneOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="1234" maxLength={6} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a] text-center tracking-widest" />
                        </div>
                        <button type="button" onClick={handleVerifyOtp} disabled={otpVerifying} className="px-4 py-2 rounded-lg bg-[#00448a] text-white text-sm font-medium hover:bg-[#003a76] disabled:opacity-60">
                          {otpVerifying ? "Verifying…" : "Verify OTP"}
                        </button>
                      </div>
                    )}
                    {phoneVerified && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-800 text-sm">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Mobile number verified
                      </div>
                    )}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone 2</label>
                      <input type="tel" value={admissionForm.phone2} onChange={(e) => updateForm("phone2", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                  </div>
                </section>

                {/* Educational Details */}
                <section className="mb-5 rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Educational Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Qualification *</label>
                      <input type="text" value={admissionForm.qualification} onChange={(e) => updateForm("qualification", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">College / University</label>
                      <input type="text" value={admissionForm.collegeUniversity} onChange={(e) => updateForm("collegeUniversity", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Degree *</label>
                        <input type="text" value={admissionForm.degree} onChange={(e) => updateForm("degree", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch *</label>
                        <input type="text" value={admissionForm.branch} onChange={(e) => updateForm("branch", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Year of Passing *</label>
                      <input type="text" value={admissionForm.yearOfPassing} onChange={(e) => updateForm("yearOfPassing", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                  </div>
                </section>

                {/* Work Experience */}
                <section className="mb-5 rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Work Experience</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Experience (Years)</label>
                        <input type="text" value={admissionForm.workExperienceYears} onChange={(e) => updateForm("workExperienceYears", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Company</label>
                        <input type="text" value={admissionForm.company} onChange={(e) => updateForm("company", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Skill Set</label>
                      <input type="text" value={admissionForm.skillSet} onChange={(e) => updateForm("skillSet", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                  </div>
                </section>

                {/* Course Details */}
                <section className="mb-5 rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Course Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Course / Project Title *</label>
                      <input type="text" value={admissionForm.courseProjectTitle} onChange={(e) => updateForm("courseProjectTitle", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Date of Joining *</label>
                        <input type="text" value={admissionForm.dateOfJoining} onChange={(e) => updateForm("dateOfJoining", e.target.value)} placeholder="dd-mm-yyyy" className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Timings</label>
                        <input type="text" value={admissionForm.timings} onChange={(e) => updateForm("timings", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Fee Details */}
                <section className="mb-5 rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Fee Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Total Fee *</label>
                      <input type="text" value={admissionForm.totalFee} onChange={(e) => updateForm("totalFee", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Paid Fee *</label>
                      <input type="text" value={admissionForm.paidFee} onChange={(e) => updateForm("paidFee", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]" />
                    </div>
                  </div>
                </section>

                {/* Remarks */}
                <section className="mb-5 rounded-xl bg-white p-5 shadow-sm border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Additional Information</h3>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Remarks</label>
                  <textarea value={admissionForm.remarks} onChange={(e) => updateForm("remarks", e.target.value)} placeholder="Any additional notes..." rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a] resize-none" />
                </section>

                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={closeAdmissionModal} className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={!phoneVerified} className="px-5 py-2.5 rounded-xl bg-[#00448a] text-white font-medium hover:bg-[#003a76] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Submit Admission</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {!isFirebaseConfigured ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <p>Firebase is not configured. Configure .env.local to load students.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 min-w-0 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search CRT students by name, email or reg no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                />
              </div>
              <button
                onClick={fetchStudents}
                disabled={loadingStudents}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStudents ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {loadingStudents && students.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-10 h-10 mx-auto mb-3 animate-spin text-[#00448a]" />
                  <p>Loading students...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>{search.trim() ? "No CRT students match your search." : "No CRT students found."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="p-4 font-semibold text-slate-700">Name</th>
                        <th className="p-4 font-semibold text-slate-700">Email</th>
                        <th className="p-4 font-semibold text-slate-700">Reg No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-slate-100 hover:bg-slate-50/50"
                        >
                          <td className="p-4 text-slate-900 font-medium">
                            {s.name || "—"}
                          </td>
                          <td className="p-4 text-slate-600">{s.email || "—"}</td>
                          <td className="p-4 text-slate-600">{s.regNo || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>

            <p className="mt-4 text-sm text-slate-500">
              Showing {filteredStudents.length}
              {search.trim() ? ` of ${crtStudents.length}` : ""} CRT students
            </p>
          </>
        )}
      </div>
    </div>
  );
}
