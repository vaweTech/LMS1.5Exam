"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, firestoreHelpers } from "../../lib/firebase";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDataEntry, setIsDataEntry] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = firestoreHelpers.doc(db, "users", u.uid);
        const snap = await firestoreHelpers.getDoc(ref);
        const userRole = snap.exists() ? snap.data().role : null;
        setIsAdmin(userRole === "admin" || userRole === "superadmin");
        setIsDataEntry(userRole === "dataentry");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  function logout() {
    signOut(auth);
  }

  if (loading) return <div>Loading...</div>;
  if (!user || (!isAdmin && !isDataEntry)) return <div>Access Denied</div>;

  return (
    <div className="relative p-8 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Admin Management Panel</h1>
          <p className="mt-1 text-sm text-gray-600">Manage content, users, and access controls</p>
        </div>
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          {isAdmin && (
            <button
              onClick={() => router.push("/Admin/register-form")}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Create Register Form
            </button>
          )}
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Quick actions grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
       
        {(isAdmin || isDataEntry) && (
        <Link href="Admin/mcqs">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-blue-50 border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 ring-1 ring-blue-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6V18M6 12H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage MCQs</h2>
            <p className="text-sm text-slate-600">Add, edit, and delete multiple-choice questions.</p>
          </div>
        </Link>
        )}

        {(isAdmin || isDataEntry) && (
        <Link href="/Admin/coding">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 18L22 12L16 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 6L2 12L8 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage Coding Questions</h2>
            <p className="text-sm text-slate-600">Create and manage programming challenges.</p>
          </div>
        </Link>
        )}

        {(isAdmin || isDataEntry) && (
        <Link href="/Admin/tutorials">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-amber-50 border border-slate-200 hover:border-amber-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-amber-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 17V5H16V17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage Tutorials</h2>
            <p className="text-sm text-slate-600">Publish and update tutorials for learners.</p>
          </div>
        </Link>
        )}
         {isAdmin && (
         <Link href="/Admin/userManager">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-rose-50 border border-slate-200 hover:border-rose-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.8954 15.1046 17 14 17H6C4.89543 17 4 17.8954 4 19V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="10" cy="9" r="4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage Users</h2>
            <p className="text-sm text-slate-600">Manage users, classes and permissions.</p>
          </div>
        </Link>
         )}
        {isAdmin && (
        <Link href="/Admin/StudentInfo">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-teal-50 border border-slate-200 hover:border-teal-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600 ring-1 ring-teal-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7H20M4 12H20M4 17H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Student Info</h2>
            <p className="text-sm text-slate-600">View and manage student information.</p>
          </div>
        </Link>
        )}

        {isAdmin && (
        <Link href="/Admin/assignments">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-purple-50 border border-slate-200 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 ring-1 ring-purple-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 13H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 9H9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Progress Test Submissions</h2>
            <p className="text-sm text-slate-600">Grade and review student progress tests.</p>
          </div>
        </Link>
        )}
        {isAdmin && (
        <Link href="/Admin/trainers">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-green-50 border border-slate-200 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 ring-1 ring-green-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage Trainers</h2>
            <p className="text-sm text-slate-600">Create trainers and assign classes/courses.</p>
          </div>
        </Link>
        )}

        {isAdmin && (
        <Link href="/Admin/whatsapp">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10.5C21 6.35786 17.6421 3 13.5 3C9.35786 3 6 6.35786 6 10.5C6 11.7391 6.2915 12.9064 6.80769 13.9344L3 21L10.0656 17.1923C11.0936 17.7085 12.2609 18 13.5 18C17.6421 18 21 14.6421 21 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">WhatsApp Messaging</h2>
            <p className="text-sm text-slate-600">Send group messages by class and courses.</p>
          </div>
        </Link>
        )}

        {isAdmin && (
        <Link href="/Admin/programs">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-violet-50 border border-slate-200 hover:border-violet-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 ring-1 ring-violet-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage Programs</h2>
            <p className="text-sm text-slate-600">Create programs and manage batches/classes.</p>
          </div>
        </Link>
        )}
        {isAdmin && (
        <Link href="/Admin/internships">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-lime-50 border border-slate-200 hover:border-lime-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-lime-100 text-lime-600 ring-1 ring-lime-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4h16v6H4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 14h10v6H4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 14v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage Internships</h2>
            <p className="text-sm text-slate-600">Assign course copies to internships.</p>
          </div>
        </Link>
        )}
        {isAdmin && (
        <Link href="/Admin/interview">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-cyan-50 border border-slate-200 hover:border-cyan-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 ring-1 ring-cyan-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800"> Exams</h2>
            <p className="text-sm text-slate-600">Create MCQ and descriptive tests.</p>
          </div>
        </Link>
        )}
        {isAdmin && (
        <Link href="/Admin/crt">
          <div className="group p-6 rounded-2xl cursor-pointer text-center bg-orange-50 border border-slate-200 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 ring-1 ring-orange-200 transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1 text-slate-800">Manage CRT</h2>
            <p className="text-sm text-slate-600">Create courses and assign them to CRT programs.</p>
          </div>
        </Link>
        )}
      </div>
    </div>
  );
}
