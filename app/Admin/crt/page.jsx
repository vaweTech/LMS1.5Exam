"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db, firestoreHelpers } from "../../../lib/firebase";
import { mcqDb } from "../../../lib/firebaseMCQs";
import {
  collection as mcqCollection,
  getDocs as mcqGetDocs,
  addDoc as mcqAddDoc,
  deleteDoc as mcqDeleteDoc,
  doc as mcqDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function CRTManager() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [crts, setCrts] = useState([]);
  const [selectedCrtId, setSelectedCrtId] = useState(""); 
  const [creating, setCreating] = useState(false);
  const [showCreateCrtForm, setShowCreateCrtForm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingCrtId, setDeletingCrtId] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [showCreateCourseForm, setShowCreateCourseForm] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState("");
  const [allCrtCourses, setAllCrtCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [assigningCourses, setAssigningCourses] = useState(false);

  const [newCrt, setNewCrt] = useState({
    name: "",
    description: "",
  });

  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    courseCode: "",
  });
  const [crtStudents, setCrtStudents] = useState([]);
  const [assignedCrtStudents, setAssignedCrtStudents] = useState([]);
  const [assigningStudentId, setAssigningStudentId] = useState("");
  const [removingStudentId, setRemovingStudentId] = useState("");
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState("");

  const selectedCrt = useMemo(
    () => crts.find((i) => i.id === selectedCrtId) || null,
    [crts, selectedCrtId]
  );

  const assignedStudentIds = useMemo(
    () => new Set(assignedCrtStudents.map((s) => s.studentId)),
    [assignedCrtStudents]
  );

  const availableCrtStudents = useMemo(
    () =>
      crtStudents.filter((s) => {
        if (!s) return false;
        if (assignedStudentIds.has(s.id)) return false;
        return true;
      }),
    [crtStudents, assignedStudentIds]
  );

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

  const fetchCrts = useCallback(async function fetchCrts() {
    const snap = await firestoreHelpers.getDocs(
      firestoreHelpers.collection(db, "crt")
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setCrts(list);
    if (!selectedCrtId && list.length > 0) {
      setSelectedCrtId(list[0].id);
    }
  }, [selectedCrtId]);

  useEffect(() => {
    if (!user) return;
    fetchCrts();
  }, [user, fetchCrts]);

  useEffect(() => {
    setSelectedStudentToAssign("");
  }, [selectedCrtId]);

  const fetchAllCrtCourses = useCallback(async function fetchAllCrtCourses() {
    const snap = await firestoreHelpers.getDocs(
      firestoreHelpers.collection(db, "crtCourses")
    );
    setAllCrtCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAllCrtCourses();
  }, [user, fetchAllCrtCourses]);

  const fetchCrtStudents = useCallback(async function fetchCrtStudents() {
    try {
      const studentsRef = firestoreHelpers.collection(db, "students");
      const q = firestoreHelpers.query(
        studentsRef,
        firestoreHelpers.where("isCrt", "==", true)
      );
      const snap = await firestoreHelpers.getDocs(q);
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) =>
          (a.name || a.studentName || "").localeCompare(
            b.name || b.studentName || "",
            undefined,
            { sensitivity: "base" }
          )
        );
      setCrtStudents(list);
    } catch (e) {
      console.error("Failed to fetch CRT students", e);
      alert("Failed to load CRT students.");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCrtStudents();
  }, [user, fetchCrtStudents]);

  const fetchAssignedCrtStudents = useCallback(
    async function fetchAssignedCrtStudents(targetId) {
      if (!targetId) return;
      const snap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "crt", targetId, "students")
      );
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) =>
          (a.studentName || "").localeCompare(b.studentName || "", undefined, {
            sensitivity: "base",
          })
        );
      setAssignedCrtStudents(list);
    },
    []
  );

  useEffect(() => {
    if (!selectedCrtId) {
      setAssignedCrtStudents([]);
      return;
    }
    fetchAssignedCrtStudents(selectedCrtId);
  }, [
    selectedCrtId,
    fetchAssignedCrtStudents,
  ]);

  async function createCrt(e) {
    e.preventDefault();
    if (!newCrt.name.trim()) return;
    try {
      setCreating(true);
      const ref = await firestoreHelpers.addDoc(
        firestoreHelpers.collection(db, "crt"),
        {
          name: newCrt.name.trim(),
          description: newCrt.description.trim(),
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || null,
        }
      );
      setNewCrt({ name: "", description: "" });
      await fetchCrts();
      setSelectedCrtId(ref.id);
    } finally {
      setCreating(false);
    }
  }

  async function createCourseInCrt(e) {
    e.preventDefault();
    if (!newCourse.title.trim()) {
      alert("Please enter a course title.");
      return;
    }
    try {
      setCreatingCourse(true);
      await firestoreHelpers.addDoc(
        firestoreHelpers.collection(db, "crtCourses"),
        {
          title: newCourse.title.trim(),
          description: newCourse.description.trim() || "",
          courseCode: newCourse.courseCode.trim() || "",
          syllabus: [],
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || null,
        }
      );
      setNewCourse({ title: "", description: "", courseCode: "" });
      await fetchAllCrtCourses();
      setShowCreateCourseForm(false);
      alert("Course created successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to create course.");
    } finally {
      setCreatingCourse(false);
    }
  }

  async function assignCoursesToCrt() {
    if (!selectedCrtId || selectedCourseIds.length === 0) {
      alert("Please select a CRT program and at least one course.");
      return;
    }
    try {
      setAssigningCourses(true);
      const coursesCol = firestoreHelpers.collection(
        db,
        "crt",
        selectedCrtId,
        "courses"
      );
      
      // Check which courses are already assigned (by sourceCourseId)
      const existingSnap = await firestoreHelpers.getDocs(coursesCol);
      const existingSourceIds = new Set(
        existingSnap.docs.map((d) => d.data().sourceCourseId).filter(Boolean)
      );
      
      // Get the master course data for courses to assign
      const toAssign = selectedCourseIds.filter(
        (id) => !existingSourceIds.has(id)
      );
      
      // Create copies of courses under the CRT (including their chapters/days)
      for (const courseId of toAssign) {
        const masterCourseRef = firestoreHelpers.doc(db, "crtCourses", courseId);
        const masterCourseSnap = await firestoreHelpers.getDoc(masterCourseRef);
        
        if (masterCourseSnap.exists()) {
          const masterData = masterCourseSnap.data();

          // Create the course copy under this CRT
          const courseCopyRef = await firestoreHelpers.addDoc(coursesCol, {
            title: masterData.title || "",
            description: masterData.description || "",
            courseCode: masterData.courseCode || "",
            syllabus: masterData.syllabus || [],
            sourceCourseId: courseId, // Reference to the master course
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || null,
          });

          // Copy day-wise chapters from master course to this CRT course copy
          try {
            const masterChaptersSnap = await firestoreHelpers.getDocs(
              firestoreHelpers.collection(db, "crtCourses", courseId, "chapters")
            );

            if (!masterChaptersSnap.empty) {
              const targetChaptersCol = firestoreHelpers.collection(
                db,
                "crt",
                selectedCrtId,
                "courses",
                courseCopyRef.id,
                "chapters"
              );

              for (const ch of masterChaptersSnap.docs) {
                const chData = ch.data();
                await firestoreHelpers.addDoc(targetChaptersCol, {
                  ...chData,
                  // Ensure order is numeric and keep existing timestamps/fields
                  order: Number(chData.order) || 1,
                });
              }
            }
          } catch (chapterCopyError) {
            console.error(
              "Failed to copy chapters for course",
              courseId,
              chapterCopyError
            );
          }
        }
      }
      
      setSelectedCourseIds([]);
      await fetchAllCrtCourses();
      alert(
        toAssign.length > 0
          ? `${toAssign.length} course(s) assigned to CRT. Each CRT has its own independent copy.`
          : "All selected courses are already assigned to this CRT."
      );
    } catch (e) {
      console.error(e);
      alert("Failed to assign courses to CRT.");
    } finally {
      setAssigningCourses(false);
    }
  }

  function toggleCourseSelection(courseId) {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  }

  async function deleteCourse(courseId) {
    if (!courseId) return;
    if (
      !confirm(
        "Are you sure you want to delete this course? This will remove the course and its syllabus/chapters. CRT copies of this course will not be affected."
      )
    )
      return;
    try {
      setDeletingCourseId(courseId);
      const courseRef = firestoreHelpers.doc(db, "crtCourses", courseId);
      const chaptersCol = firestoreHelpers.collection(
        db,
        "crtCourses",
        courseId,
        "chapters"
      );
      const chaptersSnap = await firestoreHelpers.getDocs(chaptersCol);
      for (const ch of chaptersSnap.docs) {
        await firestoreHelpers.deleteDoc(ch.ref);
      }
      await firestoreHelpers.deleteDoc(courseRef);
      setSelectedCourseIds((prev) => prev.filter((id) => id !== courseId));
      await fetchAllCrtCourses();
      alert("Course deleted.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete course.");
    } finally {
      setDeletingCourseId("");
    }
  }

  function clearSelectedCourses() {
    setSelectedCourseIds([]);
  }

  async function assignStudentToCrt(studentId) {
    if (!selectedCrtId || !studentId) return;
    const student = crtStudents.find((s) => s.id === studentId);
    if (!student) return;
    const alreadyAssigned = assignedCrtStudents.some(
      (s) => s.studentId === studentId
    );
    if (alreadyAssigned) {
      alert("Student already assigned to this CRT.");
      return;
    }
    try {
      setAssigningStudentId(studentId);
      await firestoreHelpers.addDoc(
        firestoreHelpers.collection(
          db,
          "crt",
          selectedCrtId,
          "students"
        ),
        {
          studentId: student.id,
          studentName: student.name || student.studentName || "Unnamed",
          regdNo: student.regdNo || "",
          email: student.email || "",
          phone: student.phone1 || student.phone || "",
          assignedAt: new Date().toISOString(),
        }
      );
      setSelectedStudentToAssign("");
      await fetchAssignedCrtStudents(selectedCrtId);
    } catch (e) {
      console.error(e);
      alert("Failed to assign student to CRT.");
    } finally {
      setAssigningStudentId("");
    }
  }

  async function removeStudentFromCrt(recordId) {
    if (!selectedCrtId || !recordId) return;
    try {
      setRemovingStudentId(recordId);
      await firestoreHelpers.deleteDoc(
        firestoreHelpers.doc(
          db,
          "crt",
          selectedCrtId,
          "students",
          recordId
        )
      );
      await fetchAssignedCrtStudents(selectedCrtId);
    } catch (e) {
      console.error(e);
      alert("Failed to remove student from CRT.");
    } finally {
      setRemovingStudentId("");
    }
  }

  async function deleteCrt(id) {
    const targetId = id || selectedCrtId;
    if (!targetId) return;
    if (!confirm("Are you sure you want to delete this CRT? This will remove all course assignments and student assignments.")) return;
    try {
      setDeleting(true);
      setDeletingCrtId(targetId);

      // Delete course copies and their chapters/assignments
      const coursesSnap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "crt", targetId, "courses")
      );
      for (const courseDoc of coursesSnap.docs) {
        // Delete chapters
        const chaptersSnap = await firestoreHelpers.getDocs(
          firestoreHelpers.collection(
            db,
            "crt",
            targetId,
            "courses",
            courseDoc.id,
            "chapters"
          )
        );
        for (const ch of chaptersSnap.docs) {
          await firestoreHelpers.deleteDoc(ch.ref);
        }
        
        // Delete assignments/progress tests
        try {
          const assignmentsSnap = await mcqGetDocs(
            mcqCollection(mcqDb, "copiedcourses", courseDoc.id, "assignments")
          );
          for (const assignmentDoc of assignmentsSnap.docs) {
            await mcqDeleteDoc(
              mcqDoc(mcqDb, "copiedcourses", courseDoc.id, "assignments", assignmentDoc.id)
            );
          }
        } catch (assignError) {
          console.error("Error deleting assignments:", assignError);
        }
        
        // Delete the course copy
        await firestoreHelpers.deleteDoc(courseDoc.ref);
      }

      // Delete student assignments
      const studentsSnap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "crt", targetId, "students")
      );
      for (const studentDoc of studentsSnap.docs) {
        await firestoreHelpers.deleteDoc(studentDoc.ref);
      }

      // Delete CRT itself
      await firestoreHelpers.deleteDoc(
        firestoreHelpers.doc(db, "crt", targetId)
      );

      if (selectedCrtId === targetId) {
        setSelectedCrtId("");
      }
      await fetchCrts();
      alert("CRT deleted.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete CRT.");
    } finally {
      setDeleting(false);
      setDeletingCrtId("");
    }
  }

  function logout() {
    signOut(auth);
  }

  if (loading) return <div>Loading...</div>;
  if (!user || !isAdmin) return <div>Access Denied</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">CRT Manager</h1>
          <p className="text-sm text-slate-600">
            Create courses and assign them to CRT programs. A course can be assigned to multiple CRTs.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/Admin")}
            className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200"
          >
            Back
          </button>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Create CRT</h2>
              <button
                onClick={() => setShowCreateCrtForm(!showCreateCrtForm)}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition-colors"
              >
                {showCreateCrtForm ? "Hide Form" : "+ Create CRT"}
              </button>
            </div>
            {showCreateCrtForm && (
              <form onSubmit={createCrt} className="space-y-3 border-t pt-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newCrt.name}
                  onChange={(e) =>
                    setNewCrt((s) => ({ ...s, name: e.target.value }))
                  }
                  className="w-full rounded-md border px-3 py-2"
                />
                <textarea
                  placeholder="Description"
                  value={newCrt.description}
                  onChange={(e) =>
                    setNewCrt((s) => ({
                      ...s,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border px-3 py-2"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <button
                    disabled={creating}
                    className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCrtForm(false);
                      setNewCrt({ name: "", description: "" });
                    }}
                    className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-sm"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold mb-3">Select CRT</h2>
            <select
              value={selectedCrtId}
              onChange={(e) => setSelectedCrtId(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              {crts.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name || i.id}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold mb-3">CRT Programs</h2>
            <div className="space-y-3">
              {crts.length === 0 && (
                <div className="text-sm text-slate-500">No CRT programs yet.</div>
              )}
              {crts.map((i) => (
                <div
                  key={i.id}
                  className={`border rounded-md px-3 py-2 flex items-center justify-between ${selectedCrtId === i.id ? "bg-blue-50" : ""}`}
                >
                  <button
                    onClick={() => setSelectedCrtId(i.id)}
                    className="text-left"
                  >
                    <div className="font-medium">{i.name || i.id}</div>
                    {i.description && (
                      <div className="text-xs text-slate-500 line-clamp-1">
                        {i.description}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/Admin/crt/${i.id}/manage`}
                      className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => deleteCrt(i.id)}
                      disabled={deleting && deletingCrtId === i.id}
                      className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm disabled:opacity-50"
                    >
                      {deleting && deletingCrtId === i.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>

    <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Create Course</h2>
          <button
            onClick={() => setShowCreateCourseForm(!showCreateCourseForm)}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            {showCreateCourseForm ? "Hide Form" : "+ Create Course"}
          </button>
        </div>
        {showCreateCourseForm && (
          <form onSubmit={createCourseInCrt} className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Course Title *"
                value={newCourse.title}
                onChange={(e) =>
                  setNewCourse((s) => ({ ...s, title: e.target.value }))
                }
                className="w-full rounded-md border px-3 py-2"
                disabled={creatingCourse}
              />
              <input
                type="text"
                placeholder="Course Code"
                value={newCourse.courseCode}
                onChange={(e) =>
                  setNewCourse((s) => ({ ...s, courseCode: e.target.value }))
                }
                className="w-full rounded-md border px-3 py-2"
                disabled={creatingCourse}
              />
            </div>
            <textarea
              placeholder="Course Description"
              value={newCourse.description}
              onChange={(e) =>
                setNewCourse((s) => ({
                  ...s,
                  description: e.target.value,
                }))
              }
              className="w-full rounded-md border px-3 py-2"
              rows={3}
              disabled={creatingCourse}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={creatingCourse || !newCourse.title.trim()}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
              >
                {creatingCourse ? "Creating..." : "Create Course"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateCourseForm(false);
                  setNewCourse({ title: "", description: "", courseCode: "" });
                }}
                className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200"
                disabled={creatingCourse}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Assign Courses to CRT</h2>
          {selectedCourseIds.length > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-slate-100">
              Selected: {selectedCourseIds.length}
            </span>
          )}
        </div>
        {!selectedCrtId ? (
          <div className="text-sm text-amber-600 mb-3">
            Please select a CRT program to assign courses.
          </div>
        ) : null}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={assignCoursesToCrt}
            disabled={
              !selectedCrtId ||
              selectedCourseIds.length === 0 ||
              assigningCourses
            }
            className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            {assigningCourses ? "Assigning..." : "Assign Selected to CRT"}
          </button>
          <button
            onClick={clearSelectedCourses}
            disabled={selectedCourseIds.length === 0 || assigningCourses}
            className="px-3 py-2 rounded-md bg-slate-100 text-sm disabled:opacity-50"
          >
            Clear Selection  
          </button>
        </div>
        {allCrtCourses.length === 0 ? (
          <div className="text-sm text-slate-500">
            No courses created yet. Create a course above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allCrtCourses.map((c) => (
              <div
                key={c.id}
                className="border rounded-lg p-3 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                onClick={() => router.push(`/Admin/crt/courses/${c.id}`)}
              > 
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.includes(c.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleCourseSelection(c.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4"
                      disabled={!selectedCrtId}
                    />
                    <div className="font-semibold flex-1">{c.title || "Untitled"}</div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 ml-6">
                    {c.courseCode || "No course code"}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-3 ml-6">
                    {c.description || "No description"}
                  </p>
                  <div className="mt-2 ml-6 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-blue-600 font-medium">
                      Click to add syllabus days →
                    </span>
                    {Array.isArray(c.syllabus) && c.syllabus.length > 0 && (
                      <span className="text-xs text-emerald-600">
                        ({c.syllabus.length} days)
                      </span>
                    )}
                  </div>
                  <div className="mt-3 ml-6">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCourse(c.id);
                      }}
                      disabled={deletingCourseId === c.id}
                      className="px-3 py-1.5 rounded-md bg-red-500 text-white text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingCourseId === c.id ? "Deleting..." : "Delete Course"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">CRT Students</h2>
          <p className="text-sm text-slate-500">
            Only admissions marked as CRT appear here. Assign them to a CRT program without leaving this section.
          </p>
        </div>
        <div className="text-sm text-slate-500">
          <div>Eligible: {crtStudents.length}</div>
          <div>Assigned: {assignedCrtStudents.length}</div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] items-end">
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Choose CRT</label>
          <select
            value={selectedCrtId}
            onChange={(e) => setSelectedCrtId(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            {crts.length === 0 && (
              <option value="">No CRT programs available</option>
            )}
            {crts.map((crt) => (
              <option key={crt.id} value={crt.id}>
                {crt.name || crt.id}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Active CRT Details</label>
          <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600 min-h-[3.5rem]">
            {selectedCrt ? (
              <>
                <div className="font-semibold text-slate-800">
                  {selectedCrt.name || selectedCrt.id}
                </div>
                {selectedCrt.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {selectedCrt.description}
                  </p>
                )}
              </>
            ) : (
              <p className="text-amber-600 text-sm">
                Select a CRT to enable assignments.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto] items-end">
        <div className="space-y-2">
          <label className="text-sm text-slate-600">Select CRT Student</label>
          <select
            value={selectedStudentToAssign}
            onChange={(e) => setSelectedStudentToAssign(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">Choose student...</option>
            {crtStudents.map((student) => (
              <option
                key={student.id}
                value={student.id}
                disabled={assignedStudentIds.has(student.id)}
              >
                {student.name || student.studentName || student.regdNo || "Unnamed"}{" "}
                {student.regdNo ? `(${student.regdNo})` : ""}
                {assignedStudentIds.has(student.id) ? " - already assigned" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => assignStudentToCrt(selectedStudentToAssign)}
          disabled={
            !selectedCrtId ||
            !selectedStudentToAssign ||
            assigningStudentId === selectedStudentToAssign
          }
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
        >
          {assigningStudentId === selectedStudentToAssign
            ? "Assigning..."
            : "Assign Student"}
        </button>
      </div>
      {!selectedCrtId && (
        <p className="mt-2 text-sm text-amber-600">
          Select a CRT to enable assignments.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Eligible Students</h3>
            <span className="text-xs text-slate-500">
              {availableCrtStudents.length}
            </span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {availableCrtStudents.length === 0 && (
              <p className="text-sm text-slate-500">
                No unassigned CRT students available.
              </p>
            )}
            {availableCrtStudents.map((student) => (
              <div
                key={student.id}
                className="border rounded-md p-2 flex flex-col gap-1"
              >
                <div className="font-medium">
                  {student.name || student.studentName || "Unnamed"}
                </div>
                <div className="text-xs text-slate-500">
                  {student.regdNo ? `Regd: ${student.regdNo}` : ""}
                  {student.email ? ` • ${student.email}` : ""}
                </div>
                <button
                  onClick={() => assignStudentToCrt(student.id)}
                  disabled={
                    !selectedCrtId || assigningStudentId === student.id
                  }
                  className="self-start text-xs px-3 py-1 rounded-md bg-emerald-600 text-white disabled:opacity-50"
                >
                  {assigningStudentId === student.id ? "Assigning..." : "Assign"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2">
            <h3 className="font-semibold text-sm">
              Assigned to {selectedCrt?.name || "CRT"}
            </h3>
            {!selectedCrtId && (
              <p className="text-xs text-amber-600">
                Select a CRT to see assigned students.
              </p>
            )}
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {selectedCrtId && assignedCrtStudents.length === 0 && (
              <p className="text-sm text-slate-500">No students assigned yet.</p>
            )}
            {assignedCrtStudents.map((student) => (
              <div
                key={student.id}
                className="border rounded-md p-2 flex flex-col gap-1"
              >
                <div className="font-medium">{student.studentName || "Unnamed"}</div>
                <div className="text-xs text-slate-500">
                  {student.regdNo ? `Regd: ${student.regdNo}` : ""}
                  {student.email ? ` • ${student.email}` : ""}
                </div>
                <button
                  onClick={() => removeStudentFromCrt(student.id)}
                  disabled={removingStudentId === student.id}
                  className="self-start text-xs px-3 py-1 rounded-md bg-red-600 text-white disabled:opacity-50"
                >
                  {removingStudentId === student.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
    </div>
  );
}
