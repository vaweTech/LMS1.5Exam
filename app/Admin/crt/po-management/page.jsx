"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth, db, firestoreHelpers } from "../../../../lib/firebase";
import Link from "next/link";
import { Layers, ArrowLeft } from "lucide-react";

export default function POManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [savingPo, setSavingPo] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const [pos, setPos] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [editingPo, setEditingPo] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    empId: "",
    email: "",
    department: "",
    mobile: "",
    notes: "",
  });
  const [deletingId, setDeletingId] = useState(null);
  const [poForm, setPoForm] = useState({
    name: "",
    empId: "",
    email: "",
    department: "",
    mobile: "",
    notes: "",
  });

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

  useEffect(() => {
    if (!user || !isAdmin) return;
    fetchPos();
  }, [user, isAdmin]);

  async function fetchPos() {
    if (!db) return;
    setLoadingPos(true);
    try {
      // Load POs from central document path: users/crtPO/po/{poId}
      const poCol = firestoreHelpers.collection(db, "users", "crtPO", "po");
      const poSnap = await firestoreHelpers.getDocs(poCol);

      const allPos = poSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() || {}),
      }));

      allPos.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setPos(allPos);
    } finally {
      setLoadingPos(false);
    }
  }

  const filteredPos = pos.filter((po) => {
    const term = filterText.trim().toLowerCase();
    if (!term) return true;
    const emp = String(po.empId || "").toLowerCase();
    const email = String(po.email || "").toLowerCase();
    return emp.includes(term) || email.includes(term);
  });

  function startEditPo(po) {
    setEditingPo(po);
    setEditForm({
      name: po.name || "",
      empId: po.empId || "",
      email: po.email || "",
      department: po.department || "",
      mobile: po.mobile || "",
      notes: po.notes || "",
    });
  }

  function closeEditPo() {
    setEditingPo(null);
    setEditForm({
      name: "",
      empId: "",
      email: "",
      department: "",
      mobile: "",
      notes: "",
    });
  }

  async function handleUpdatePo(e) {
    e.preventDefault();
    if (!editingPo) return;
    try {
      setSavingPo(true);
      const centralPoRef = firestoreHelpers.doc(
        db,
        "users",
        "crtPO",
        "po",
        editingPo.id
      );
      await firestoreHelpers.updateDoc(centralPoRef, {
        name: editForm.name.trim(),
        empId: editForm.empId.trim(),
        email: editForm.email.trim(),
        department: editForm.department.trim(),
        mobile: editForm.mobile.trim(),
        notes: editForm.notes.trim(),
      });
      closeEditPo();
      await fetchPos();
      alert("PO updated.");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to update PO");
    } finally {
      setSavingPo(false);
    }
  }

  async function handleDeletePo(po) {
    const confirmed = window.confirm(
      "This PO record will be deleted permanently. Are you sure?"
    );
    if (!confirmed) return;
    try {
      setDeletingId(po.id);
      const centralPoRef = firestoreHelpers.doc(db, "users", "crtPO", "po", po.id);
      await firestoreHelpers.deleteDoc(centralPoRef);
      await fetchPos();
      alert("PO deleted.");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to delete PO");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmitPo(e) {
    e.preventDefault();
    if (!poForm.name.trim() || !poForm.empId.trim()) return;
    try {
      setSavingPo(true);
      let defaultPassword = null;

      const res = await fetch("/api/create-po-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: poForm.name.trim(),
          empId: poForm.empId.trim(),
          email: poForm.email.trim(),
          department: poForm.department.trim(),
          mobile: poForm.mobile.trim(),
          notes: poForm.notes.trim(),
          createdBy: user?.uid || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create PO user");
      }
      defaultPassword = data?.defaultPassword || null;
      if (defaultPassword) {
        alert(`PO created. Default password: ${defaultPassword}`);
      }
      setPoForm({
        name: "",
        empId: "",
        email: "",
        department: "",
        mobile: "",
        notes: "",
      });
      setShowForm(false);
      await fetchPos();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to create PO user");
    } finally {
      setSavingPo(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-xl border-2 border-[#00448a] border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading PO Management...</p>
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
      <div className="mx-auto px-4 py-10">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/Admin/crt"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CRT Admin
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00448a] to-cyan-600 flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              PO Management
            </h1>
            <p className="text-slate-600 mt-1">
              Manage POs related to CRT programs.
            </p>
            <p className="text-xs text-slate-500 mt-2 max-w-xl">
              POs appear here only after they are saved to the database.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00448a] hover:bg-[#003a76] text-white font-medium transition-colors"
              disabled={showForm}
            >
              Create PO
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-8">
          <div className="mt-2 border-t border-slate-200 pt-6">
            {loadingPos ? (
              <p className="text-sm text-slate-500">Loading POs...</p>
            ) : pos.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p>No POs created yet.</p>
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00448a] text-white font-medium hover:bg-[#003a76]"
                >
                  Create PO
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Filter by EMP Id or Email
                    </label>
                    <input
                      type="text"
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      placeholder="Search EMP Id or email"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="p-4 font-semibold text-slate-700">EMP Id</th>
                        <th className="p-4 font-semibold text-slate-700">Name</th>
                        <th className="p-4 font-semibold text-slate-700">Email</th>
                        <th className="p-4 font-semibold text-slate-700">Department</th>
                        <th className="p-4 font-semibold text-slate-700">Mobile</th>
                        <th className="p-4 font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPos.map((po) => (
                        <tr
                          key={po.id}
                          className="border-b border-slate-100 hover:bg-slate-50/50 text-sm"
                        >
                          <td className="p-4 text-slate-600">{po.empId || "—"}</td>
                          <td className="p-4 text-slate-900 font-medium">
                            {po.name || "—"}
                          </td>
                          <td className="p-4 text-slate-600">{po.email || "—"}</td>
                          <td className="p-4 text-slate-600">
                            {po.department || "—"}
                          </td>
                          <td className="p-4 text-slate-600">
                            {po.mobile || "—"}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startEditPo(po)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePo(po)}
                                disabled={deletingId === po.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                              >
                                {deletingId === po.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Showing {filteredPos.length} of {pos.length} PO
                  {pos.length !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create PO Modal (same style as CRT Trainers create modal) */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-[#00448a] to-[#0066b3] px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">Create PO</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitPo} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    EMP Id
                  </label>
                  <input
                    type="text"
                    value={poForm.empId}
                    onChange={(e) =>
                      setPoForm((prev) => ({ ...prev, empId: e.target.value }))
                    }
                    placeholder="Employee ID"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={poForm.name}
                    onChange={(e) =>
                      setPoForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="PO full name"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={poForm.email}
                    onChange={(e) =>
                      setPoForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="po@example.com"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Department
                  </label>
                  <input
                    type="text"
                    value={poForm.department}
                    onChange={(e) =>
                      setPoForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    placeholder="Department"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={poForm.mobile}
                    onChange={(e) =>
                      setPoForm((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                    placeholder="Mobile number"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={poForm.notes}
                    onChange={(e) =>
                      setPoForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Any additional information about this PO"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a] resize-none"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                A Firebase Auth user will be created with a default password for this PO.
              </p>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPo}
                  className="px-5 py-2.5 rounded-xl bg-[#00448a] text-white font-medium hover:bg-[#003a76] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingPo ? "Creating…" : "Create PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {editingPo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeEditPo}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4 rounded-t-2xl">
              <h2 className="text-lg font-bold text-white">Edit PO</h2>
              <button
                type="button"
                onClick={closeEditPo}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdatePo} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    EMP Id
                  </label>
                  <input
                    type="text"
                    value={editForm.empId}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, empId: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={editForm.mobile}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00448a]/30 focus:border-[#00448a] resize-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeEditPo}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPo}
                  className="px-5 py-2.5 rounded-xl bg-[#00448a] text-white font-medium hover:bg-[#003a76] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingPo ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
