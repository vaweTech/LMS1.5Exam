"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { auth, db, firestoreHelpers, isFirebaseConfigured } from "../../../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, UserCheck, Search, RefreshCw, Mail, Phone, X } from "lucide-react";

function isIncharge(u) {
  const role = (u.role || "").toLowerCase();
  return (
    role === "crtincharge" ||
    role === "incharge" ||
    role === "class room monitor" ||
    role === "assignment incharge" ||
    u.isIncharge === true
  );
}

export default function ActiveInchargePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [incharges, setIncharges] = useState([]);
  const [loadingIncharges, setLoadingIncharges] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingIncharge, setEditingIncharge] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [createForm, setCreateForm] = useState({
    empId: "",
    name: "",
    email: "",
    phone: "",
    departmentName: "",
    departmentId: "",
    isClassRoomMonitor: false,
  });

  const [editForm, setEditForm] = useState({
    empId: "",
    name: "",
    email: "",
    phone: "",
    departmentName: "",
    departmentId: "",
    isClassRoomMonitor: false,
  });

  const updateForm = (key, value) => {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateEditForm = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
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

  const fetchIncharges = useCallback(async () => {
    if (!db) return;
    setLoadingIncharges(true);
    try {
      // 1. activeIncharge subcollection = role "assignment incharge"
      const activeSnap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "users", "crtActiveIncharge", "activeIncharge")
      );
      const assignmentList = activeSnap.docs.map((d) => ({
        id: d.id,
        subcollection: "activeIncharge",
        role: "assignment incharge",
        ...d.data(),
      }));

      // 2. classroomMonitor subcollection = role "class room monitor"
      const classroomSnap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "users", "crtActiveIncharge", "classroomMonitor")
      );
      const classroomList = classroomSnap.docs.map((d) => ({
        id: d.id,
        subcollection: "classroomMonitor",
        role: "class room monitor",
        ...d.data(),
      }));

      const list = [...assignmentList, ...classroomList].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
      setIncharges(list);
    } catch (err) {
      console.error(err);
      alert("Failed to load active incharges.");
    } finally {
      setLoadingIncharges(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin && isFirebaseConfigured) {
      fetchIncharges();
    }
  }, [user, isAdmin, fetchIncharges]);

  const openCreateModal = () => {
    setCreateForm({
      empId: "",
      name: "",
      email: "",
      phone: "",
      departmentName: "",
      departmentId: "",
      isClassRoomMonitor: false,
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
  };

  const openEditModal = (u) => {
    const role = (u.role || "").toLowerCase();
    setEditingIncharge(u);
    setEditForm({
      empId: u.empId || "",
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      departmentName: u.departmentName || "",
      departmentId: u.departmentId || "",
      isClassRoomMonitor: role === "class room monitor",
    });
  };

  const closeEditModal = () => {
    setEditingIncharge(null);
    setEditForm({
      empId: "",
      name: "",
      email: "",
      phone: "",
      departmentName: "",
      departmentId: "",
      isClassRoomMonitor: false,
    });
  };

  const handleCreateIncharge = async (e) => {
    e.preventDefault();
    const name = createForm.name.trim();
    const email = createForm.email.trim();
    const phone = createForm.phone.trim();

    if (!name || !email || !phone) {
      alert("Name, Email, and Mobile Number are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/create-incharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empId: createForm.empId || "",
          name,
          email,
          phone,
          departmentName: createForm.departmentName || "",
          departmentId: createForm.departmentId || "",
          isClassRoomMonitor: createForm.isClassRoomMonitor,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create incharge");
      }

      // Store in the correct subcollection: activeIncharge OR classroomMonitor
      if (db) {
        const subcollectionName = createForm.isClassRoomMonitor ? "classroomMonitor" : "activeIncharge";
        const centralCol = firestoreHelpers.collection(
          db,
          "users",
          "crtActiveIncharge",
          subcollectionName
        );
        await firestoreHelpers.addDoc(centralCol, {
          userId: data.uid || null,
          empId: createForm.empId || "",
          name,
          email,
          phone,
          departmentName: createForm.departmentName || "",
          departmentId: createForm.departmentId || "",
          role: createForm.isClassRoomMonitor ? "class room monitor" : "assignment incharge",
          isIncharge: true,
          createdAt: new Date().toISOString(),
        });
      }

      setShowCreateModal(false);
      setCreateForm({
        empId: "",
        name: "",
        email: "",
        phone: "",
        departmentName: "",
        departmentId: "",
        isClassRoomMonitor: false,
      });
      await fetchIncharges();
      alert("Incharge saved successfully. Default password: VaweIncharge@2025");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to save incharge. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIncharge = async (e) => {
    e.preventDefault();
    if (!db || !editingIncharge) {
      alert("Something went wrong. Please try again.");
      return;
    }

    const name = editForm.name.trim();
    const email = editForm.email.trim();
    const phone = editForm.phone.trim();

    if (!name || !email || !phone) {
      alert("Name, Email, and Mobile Number are required.");
      return;
    }

    const role = editForm.isClassRoomMonitor ? "class room monitor" : "assignment incharge";
    const newSubcollection = editForm.isClassRoomMonitor ? "classroomMonitor" : "activeIncharge";
    const oldSubcollection = editingIncharge.subcollection || "activeIncharge";

    const payload = {
      userId: editingIncharge.userId || null,
      empId: editForm.empId || "",
      name,
      email,
      phone,
      departmentName: editForm.departmentName || "",
      departmentId: editForm.departmentId || "",
      role,
      isIncharge: true,
    };

    setUpdating(true);
    try {
      if (newSubcollection === oldSubcollection) {
        const docRef = firestoreHelpers.doc(
          db,
          "users",
          "crtActiveIncharge",
          oldSubcollection,
          editingIncharge.id
        );
        await firestoreHelpers.updateDoc(docRef, payload);
      } else {
        const oldRef = firestoreHelpers.doc(
          db,
          "users",
          "crtActiveIncharge",
          oldSubcollection,
          editingIncharge.id
        );
        await firestoreHelpers.deleteDoc(oldRef);

        const newCol = firestoreHelpers.collection(
          db,
          "users",
          "crtActiveIncharge",
          newSubcollection
        );
        await firestoreHelpers.addDoc(newCol, {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }

      if (editingIncharge.userId) {
        const userDoc = firestoreHelpers.doc(db, "users", editingIncharge.userId);
        const perUserInchargeDoc = firestoreHelpers.doc(
          db,
          "users",
          editingIncharge.userId,
          "incharges",
          "primary"
        );
        await Promise.all([
          firestoreHelpers.updateDoc(userDoc, payload).catch(() => {}),
          firestoreHelpers.updateDoc(perUserInchargeDoc, payload).catch(() => {}),
        ]);
      }

      await fetchIncharges();
      closeEditModal();
      alert("Incharge updated successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to update incharge. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteIncharge = async (u) => {
    if (!db) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete incharge "${u.name || u.email || u.id}"?`
    );
    if (!confirmed) return;

    try {
      // Delete from the correct subcollection (activeIncharge or classroomMonitor)
      const subcollection = u.subcollection || "activeIncharge";
      const centralDoc = firestoreHelpers.doc(
        db,
        "users",
        "crtActiveIncharge",
        subcollection,
        u.id
      );

      const ops = [firestoreHelpers.deleteDoc(centralDoc)];

      if (u.userId) {
        const userDoc = firestoreHelpers.doc(db, "users", u.userId);
        const perUserInchargeDoc = firestoreHelpers.doc(
          db,
          "users",
          u.userId,
          "incharges",
          "primary"
        );
        ops.push(
          firestoreHelpers.deleteDoc(perUserInchargeDoc).catch(() => {}),
          firestoreHelpers.deleteDoc(userDoc).catch(() => {})
        );
      }

      await Promise.all(ops);
      await fetchIncharges();
      alert("Incharge deleted.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete incharge. Please try again.");
    }
  };

  const filtered = incharges.filter(
    (u) =>
      !search.trim() ||
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || "").includes(search)
  );

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
      <div className="mx-auto px-4 py-10 w-full">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/Admin/crt"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to CRT Admin
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              Active Incharge
            </h1>
            <p className="text-slate-600 mt-1">
              View and manage active incharge users for CRT programs.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchIncharges}
              disabled={loadingIncharges}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingIncharges ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00448a] hover:bg-[#003a76] text-white font-medium transition-colors"
            >
              + Create Incharge
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loadingIncharges ? (
            <div className="p-12 flex flex-col items-center gap-3 text-slate-500">
              <div className="w-10 h-10 rounded-lg border-2 border-[#00448a] border-t-transparent animate-spin" />
              <p className="text-sm font-medium">Loading incharges...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium">
                {incharges.length === 0
                  ? "No active incharges found."
                  : "No matching incharges for your search."}
              </p>
              <p className="text-sm mt-1">
                Assignment incharges are stored in{" "}
                <code className="bg-slate-100 px-1 rounded">activeIncharge</code>; class room
                monitors in <code className="bg-slate-100 px-1 rounded">classroomMonitor</code>.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <table className="w-full table-auto text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600 text-xs uppercase tracking-wide w-12">
                      S.No
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Employee ID
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">
                      Email
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Mobile Number
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">
                      Department
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Department ID
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">
                      Job Role
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600 text-xs uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 text-slate-700 text-center">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                        {u.empId || "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-slate-900 font-medium">
                        {u.name || "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div className="flex items-center gap-1.5 min-w-[160px]">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email || "\u2014"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          "\u2014"
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {u.departmentName || "\u2014"}
                      </td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                        {u.departmentId || "\u2014"}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            (u.role || "").toLowerCase() === "class room monitor"
                              ? "bg-emerald-100 text-emerald-700"
                              : (u.role || "").toLowerCase() === "assignment incharge"
                              ? "bg-sky-100 text-sky-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {(u.role || "assignment incharge")
                            .split(" ")
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(" ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIncharge(u)}
                            className="px-3 py-1 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Create Active Incharge</h2>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateIncharge} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={createForm.empId}
                      onChange={(e) => updateForm("empId", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="EMP001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={createForm.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="10-digit number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Department Name
                    </label>
                    <input
                      type="text"
                      value={createForm.departmentName}
                      onChange={(e) => updateForm("departmentName", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="Department name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Department ID (optional)
                    </label>
                    <input
                      type="text"
                      value={createForm.departmentId}
                      onChange={(e) => updateForm("departmentId", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="Dept ID"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="class-room-monitor"
                    type="checkbox"
                    checked={createForm.isClassRoomMonitor}
                    onChange={(e) => updateForm("isClassRoomMonitor", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#00448a] focus:ring-[#00448a]"
                  />
                  <label
                    htmlFor="class-room-monitor"
                    className="text-sm text-slate-700 select-none"
                  >
                    Job Role: <span className="font-semibold">Class room monitor</span> (optional)
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  If not checked, job role will be saved as{" "}
                  <span className="font-semibold">Assignment incharge</span>.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#00448a] text-white text-sm font-medium hover:bg-[#003a76] disabled:opacity-60"
                  >
                    {submitting ? "Saving..." : "Save Incharge"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingIncharge && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg mx-4 rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Edit Incharge</h2>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleUpdateIncharge} className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={editForm.empId}
                      onChange={(e) => updateEditForm("empId", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="EMP001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => updateEditForm("name", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => updateEditForm("email", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => updateEditForm("phone", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="10-digit number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Department Name
                    </label>
                    <input
                      type="text"
                      value={editForm.departmentName}
                      onChange={(e) => updateEditForm("departmentName", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="Department name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Department ID (optional)
                    </label>
                    <input
                      type="text"
                      value={editForm.departmentId}
                      onChange={(e) => updateEditForm("departmentId", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00448a]/20 focus:border-[#00448a]"
                      placeholder="Dept ID"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="edit-class-room-monitor"
                    type="checkbox"
                    checked={editForm.isClassRoomMonitor}
                    onChange={(e) => updateEditForm("isClassRoomMonitor", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#00448a] focus:ring-[#00448a]"
                  />
                  <label
                    htmlFor="edit-class-room-monitor"
                    className="text-sm text-slate-700 select-none"
                  >
                    Job Role: <span className="font-semibold">Class room monitor</span> (optional)
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  If not checked, job role will be saved as{" "}
                  <span className="font-semibold">Assignment incharge</span>.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-5 py-2 rounded-xl bg-[#00448a] text-white text-sm font-medium hover:bg-[#003a76] disabled:opacity-60"
                  >
                    {updating ? "Updating..." : "Update Incharge"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
