"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, firebaseAuth, firestoreHelpers } from "../../lib/firebase";

export default function InterviewExamsListPage() {
  const router = useRouter();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [submittedMap, setSubmittedMap] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const snap = await firestoreHelpers.getDocs(
          firestoreHelpers.collection(db, "interviewExams")
        );
        setExams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    return firebaseAuth.onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSubmissions() {
      if (!userId || exams.length === 0) {
        if (!cancelled) setSubmittedMap({});
        return;
      }
      try {
        const entries = await Promise.all(
          exams.map(async (ex) => {
            const subCol = firestoreHelpers.collection(
              db,
              "interviewExams",
              ex.id,
              "submissions"
            );
            const q = firestoreHelpers.query(
              subCol,
              firestoreHelpers.where("userId", "==", userId)
            );
            const snap = await firestoreHelpers.getDocs(q);
            return [ex.id, !snap.empty];
          })
        );
        if (!cancelled) setSubmittedMap(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setSubmittedMap({});
      }
    }
    loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, [exams, userId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-cyan-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Interview Exams</h1>
        {exams.length === 0 ? (
          <p className="text-gray-700">No exams available.</p>
        ) : (
          <div className="grid gap-4">
            {exams.map((ex) => (
              <div key={ex.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{ex.title}</p>
                  <p className="text-sm text-gray-600">{ex.questions?.length || 0} questions • {ex.durationMinutes} min</p>
                </div>
                <button
                  onClick={() => router.push(`/interview/${ex.id}`)}
                  disabled={submittedMap[ex.id]}
                  className={`px-4 py-2 rounded ${
                    submittedMap[ex.id]
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-[#00448a] hover:bg-[#003a76] text-white"
                  }`}
                >
                  {submittedMap[ex.id] ? "Submitted" : "Start"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


