"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db, firestoreHelpers } from "../../../../../lib/firebase";
import { mcqDb } from "../../../../../lib/firebaseMCQs";
import {
  collection as mcqCollection,
  getDocs as mcqGetDocs,
  addDoc as mcqAddDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function CourseSyllabusDays() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId;

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [course, setCourse] = useState(null);

  // Chapters (day-wise content) stored under crtCourses/{courseId}/chapters
  const [chapters, setChapters] = useState([]);
  const [chapterSavingId, setChapterSavingId] = useState("");
  const [newChapter, setNewChapter] = useState({
    title: "",
    topics: "",
    video: "",
    pptUrl: "",
    pdfDocument: "",
    liveClassLink: "",
    recordedClassLink: "",
    classDocs: "",
    order: 1,
  });

  const [crts, setCrts] = useState([]);
  const [selectedCrtId, setSelectedCrtId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Progress tests mapped by course (same structure as in manage page)
  const [progressTests, setProgressTests] = useState([]);
  const [loadingProgressTests, setLoadingProgressTests] = useState(false);

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

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    try {
      const snap = await firestoreHelpers.getDoc(
        firestoreHelpers.doc(db, "crtCourses", courseId)
      );
      if (snap.exists()) {
        const data = snap.data();
        setCourse({
          id: snap.id,
          title: data.title || "",
          description: data.description || "",
          courseCode: data.courseCode || "",
        });
      }
    } catch (e) {
      console.error("Failed to fetch course:", e);
      alert("Failed to load course.");
    }
  }, [courseId]);

  const fetchCrts = useCallback(async () => {
    try {
      const snap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "crt")
      );
      setCrts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Failed to fetch CRTs:", e);
    }
  }, []);

  const fetchChapters = useCallback(async () => {
    if (!courseId) return;
    try {
      const snap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(db, "crtCourses", courseId, "chapters")
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setChapters(list);
    } catch (e) {
      console.error("Failed to fetch chapters:", e);
      setChapters([]);
    }
  }, [courseId]);

  const fetchProgressTests = useCallback(async () => {
    try {
      if (!courseId) {
        setProgressTests([]);
        return;
      }
      setLoadingProgressTests(true);
      const snap = await mcqGetDocs(
        mcqCollection(mcqDb, "copiedcourses", courseId, "assignments")
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.day || 0) - (b.day || 0));
      setProgressTests(list);
    } catch (e) {
      console.error("Failed to load progress tests:", e);
      setProgressTests([]);
    } finally {
      setLoadingProgressTests(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!user) return;
    fetchCourse();
    fetchCrts();
    fetchChapters();
    fetchProgressTests();
  }, [user, fetchCourse, fetchCrts, fetchChapters, fetchProgressTests]);

  async function addChapter(e) {
    e.preventDefault();
    if (!courseId) return;
    try {
      setChapterSavingId("new");
      await firestoreHelpers.addDoc(
        firestoreHelpers.collection(db, "crtCourses", courseId, "chapters"),
        {
          title: newChapter.title || "",
          topics: newChapter.topics || "",
          video: newChapter.video || "",
          pptUrl: newChapter.pptUrl || "",
          pdfDocument: newChapter.pdfDocument || "",
          liveClassLink: newChapter.liveClassLink || "",
          recordedClassLink: newChapter.recordedClassLink || "",
          classDocs: newChapter.classDocs || "",
          order: Number(newChapter.order) || 1,
          createdAt: new Date().toISOString(),
        }
      );
      setNewChapter({
        title: "",
        topics: "",
        video: "",
        pptUrl: "",
        pdfDocument: "",
        liveClassLink: "",
        recordedClassLink: "",
        classDocs: "",
        order: 1,
      });
      await fetchChapters();
    } finally {
      setChapterSavingId("");
    }
  }

  async function updateChapter(ch) {
    if (!courseId) return;
    try {
      setChapterSavingId(ch.id);
      await firestoreHelpers.updateDoc(
        firestoreHelpers.doc(db, "crtCourses", courseId, "chapters", ch.id),
        {
          title: ch.title || "",
          topics: ch.topics || "",
          video: ch.video || "",
          pptUrl: ch.pptUrl || "",
          pdfDocument: ch.pdfDocument || "",
          liveClassLink: ch.liveClassLink || "",
          recordedClassLink: ch.recordedClassLink || "",
          classDocs: ch.classDocs || "",
          order: Number(ch.order) || 1,
          updatedAt: new Date().toISOString(),
        }
      );
      await fetchChapters();
    } finally {
      setChapterSavingId("");
    }
  }

  async function deleteChapter(id) {
    if (!courseId) return;
    if (!confirm("Delete this chapter?")) return;
    await firestoreHelpers.deleteDoc(
      firestoreHelpers.doc(db, "crtCourses", courseId, "chapters", id)
    );
    await fetchChapters();
  }

  async function addProgressTestForDay(dayNumber, type) {
    if (!courseId) return;
    try {
      const ref = mcqCollection(mcqDb, "copiedcourses", courseId, "assignments");
      await mcqAddDoc(ref, {
        title:
          type === "coding"
            ? `Day ${dayNumber} Coding Test`
            : `Day ${dayNumber} MCQ Test`,
        dueDate: "",
        day: Number(dayNumber) || 1,
        type,
        questions: [],
      });
      await fetchProgressTests();
      alert(
        type === "coding"
          ? `Coding progress test created for Day ${dayNumber}.`
          : `MCQ progress test created for Day ${dayNumber}.`
      );
    } catch (e) {
      console.error("Failed to add progress test:", e);
      alert("Failed to add progress test.");
    }
  }

  async function assignCourseToCrt() {
    if (!selectedCrtId || !courseId) {
      alert("Please select a CRT program.");
      return;
    }
    try {
      setAssigning(true);
      const coursesCol = firestoreHelpers.collection(
        db,
        "crt",
        selectedCrtId,
        "courses"
      );

      // Check if already assigned
      const existingSnap = await firestoreHelpers.getDocs(coursesCol);
      const existingSourceIds = new Set(
        existingSnap.docs.map((d) => d.data().sourceCourseId).filter(Boolean)
      );

      if (existingSourceIds.has(courseId)) {
        alert("This course is already assigned to the selected CRT.");
        return;
      }

      // Get the master course data
      const masterCourseSnap = await firestoreHelpers.getDoc(
        firestoreHelpers.doc(db, "crtCourses", courseId)
      );

      if (masterCourseSnap.exists()) {
        const masterData = masterCourseSnap.data();
        // Create a copy of the course under this CRT
        await firestoreHelpers.addDoc(coursesCol, {
          title: masterData.title || "",
          description: masterData.description || "",
          courseCode: masterData.courseCode || "",
          syllabus: masterData.syllabus || [],
          sourceCourseId: courseId,
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || null,
        });
        alert("Course assigned to CRT successfully!");
        router.push(`/Admin/crt/${selectedCrtId}/manage`);
      }
    } catch (e) {
      console.error("Failed to assign course:", e);
      alert("Failed to assign course to CRT.");
    } finally {
      setAssigning(false);
    }
  }

  function logout() {
    signOut(auth);
  }

  if (loading) return <div>Loading...</div>;
  if (!user || !isAdmin) return <div>Access Denied</div>;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Course Syllabus Days</h1>
          <p className="text-sm text-slate-600">
            {course.title} - Add syllabus days and assign to CRT
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/Admin/crt"
            className="px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200"
          >
            Back
          </Link>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Chapters / Days</h2>
            </div>

            {chapters.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-8">
                No chapters added yet. Use the form below to add the first
                chapter.
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((ch) => {
                    const dayNumber = ch.order || 1;
                    const dayTests = progressTests.filter(
                      (t) => (t.day || 1) === dayNumber
                    );
                    return (
                      <div
                        key={ch.id}
                        className="border rounded-lg p-3 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            className="w-20 border rounded-md px-2 py-1.5 text-sm"
                            value={ch.order || 1}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, order: Number(e.target.value) }
                                    : x
                                )
                              )
                            }
                            placeholder="Day"
                          />
                          <input
                            type="text"
                            className="flex-1 border rounded-md px-3 py-1.5 text-sm"
                            value={ch.title || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, title: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Title"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            className="border rounded-md px-3 py-1.5 text-sm"
                            value={ch.topics || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, topics: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Topics"
                          />
                          <input
                            className="border rounded-md px-3 py-1.5 text-sm"
                            value={ch.video || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, video: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Video URL"
                          />
                          <input
                            className="border rounded-md px-3 py-1.5 text-sm"
                            value={ch.pptUrl || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, pptUrl: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="PPT URL (Google Slides)"
                          />
                          <input
                            className="border rounded-md px-3 py-1.5 text-sm"
                            value={ch.pdfDocument || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, pdfDocument: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="PDF URL (Google Drive)"
                          />
                          <input
                            className="border rounded-md px-3 py-1.5 text-sm"
                            value={ch.liveClassLink || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, liveClassLink: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Live Class Link"
                          />
                          <input
                            className="border rounded-md px-3 py-1.5 text-sm"
                            value={ch.recordedClassLink || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? {
                                        ...x,
                                        recordedClassLink: e.target.value,
                                      }
                                    : x
                                )
                              )
                            }
                            placeholder="Recorded Class Link"
                          />
                          <input
                            className="border rounded-md px-3 py-1.5 text-sm md:col-span-2"
                            value={ch.classDocs || ""}
                            onChange={(e) =>
                              setChapters((cs) =>
                                cs.map((x) =>
                                  x.id === ch.id
                                    ? { ...x, classDocs: e.target.value }
                                    : x
                                )
                              )
                            }
                            placeholder="Docs URL"
                          />
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={chapterSavingId === ch.id}
                            onClick={() => updateChapter(ch)}
                            className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
                          >
                            {chapterSavingId === ch.id ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteChapter(ch.id)}
                            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-2 border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-slate-800">
                              Progress Tests for Day {dayNumber}
                            </h4>
                          </div>
                          {loadingProgressTests ? (
                            <p className="text-xs text-slate-500">
                              Loading progress tests...
                            </p>
                          ) : dayTests.length === 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-500 italic">
                                No progress tests mapped to this day. You can
                                add one here:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    addProgressTestForDay(dayNumber, "mcq")
                                  }
                                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-700"
                                >
                                  + Add MCQ Test
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    addProgressTestForDay(dayNumber, "coding")
                                  }
                                  className="px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700"
                                >
                                  + Add Coding Test
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {dayTests.map((test) => (
                                <div
                                  key={test.id}
                                  className="border rounded-md p-2 bg-slate-50 text-xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                          Day {test.day || dayNumber}
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                                          {test.type === "coding"
                                            ? "Coding"
                                            : "MCQ"}
                                        </span>
                                      </div>
                                      <p className="text-xs font-medium mt-1">
                                        {test.title ||
                                          test.name ||
                                          "Untitled Progress Test"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <form
              onSubmit={addChapter}
              className="mt-6 border-t pt-4 space-y-3"
            >
              <h4 className="font-medium">Add Chapter</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.title}
                  onChange={(e) =>
                    setNewChapter((s) => ({ ...s, title: e.target.value }))
                  }
                  placeholder="Title"
                />
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.topics}
                  onChange={(e) =>
                    setNewChapter((s) => ({ ...s, topics: e.target.value }))
                  }
                  placeholder="Topics"
                />
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.video}
                  onChange={(e) =>
                    setNewChapter((s) => ({ ...s, video: e.target.value }))
                  }
                  placeholder="Video URL"
                />
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.pptUrl}
                  onChange={(e) =>
                    setNewChapter((s) => ({ ...s, pptUrl: e.target.value }))
                  }
                  placeholder="PPT URL (Google Slides)"
                />
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.pdfDocument}
                  onChange={(e) =>
                    setNewChapter((s) => ({
                      ...s,
                      pdfDocument: e.target.value,
                    }))
                  }
                  placeholder="PDF URL (Google Drive)"
                />
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.liveClassLink}
                  onChange={(e) =>
                    setNewChapter((s) => ({
                      ...s,
                      liveClassLink: e.target.value,
                    }))
                  }
                  placeholder="Live Class Link"
                />
                <input
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.recordedClassLink}
                  onChange={(e) =>
                    setNewChapter((s) => ({
                      ...s,
                      recordedClassLink: e.target.value,
                    }))
                  }
                  placeholder="Recorded Class Link"
                />
                <input
                  className="border rounded-md px-3 py-2 text-sm md:col-span-2"
                  value={newChapter.classDocs}
                  onChange={(e) =>
                    setNewChapter((s) => ({
                      ...s,
                      classDocs: e.target.value,
                    }))
                  }
                  placeholder="Docs URL"
                />
                <input
                  type="number"
                  className="border rounded-md px-3 py-2 text-sm"
                  value={newChapter.order}
                  onChange={(e) =>
                    setNewChapter((s) => ({
                      ...s,
                      order: Number(e.target.value),
                    }))
                  }
                  placeholder="Day / Order"
                />
              </div>
              <div>
                <button
                  disabled={chapterSavingId === "new"}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50 text-sm"
                >
                  {chapterSavingId === "new" ? "Adding..." : "Add Chapter"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold mb-4">Course Information</h2>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-slate-600">Title</label>
                <div className="text-base font-medium">{course.title}</div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Course Code</label>
                <div className="text-base">{course.courseCode || "N/A"}</div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Description</label>
                <div className="text-base text-slate-700">
                  {course.description || "No description"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-semibold mb-4">Assign to CRT</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 mb-2 block">
                  Select CRT Program
                </label>
                <select
                  value={selectedCrtId}
                  onChange={(e) => setSelectedCrtId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2"
                >
                  <option value="">Choose CRT...</option>
                  {crts.map((crt) => (
                    <option key={crt.id} value={crt.id}>
                      {crt.name || crt.id}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={assignCourseToCrt}
                disabled={!selectedCrtId || assigning}
                className="w-full px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
              >
                {assigning ? "Assigning..." : "Assign Course to CRT"}
              </button>
              {selectedCrtId && (
                <Link
                  href={`/Admin/crt/${selectedCrtId}/manage`}
                  className="block text-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Manage CRT Courses
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-semibold mb-2 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/Admin/crt"
                className="block w-full text-center px-3 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-sm"
              >
                Back to CRT Manager
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
