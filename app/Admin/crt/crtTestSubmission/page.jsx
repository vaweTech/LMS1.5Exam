"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { auth, db, firestoreHelpers } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowLeftIcon, UserGroupIcon, ChartBarIcon } from "@heroicons/react/24/solid";

const NO_BATCH_KEY = "__no_batch__";

// Dummy data for demo when no submissions exist
const now = Date.now();
const DUMMY_SUBMISSIONS = [
  { id: "d1", userId: "u1", userName: "Priya Sharma", batchId: "b1", batchName: "Batch A", score: 18, total: 20, autoScore: 90, submittedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "d2", userId: "u2", userName: "Rahul Kumar", batchId: "b1", batchName: "Batch A", score: 16, total: 20, autoScore: 80, submittedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "d3", userId: "u3", userName: "Anita Reddy", batchId: "b1", batchName: "Batch A", score: 14, total: 20, autoScore: 70, submittedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "d4", userId: "u4", userName: "Vikram Singh", batchId: "b2", batchName: "Batch B", score: 15, total: 20, autoScore: 75, submittedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "d5", userId: "u5", userName: "Sneha Patel", batchId: "b2", batchName: "Batch B", score: 19, total: 20, autoScore: 95, submittedAt: new Date(now - 0.5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "d6", userId: "u6", userName: "Arun Nair", batchId: "b2", batchName: "Batch B", score: 12, total: 20, autoScore: 60, submittedAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "d7", userId: "u7", userName: "Kavitha Iyer", batchId: "b3", batchName: "Batch C", score: 17, total: 20, autoScore: 85, submittedAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "d8", userId: "u8", userName: "Rajesh Gupta", batchId: null, batchName: null, score: 11, total: 20, autoScore: 55, submittedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

export default function CRTTestSubmissionPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [crts, setCrts] = useState([]);
  const [selectedCrtId, setSelectedCrtId] = useState("");
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [useDummyData, setUseDummyData] = useState(true);

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

  const fetchCrts = useCallback(async () => {
    const snap = await firestoreHelpers.getDocs(
      firestoreHelpers.collection(db, "crt")
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setCrts(list);
    if (list.length > 0 && !selectedCrtId) {
      setSelectedCrtId(list[0].id);
    }
  }, [selectedCrtId]);

  useEffect(() => {
    if (!user) return;
    fetchCrts();
  }, [user, fetchCrts]);

  const fetchTests = useCallback(async (crtId) => {
    if (!crtId) {
      setTests([]);
      setSelectedTestId("");
      return;
    }
    const snap = await firestoreHelpers.getDocs(
      firestoreHelpers.collection(db, "crt", crtId, "tests")
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setTests(list);
    setSelectedTestId(list.length > 0 ? list[0].id : "");
  }, []);

  useEffect(() => {
    if (!selectedCrtId) {
      setTests([]);
      setSelectedTestId("");
      return;
    }
    fetchTests(selectedCrtId);
  }, [selectedCrtId, fetchTests]);

  const fetchSubmissions = useCallback(async () => {
    if (!selectedCrtId || !selectedTestId) {
      setSubmissions([]);
      return;
    }
    setLoadingSubmissions(true);
    try {
      const subRef = firestoreHelpers.collection(
        db,
        "crt",
        selectedCrtId,
        "tests",
        selectedTestId,
        "submissions"
      );
      const snap = await firestoreHelpers.getDocs(subRef);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubmissions(list);
    } catch (e) {
      console.error(e);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [selectedCrtId, selectedTestId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const effectiveSubmissions = useDummyData ? DUMMY_SUBMISSIONS : submissions;

  // Group submissions by batch (batchId or NO_BATCH_KEY)
  const submissionsByBatch = useMemo(() => {
    const map = new Map();
    for (const sub of effectiveSubmissions) {
      const key = sub.batchId || NO_BATCH_KEY;
      const label = sub.batchName || "No batch";
      if (!map.has(key)) map.set(key, { label, submissions: [] });
      map.get(key).submissions.push(sub);
    }
    // Sort each group by submittedAt desc
    for (const entry of map.values()) {
      entry.submissions.sort((a, b) => {
        const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      });
    }
    return Array.from(map.entries()).map(([batchKey, { label, submissions: subs }]) => ({
      batchKey,
      batchLabel: label,
      submissions: subs,
    }));
  }, [effectiveSubmissions]);

  const selectedCrt = useMemo(
    () => crts.find((c) => c.id === selectedCrtId) || null,
    [crts, selectedCrtId]
  );
  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) || null,
    [tests, selectedTestId]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-600">
          <div className="w-5 h-5 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Access denied</h1>
        <p className="text-slate-600 mb-4">Admin access required.</p>
        <Link href="/" className="text-cyan-600 font-medium hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-gray-800">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/Admin/crt"
            className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to CRT Admin
          </Link>
          <Link
            href="/Admin/crt/crtTestSubmission/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700"
          >
            <ChartBarIcon className="w-5 h-5" />
            Analytics
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
            CRT Test Submissions
          </h1>
          <p className="text-gray-600 text-sm">
            View test results grouped by batch. Select a CRT program and test below.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1. Select CRT Program
            </label>
            <select
              value={selectedCrtId}
              onChange={(e) => setSelectedCrtId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">-- Select CRT --</option>
              {crts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2. Select Test
            </label>
            <select
              value={selectedTestId}
              onChange={(e) => setSelectedTestId(e.target.value)}
              disabled={!selectedCrtId || tests.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">-- Select Test --</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.title || t.id}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useDummyData}
              onChange={(e) => setUseDummyData(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm font-medium text-gray-700">Use demo data</span>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchSubmissions}
              disabled={loadingSubmissions || useDummyData}
              className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 disabled:opacity-50"
            >
              {loadingSubmissions ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {(selectedCrt && selectedTest) || useDummyData ? (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200 flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-gray-700">
              {useDummyData ? "Demo data" : (selectedCrt?.name || selectedCrtId)}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-700">
              {useDummyData ? "Sample test" : (selectedTest?.name || selectedTest?.title || selectedTestId)}
            </span>
            <span className="text-gray-500">
              {effectiveSubmissions.length} submission{effectiveSubmissions.length !== 1 ? "s" : ""}
            </span>
            {useDummyData && (
              <span className="ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                Demo
              </span>
            )}
          </div>
        ) : null}

        {loadingSubmissions && !useDummyData ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin" />
          </div>
        ) : submissionsByBatch.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500">
            {selectedCrtId && selectedTestId
              ? "No submissions for this test yet."
              : "Select a CRT program and a test to view submissions, or enable \"Use demo data\" to see sample data."}
          </div>
        ) : (
          <div className="space-y-8">
            {submissionsByBatch.map(({ batchKey, batchLabel, submissions: subs }) => (
              <div
                key={batchKey}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-cyan-600" />
                  <h2 className="font-semibold text-gray-800">
                    {batchLabel}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({subs.length} submission{subs.length !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm">
                        <th className="px-4 py-3 font-medium">#</th>
                        <th className="px-4 py-3 font-medium">Student / User</th>
                        <th className="px-4 py-3 font-medium">Score</th>
                        <th className="px-4 py-3 font-medium">%</th>
                        <th className="px-4 py-3 font-medium">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subs.map((sub, i) => {
                        const percent =
                          sub.autoScore ??
                          (sub.total > 0
                            ? Math.round((sub.score / sub.total) * 100)
                            : "-");
                        const submittedAt = sub.submittedAt
                          ? new Date(sub.submittedAt).toLocaleString()
                          : "-";
                        return (
                          <tr
                            key={sub.id}
                            className="border-t border-gray-100 hover:bg-gray-50/50"
                          >
                            <td className="px-4 py-3 text-gray-500 tabular-nums">
                              {i + 1}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {sub.userName || sub.userId || "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {sub.score != null && sub.total != null
                                ? `${sub.score} / ${sub.total}`
                                : sub.score ?? "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  typeof percent === "number"
                                    ? percent >= 70
                                      ? "text-green-600 font-medium"
                                      : percent >= 40
                                        ? "text-amber-600 font-medium"
                                        : "text-red-600 font-medium"
                                    : "text-gray-500"
                                }
                              >
                                {typeof percent === "number" ? `${percent}%` : percent}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {submittedAt}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
