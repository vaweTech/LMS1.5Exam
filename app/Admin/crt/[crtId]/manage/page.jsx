"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { auth, db, firestoreHelpers } from "../../../../../lib/firebase";
import { mcqDb } from "../../../../../lib/firebaseMCQs";
import {
  collection as mcqCollection,
  getDocs as mcqGetDocs,
  doc as mcqDoc,
  updateDoc as mcqUpdateDoc,
  deleteDoc as mcqDeleteDoc,
  addDoc as mcqAddDoc,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function ManageCRTCourses() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();
  const crtId = params?.crtId;
  const initialCourseId = search?.get("course") || "";

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [crtCourses, setCrtCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(initialCourseId);

  const [course, setCourse] = useState(null);
  const [savingCourse, setSavingCourse] = useState(false);

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
  const [progressTests, setProgressTests] = useState([]);
  const [loadingProgressTests, setLoadingProgressTests] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);
  const [editingTest, setEditingTest] = useState(null);
  const [questionEditTestId, setQuestionEditTestId] = useState(null);
  const [questionDrafts, setQuestionDrafts] = useState([]);
  const [removingCourseId, setRemovingCourseId] = useState("");
  const [expandedChapterId, setExpandedChapterId] = useState(null);

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

  const fetchCrtCourses = useCallback(async function fetchCrtCourses() {
    if (!crtId) return;
    const snap = await firestoreHelpers.getDocs(
      firestoreHelpers.collection(db, "crt", crtId, "courses")
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setCrtCourses(list);
    if (!activeCourseId && list.length > 0) {
      const fromUrl = initialCourseId && list.find((c) => c.id === initialCourseId);
      if (fromUrl) {
        setActiveCourseId(fromUrl.id);
      } else {
        setActiveCourseId(list[0].id);
      }
    }
  }, [crtId, activeCourseId, initialCourseId]);

  const fetchCourseAndChapters = useCallback(
    async function fetchCourseAndChapters(courseId) {
      if (!crtId || !courseId) return;
      const [courseSnap, chapterSnap] = await Promise.all([
        firestoreHelpers.getDoc(
          firestoreHelpers.doc(db, "crt", crtId, "courses", courseId)
        ),
        firestoreHelpers.getDocs(
          firestoreHelpers.collection(
            db,
            "crt",
            crtId,
            "courses",
            courseId,
            "chapters"
          )
        ),
      ]);

      if (courseSnap.exists()) {
        const data = courseSnap.data();
        setCourse({
          id: courseSnap.id,
          title: data.title || "",
          description: data.description || "",
          courseCode: data.courseCode || "",
          syllabus: Array.isArray(data.syllabus) ? data.syllabus : [],
          sourceCourseId: data.sourceCourseId || "",
        });
      }

      const list = chapterSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setChapters(list);
    },
    [crtId]
  );

  useEffect(() => {
    if (!crtId || !user) return;
    fetchCrtCourses();
  }, [crtId, user, fetchCrtCourses]);

  useEffect(() => {
    if (!activeCourseId) return;
    fetchCourseAndChapters(activeCourseId);
  }, [activeCourseId, fetchCourseAndChapters]);

  async function fetchChapters(courseId) {
    if (!crtId || !courseId) return;
    const snap = await firestoreHelpers.getDocs(
      firestoreHelpers.collection(
        db,
        "crt",
        crtId,
        "courses",
        courseId,
        "chapters"
      )
    );
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (a.order || 0) - (b.order || 0));
    setChapters(list);
  }

  useEffect(() => {
    async function fetchProgressTests() {
      try {
        if (!course || !course.id) {
          setProgressTests([]);
          return;
        }
        const courseIdToUse = course.id;
        setLoadingProgressTests(true);
        const snap = await mcqGetDocs(
          mcqCollection(mcqDb, "copiedcourses", courseIdToUse, "assignments")
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
    }
    fetchProgressTests();
  }, [course]);

  async function saveCourse(e) {
    e.preventDefault();
    if (!course || !crtId) return;
    try {
      setSavingCourse(true);
      await firestoreHelpers.updateDoc(
        firestoreHelpers.doc(db, "crt", crtId, "courses", course.id),
        {
          title: course.title,
          description: course.description,
          courseCode: course.courseCode,
          syllabus:
            typeof course.syllabus === "string"
              ? course.syllabus.split(",").map((s) => s.trim()).filter(Boolean)
              : course.syllabus || [],
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || null,
        }
      );
      await fetchCrtCourses();
      alert("Course saved.");
    } finally {
      setSavingCourse(false);
    }
  }

  async function addChapter(e) {
    e.preventDefault();
    if (!crtId || !activeCourseId) return;
    try {
      setChapterSavingId("new");
      await firestoreHelpers.addDoc(
        firestoreHelpers.collection(
          db,
          "crt",
          crtId,
          "courses",
          activeCourseId,
          "chapters"
        ),
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
      await fetchChapters(activeCourseId);
    } finally {
      setChapterSavingId("");
    }
  }

  async function updateChapter(ch) {
    if (!crtId || !activeCourseId) return;
    try {
      setChapterSavingId(ch.id);
      await firestoreHelpers.updateDoc(
        firestoreHelpers.doc(
          db,
          "crt",
          crtId,
          "courses",
          activeCourseId,
          "chapters",
          ch.id
        ),
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
      await fetchChapters(activeCourseId);
    } finally {
      setChapterSavingId("");
    }
  }

  async function deleteChapter(id) {
    if (!crtId || !activeCourseId) return;
    if (!confirm("Delete this chapter?")) return;
    await firestoreHelpers.deleteDoc(
      firestoreHelpers.doc(
        db,
        "crt",
        crtId,
        "courses",
        activeCourseId,
        "chapters",
        id
      )
    );
    await fetchChapters(activeCourseId);
  }

  async function removeCourseFromCrt(courseId) {
    if (!crtId || !courseId) return;
    if (!confirm("Remove this course from CRT? This will delete the course copy and all its chapters.")) return;
    try {
      setRemovingCourseId(courseId);
      
      // Delete chapters
      const chaptersSnap = await firestoreHelpers.getDocs(
        firestoreHelpers.collection(
          db,
          "crt",
          crtId,
          "courses",
          courseId,
          "chapters"
        )
      );
      for (const ch of chaptersSnap.docs) {
        await firestoreHelpers.deleteDoc(ch.ref);
      }
      
      // Delete assignments/progress tests
      try {
        const assignmentsSnap = await mcqGetDocs(
          mcqCollection(mcqDb, "copiedcourses", courseId, "assignments")
        );
        for (const assignmentDoc of assignmentsSnap.docs) {
          await mcqDeleteDoc(
            mcqDoc(mcqDb, "copiedcourses", courseId, "assignments", assignmentDoc.id)
          );
        }
      } catch (assignError) {
        console.error("Error deleting assignments:", assignError);
      }
      
      // Delete the course copy
      await firestoreHelpers.deleteDoc(
        firestoreHelpers.doc(db, "crt", crtId, "courses", courseId)
      );
      
      await fetchCrtCourses();
      if (activeCourseId === courseId && crtCourses.length > 1) {
        const remaining = crtCourses.filter((c) => c.id !== courseId);
        if (remaining.length > 0) {
          setActiveCourseId(remaining[0].id);
        } else {
          setActiveCourseId("");
          setCourse(null);
          setChapters([]);
        }
      }
      alert("Course removed from CRT.");
    } catch (e) {
      console.error(e);
      alert("Failed to remove course from CRT.");
    } finally {
      setRemovingCourseId("");
    }
  }

  async function saveProgressTestMeta() {
    if (!course || !course.id || !editingTestId || !editingTest) return;
    const courseIdToUse = course.id;
    try {
      const ref = mcqDoc(
        mcqDb,
        "copiedcourses",
        courseIdToUse,
        "assignments",
        editingTestId
      );
      await mcqUpdateDoc(ref, {
        title: editingTest.title || "",
        dueDate: editingTest.dueDate || "",
        day: Number(editingTest.day) || 1,
        type: editingTest.type || "mcq",
      });
      alert("Progress test updated.");
      setEditingTestId(null);
      setEditingTest(null);
      const snap = await mcqGetDocs(
        mcqCollection(mcqDb, "copiedcourses", courseIdToUse, "assignments")
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.day || 0) - (b.day || 0));
      setProgressTests(list);
    } catch (e) {
      console.error("Failed to update progress test:", e);
      alert("Failed to update progress test.");
    }
  }

  async function deleteProgressTest(id) {
    if (!course || !course.id || !id) return;
    const courseIdToUse = course.id;
    if (!confirm("Delete this progress test?")) return;
    try {
      const ref = mcqDoc(mcqDb, "copiedcourses", courseIdToUse, "assignments", id);
      await mcqDeleteDoc(ref);
      setProgressTests((prev) => prev.filter((t) => t.id !== id));
      if (editingTestId === id) {
        setEditingTestId(null);
        setEditingTest(null);
      }
      alert("Progress test deleted.");
    } catch (e) {
      console.error("Failed to delete progress test:", e);
      alert("Failed to delete progress test.");
    }
  }

  async function addProgressTestForDay(dayNumber, type) {
    if (!course || !course.id) return;
    const courseIdToUse = course.id;
    try {
      const ref = mcqCollection(mcqDb, "copiedcourses", courseIdToUse, "assignments");
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
      const snap = await mcqGetDocs(
        mcqCollection(mcqDb, "copiedcourses", courseIdToUse, "assignments")
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.day || 0) - (b.day || 0));
      setProgressTests(list);
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

  async function saveTestQuestions() {
    if (!course || !course.id || !questionEditTestId) return;
    const courseIdToUse = course.id;
    try {
      const ref = mcqDoc(
        mcqDb,
        "copiedcourses",
        courseIdToUse,
        "assignments",
        questionEditTestId
      );
      await mcqUpdateDoc(ref, {
        questions: Array.isArray(questionDrafts) ? questionDrafts : [],
      });
      alert("Questions updated.");
      setQuestionEditTestId(null);
      setQuestionDrafts([]);
      const snap = await mcqGetDocs(
        mcqCollection(mcqDb, "copiedcourses", courseIdToUse, "assignments")
      );
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.day || 0) - (b.day || 0));
      setProgressTests(list);
    } catch (e) {
      console.error("Failed to update questions:", e);
      alert("Failed to update questions.");
    }
  }

  function logout() {
    signOut(auth);
  }

  if (loading) return <div>Loading...</div>;
  if (!user || !isAdmin) return <div>Access Denied</div>;

  const syllabusText = Array.isArray(course?.syllabus)
    ? course.syllabus.join(", ")
    : course?.syllabus || "";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage CRT Courses</h1>
          <p className="text-sm text-slate-600">
            Select a course on the left to edit it.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/Admin/crt`}
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
        <aside className="lg:col-span-1 rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Courses in CRT</h2>
          <div className="space-y-2">
            {crtCourses.length === 0 && (
              <div className="text-sm text-slate-500">No courses assigned.</div>
            )}
            {crtCourses.map((c) => (
              <div
                key={c.id}
                className={`border rounded-md px-3 py-2 flex items-center justify-between ${activeCourseId === c.id ? "bg-blue-50 border-blue-200" : ""}`}
              >
                <button
                  onClick={() => {
                    setActiveCourseId(c.id);
                    router.push(
                      `/Admin/crt/${crtId}/manage?course=${c.id}`
                    );
                  }}
                  className="text-left flex-1"
                >
                  <div className="font-medium">{c.title || "Untitled"}</div>
                  <div className="text-xs text-slate-500">
                    {c.courseCode || "No code"}
                  </div>
                </button>
                <button
                  onClick={() => removeCourseFromCrt(c.id)}
                  disabled={removingCourseId === c.id}
                  className="px-2 py-1 rounded-md bg-red-600 text-white text-xs disabled:opacity-50 ml-2"
                >
                  {removingCourseId === c.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-2 rounded-xl border bg-white p-4">
          {!activeCourseId || !course ? (
            <div className="text-sm text-slate-500">
              Select a course from the left to begin editing.
            </div>
          ) : (
            <>
              <form onSubmit={saveCourse} className="rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600">Title</label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={course.title}
                      onChange={(e) =>
                        setCourse((s) => ({ ...s, title: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Course Code</label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={course.courseCode}
                      onChange={(e) =>
                        setCourse((s) => ({ ...s, courseCode: e.target.value }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600">Description</label>
                    <textarea
                      rows={3}
                      className="w-full border rounded-md px-3 py-2"
                      value={course.description}
                      onChange={(e) =>
                        setCourse((s) => ({
                          ...s,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600">
                      Syllabus (comma-separated)
                    </label>
                    <input
                      className="w-full border rounded-md px-3 py-2"
                      value={syllabusText}
                      onChange={(e) =>
                        setCourse((s) => ({ ...s, syllabus: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    disabled={savingCourse}
                    className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-50"
                  >
                    {savingCourse ? "Saving..." : "Save Course"}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="mb-2">
                  <h3 className="font-semibold">Chapters / Days</h3>
                </div>
                <div className="space-y-2">
                  {chapters.map((ch) => {
                    const dayNumber = ch.order || 1;
                    const dayTests = progressTests.filter(
                      (t) => (t.day || 1) === dayNumber
                    );
                    const isExpanded = expandedChapterId === ch.id;
                    return (
                      <div key={ch.id} className="border rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedChapterId((id) =>
                              id === ch.id ? null : ch.id
                            )
                          }
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100"
                        >
                          <span className="font-medium text-slate-800">
                            Day {dayNumber}
                            {ch.title ? `: ${ch.title}` : ""}
                          </span>
                          <span
                            className={`text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            aria-hidden
                          >
                            ▼
                          </span>
                        </button>

                        {isExpanded && (
                        <div className="p-3 space-y-3 border-t-0">
                        <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
                        <input
                          className="border rounded-md px-3 py-2"
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
                        <br/>
                        <textarea
                          rows={3}
                          className="border rounded-md px-3 py-2 w-full min-h-[80px] resize-y md:col-span-8"
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
                          placeholder={"e.g. This chapter covers:\nTopic one\nTopic two\n..."}
                        /><br/>
                        <input
                          className="border rounded-md px-3 py-2"
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
                          className="border rounded-md px-3 py-2"
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
                          className="border rounded-md px-3 py-2"
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
                          className="border rounded-md px-3 py-2"
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
                          className="border rounded-md px-3 py-2"
                          value={ch.recordedClassLink || ""}
                          onChange={(e) =>
                            setChapters((cs) =>
                              cs.map((x) =>
                                x.id === ch.id
                                  ? { ...x, recordedClassLink: e.target.value }
                                  : x
                              )
                            )
                          }
                          placeholder="Recorded Class Link"
                        />
                        <input
                          className="border rounded-md px-3 py-2"
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
                        <input
                          type="number"
                          className="border rounded-md px-3 py-2"
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
                          placeholder="Order"
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={chapterSavingId === ch.id}
                          onClick={() => updateChapter(ch)}
                          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
                        >
                          {chapterSavingId === ch.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => deleteChapter(ch.id)}
                          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm"
                        >
                          Delete
                        </button>
                        {ch.pdfDocument && (
                          <a
                            href={ch.pdfDocument}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-md bg-slate-100 text-sm"
                          >
                            View PDF
                          </a>
                        )}
                        {ch.liveClassLink && (
                          <a
                            href={ch.liveClassLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-md bg-slate-100 text-sm"
                          >
                            Live Link
                          </a>
                        )}
                        {ch.recordedClassLink && (
                          <a
                            href={ch.recordedClassLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-md bg-slate-100 text-sm"
                          >
                            Recorded Video
                          </a>
                        )}
                      </div>

                      {/* Day-wise progress tests for this chapter */}
                      <div className="mt-4 border-t pt-3">
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
                                No progress tests mapped to this day.
                                You can add one here:
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
                                  className="border rounded-md p-2 bg-slate-50"
                                >
                                  {editingTestId === test.id ? (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                        <input
                                          className="border rounded-md px-2 py-1 text-xs"
                                          value={editingTest?.title || ""}
                                          onChange={(e) =>
                                            setEditingTest((s) => ({
                                              ...s,
                                              title: e.target.value,
                                            }))
                                          }
                                          placeholder="Title"
                                        />
                                        <input
                                          type="date"
                                          className="border rounded-md px-2 py-1 text-xs"
                                          value={editingTest?.dueDate || ""}
                                          onChange={(e) =>
                                            setEditingTest((s) => ({
                                              ...s,
                                              dueDate: e.target.value,
                                            }))
                                          }
                                        />
                                        <input
                                          type="number"
                                          className="border rounded-md px-2 py-1 text-xs"
                                          value={editingTest?.day || dayNumber}
                                          onChange={(e) =>
                                            setEditingTest((s) => ({
                                              ...s,
                                              day: Number(e.target.value) || 1,
                                            }))
                                          }
                                          placeholder="Day"
                                        />
                                        <select
                                          className="border rounded-md px-2 py-1 text-xs"
                                          value={editingTest?.type || "mcq"}
                                          onChange={(e) =>
                                            setEditingTest((s) => ({
                                              ...s,
                                              type: e.target.value,
                                            }))
                                          }
                                        >
                                          <option value="mcq">MCQ</option>
                                          <option value="coding">Coding</option>
                                        </select>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={saveProgressTestMeta}
                                          className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs"
                                        >
                                          Save
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingTestId(null);
                                            setEditingTest(null);
                                          }}
                                          className="px-3 py-1.5 rounded-md bg-slate-400 text-white text-xs"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
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
                                          {test.dueDate && (
                                            <p className="text-[11px] text-slate-500">
                                              Due: {test.dueDate}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingTestId(test.id);
                                              setEditingTest({
                                                title:
                                                  test.title ||
                                                  test.name ||
                                                  "",
                                                dueDate: test.dueDate || "",
                                                day: test.day || dayNumber,
                                                type: test.type || "mcq",
                                              });
                                            }}
                                            className="px-2 py-1 rounded-md bg-yellow-500 text-white text-[11px]"
                                          >
                                            Edit Meta
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              deleteProgressTest(test.id)
                                            }
                                            className="px-2 py-1 rounded-md bg-red-600 text-white text-[11px]"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (questionEditTestId === test.id) {
                                              setQuestionEditTestId(null);
                                              setQuestionDrafts([]);
                                            } else {
                                              setQuestionEditTestId(test.id);
                                              setQuestionDrafts(
                                                Array.isArray(test.questions)
                                                  ? test.questions
                                                  : []
                                              );
                                            }
                                          }}
                                          className="px-2 py-1 rounded-md bg-slate-200 text-slate-800 text-[11px]"
                                        >
                                          {questionEditTestId === test.id
                                            ? "Close Questions Editor"
                                            : "Edit / Add Questions"}
                                        </button>
                                      </div>

                                      {questionEditTestId === test.id && (
                                        <div className="mt-2 border-t pt-2 space-y-2">
                                          <p className="text-[11px] font-semibold text-slate-700">
                                            Questions ({questionDrafts.length})
                                          </p>

                                          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                                            {questionDrafts.map((q, qIndex) => (
                                              <div
                                                key={qIndex}
                                                className="bg-white rounded border px-2 py-2 space-y-1"
                                              >
                                                <div className="flex justify-between items-center">
                                                  <span className="text-[11px] font-medium text-slate-800">
                                                    Q{qIndex + 1} •{" "}
                                                    {(q.type || test.type || "mcq").toUpperCase()}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const next = questionDrafts.filter(
                                                        (_qq, idx) => idx !== qIndex
                                                      );
                                                      setQuestionDrafts(next);
                                                    }}
                                                    className="text-[11px] text-red-600"
                                                  >
                                                    Remove
                                                  </button>
                                                </div>

                                                {(q.type || test.type) !== "coding" && (
                                                  <div className="space-y-1">
                                                    <textarea
                                                      className="border rounded px-2 py-1 w-full text-[11px]"
                                                      rows={2}
                                                      placeholder="Question text"
                                                      value={q.question || ""}
                                                      onChange={(e) => {
                                                        const next = [...questionDrafts];
                                                        next[qIndex] = {
                                                          ...next[qIndex],
                                                          type: "mcq",
                                                          question: e.target.value,
                                                        };
                                                        setQuestionDrafts(next);
                                                      }}
                                                    />
                                                    <p className="text-[10px] text-slate-500">
                                                      Options & correct answers:
                                                    </p>
                                                    {Array.from(
                                                      { length: 4 },
                                                      (_, optIdx) =>
                                                        q.options?.[optIdx] ?? ""
                                                    ).map((opt, optIdx) => (
                                                      <div
                                                        key={optIdx}
                                                        className="flex items-center gap-1 mb-0.5"
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          className="w-3 h-3"
                                                          checked={Array.isArray(
                                                            q.correctAnswers
                                                          )
                                                            ? q.correctAnswers.includes(
                                                                optIdx
                                                              )
                                                            : false}
                                                          onChange={() => {
                                                            const next = [...questionDrafts];
                                                            const current =
                                                              Array.isArray(
                                                                next[qIndex]
                                                                  .correctAnswers
                                                              )
                                                                ? [
                                                                    ...next[qIndex]
                                                                      .correctAnswers,
                                                                  ]
                                                                : [];
                                                            const exists =
                                                              current.includes(
                                                                optIdx
                                                              );
                                                            next[qIndex] = {
                                                              ...next[qIndex],
                                                              type: "mcq",
                                                              correctAnswers: exists
                                                                ? current.filter(
                                                                    (i) => i !== optIdx
                                                                  )
                                                                : [...current, optIdx],
                                                            };
                                                            setQuestionDrafts(next);
                                                          }}
                                                        />
                                                        <input
                                                          className="border rounded px-2 py-0.5 flex-1 text-[11px]"
                                                          placeholder={`Option ${
                                                            optIdx + 1
                                                          }`}
                                                          value={opt}
                                                          onChange={(e) => {
                                                            const next = [...questionDrafts];
                                                            const opts =
                                                              Array.isArray(
                                                                next[qIndex].options
                                                              )
                                                                ? [
                                                                    ...next[qIndex]
                                                                      .options,
                                                                  ]
                                                                : [];
                                                            opts[optIdx] =
                                                              e.target.value;
                                                            next[qIndex] = {
                                                              ...next[qIndex],
                                                              type: "mcq",
                                                              options: opts,
                                                            };
                                                            setQuestionDrafts(next);
                                                          }}
                                                        />
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                {(q.type || test.type) === "coding" && (
                                                  <div className="space-y-1">
                                                    <input
                                                      className="border rounded px-2 py-1 w-full text-[11px]"
                                                      placeholder="Coding question title"
                                                      value={q.question || ""}
                                                      onChange={(e) => {
                                                        const next = [...questionDrafts];
                                                        next[qIndex] = {
                                                          ...next[qIndex],
                                                          type: "coding",
                                                          question: e.target.value,
                                                        };
                                                        setQuestionDrafts(next);
                                                      }}
                                                    />
                                                    <textarea
                                                      className="border rounded px-2 py-1 w-full text-[11px] font-mono"
                                                      rows={3}
                                                      placeholder="Description"
                                                      value={q.description || ""}
                                                      onChange={(e) => {
                                                        const next = [...questionDrafts];
                                                        next[qIndex] = {
                                                          ...next[qIndex],
                                                          type: "coding",
                                                          description: e.target.value,
                                                        };
                                                        setQuestionDrafts(next);
                                                      }}
                                                    />
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                      Test cases:
                                                    </p>
                                                    {Array.isArray(q.testCases) &&
                                                      q.testCases.map(
                                                        (tc, tcIdx) => (
                                                          <div
                                                            key={tcIdx}
                                                            className="border rounded px-2 py-1 mb-1 bg-slate-50"
                                                          >
                                                            <p className="text-[10px] font-medium">
                                                              Test Case {tcIdx + 1}
                                                            </p>
                                                            <textarea
                                                              className="border rounded px-2 py-1 w-full text-[10px] font-mono mb-1"
                                                              rows={2}
                                                              placeholder="Input"
                                                              value={tc.input || ""}
                                                              onChange={(e) => {
                                                                const next = [...questionDrafts];
                                                                const tcs =
                                                                  Array.isArray(
                                                                    next[qIndex]
                                                                      .testCases
                                                                  )
                                                                    ? [
                                                                        ...next[
                                                                          qIndex
                                                                        ].testCases,
                                                                      ]
                                                                    : [];
                                                                tcs[tcIdx] = {
                                                                  ...tcs[tcIdx],
                                                                  input:
                                                                    e.target
                                                                      .value,
                                                                };
                                                                next[qIndex] = {
                                                                  ...next[qIndex],
                                                                  type: "coding",
                                                                  testCases: tcs,
                                                                };
                                                                setQuestionDrafts(
                                                                  next
                                                                );
                                                              }}
                                                            />
                                                            <textarea
                                                              className="border rounded px-2 py-1 w-full text-[10px] font-mono"
                                                              rows={2}
                                                              placeholder="Expected Output"
                                                              value={
                                                                tc.expectedOutput ||
                                                                ""
                                                              }
                                                              onChange={(e) => {
                                                                const next = [...questionDrafts];
                                                                const tcs =
                                                                  Array.isArray(
                                                                    next[qIndex]
                                                                      .testCases
                                                                  )
                                                                    ? [
                                                                        ...next[
                                                                          qIndex
                                                                        ].testCases,
                                                                      ]
                                                                    : [];
                                                                tcs[tcIdx] = {
                                                                  ...tcs[tcIdx],
                                                                  expectedOutput:
                                                                    e.target
                                                                      .value,
                                                                };
                                                                next[qIndex] = {
                                                                  ...next[qIndex],
                                                                  type: "coding",
                                                                  testCases: tcs,
                                                                };
                                                                setQuestionDrafts(
                                                                  next
                                                                );
                                                              }}
                                                            />
                                                          </div>
                                                        )
                                                      )}
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const next = [...questionDrafts];
                                                        const tcs =
                                                          Array.isArray(
                                                            next[qIndex].testCases
                                                          )
                                                            ? [
                                                                ...next[qIndex]
                                                                  .testCases,
                                                              ]
                                                            : [];
                                                        tcs.push({
                                                          input: "",
                                                          expectedOutput: "",
                                                        });
                                                        next[qIndex] = {
                                                          ...next[qIndex],
                                                          type: "coding",
                                                          testCases: tcs,
                                                        };
                                                        setQuestionDrafts(next);
                                                      }}
                                                      className="mt-1 px-2 py-0.5 rounded-md bg-blue-500 text-white text-[10px]"
                                                    >
                                                      Add Test Case
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>

                                          <div className="flex gap-2 mt-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setQuestionDrafts((prev) => [
                                                  ...prev,
                                                  {
                                                    type: "mcq",
                                                    question: "",
                                                    options: ["", "", "", ""],
                                                    correctAnswers: [],
                                                  },
                                                ]);
                                              }}
                                              className="px-2 py-1 rounded-md bg-green-500 text-white text-[11px]"
                                            >
                                              + MCQ Question
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setQuestionDrafts((prev) => [
                                                  ...prev,
                                                  {
                                                    type: "coding",
                                                    question: "",
                                                    description: "",
                                                    testCases: [],
                                                  },
                                                ]);
                                              }}
                                              className="px-2 py-1 rounded-md bg-purple-500 text-white text-[11px]"
                                            >
                                              + Coding Question
                                            </button>
                                            <button
                                              type="button"
                                              onClick={saveTestQuestions}
                                              className="ml-auto px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[11px]"
                                            >
                                              Save All Questions
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={addChapter} className="mt-6 border-t pt-4 space-y-3">
                  <h4 className="font-medium">Add Chapter</h4>
                  <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
                    <input
                      className="border rounded-md px-3 py-2"
                      value={newChapter.title}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, title: e.target.value }))
                      }
                      placeholder="Title"
                    />
                    <br/>
                    <textarea
                      rows={3}
                      className="border rounded-md px-3 py-2 w-full min-h-[80px] resize-y md:col-span-8"
                      value={newChapter.topics}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, topics: e.target.value }))
                      }
                      placeholder={"e.g. This chapter covers:\nTopic one\nTopic two\n..."}
                    /><br/>
                    <input
                      className="border rounded-md px-3 py-2"
                      value={newChapter.video}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, video: e.target.value }))
                      }
                      placeholder="Video URL"
                    />
                    <input
                      className="border rounded-md px-3 py-2"
                      value={newChapter.pptUrl}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, pptUrl: e.target.value }))
                      }
                      placeholder="PPT URL (Google Slides)"
                    />
                    <input
                      className="border rounded-md px-3 py-2"
                      value={newChapter.pdfDocument}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, pdfDocument: e.target.value }))
                      }
                      placeholder="PDF URL (Google Drive)"
                    />
                    <input
                      className="border rounded-md px-3 py-2"
                      value={newChapter.liveClassLink}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, liveClassLink: e.target.value }))
                      }
                      placeholder="Live Class Link"
                    />
                    <input
                      className="border rounded-md px-3 py-2"
                      value={newChapter.recordedClassLink}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, recordedClassLink: e.target.value }))
                      }
                      placeholder="Recorded Class Link"
                    />
                    <input
                      className="border rounded-md px-3 py-2"
                      value={newChapter.classDocs}
                      onChange={(e) =>
                        setNewChapter((s) => ({ ...s, classDocs: e.target.value }))
                      }
                      placeholder="Docs URL"
                    />
                    <input
                      type="number"
                      className="border rounded-md px-3 py-2"
                      value={newChapter.order}
                      onChange={(e) =>
                        setNewChapter((s) => ({
                          ...s,
                          order: Number(e.target.value),
                        }))
                      }
                      placeholder="Order"
                    />
                  </div>
                  <div>
                    <button
                      disabled={chapterSavingId === "new"}
                      className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
                    >
                      {chapterSavingId === "new" ? "Adding..." : "Add Chapter"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
