"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import CheckAuth from "../../lib/CheckAuth";
import { db, auth, isFirebaseConfigured } from "../../lib/firebase";
import { createSlug } from "../../lib/urlUtils";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { resolveCrtAndCourse } from "../../lib/crtCourseResolve";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  BookOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChartBarIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockOpenIcon,
  LockClosedIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  LinkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

const CARD_STYLES = [
  { color: "from-emerald-500 to-teal-600", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  { color: "from-violet-500 to-purple-600", iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  { color: "from-amber-500 to-orange-600", iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  { color: "from-sky-500 to-blue-600", iconBg: "bg-sky-100", iconColor: "text-sky-600" },
  { color: "from-rose-500 to-pink-600", iconBg: "bg-rose-100", iconColor: "text-rose-600" },
  { color: "from-slate-500 to-slate-600", iconBg: "bg-slate-100", iconColor: "text-slate-600" },
];

/**
 * Batches with trainerId === trainerUid; one card per visible course for that batch.
 * - Skips batch when `showClass === false` (admin can hide until ready).
 * - If batch has `assignedCourseIds` / `courseIds` / `visibleCourseIds` (non-empty array), only those courses are listed.
 */
async function fetchAssignmentsForTrainer(db, trainerUid) {
  const assignments = [];
  const programsSnap = await getDocs(collection(db, "crt"));
  let styleIdx = 0;
  for (const progDoc of programsSnap.docs) {
    const programId = progDoc.id;
    const programData = progDoc.data();
    const programName = programData.name || programId;
    const batchesSnap = await getDocs(collection(db, "crt", programId, "batches"));
    for (const batchDoc of batchesSnap.docs) {
      const batch = batchDoc.data();
      if (batch.trainerId !== trainerUid) continue;
      /** Admin-controlled: omit batch from trainer panel when explicitly false */
      if (batch.showClass === false) continue;
      const batchId = batchDoc.id;
      const courseIdAllowList = (() => {
        const raw =
          batch.assignedCourseIds ?? batch.visibleCourseIds ?? batch.courseIds;
        if (!Array.isArray(raw) || raw.length === 0) return null;
        return new Set(raw.map((id) => String(id)));
      })();
      let studentsCount = 0;
      try {
        const stSnap = await getDocs(
          collection(db, "crt", programId, "batches", batchId, "students")
        );
        studentsCount = stSnap.size;
      } catch (_) {
        /* optional subcollection */
      }
      const coursesSnap = await getDocs(collection(db, "crt", programId, "courses"));
      for (const courseDoc of coursesSnap.docs) {
        const courseId = courseDoc.id;
        if (courseIdAllowList && !courseIdAllowList.has(String(courseId))) continue;
        const course = courseDoc.data();
        const title = course.title || course.name || "Untitled course";
        let chapterCount = 0;
        try {
          const chSnap = await getDocs(
            collection(db, "crt", programId, "courses", courseId, "chapters")
          );
          chapterCount = chSnap.size;
        } catch (_) {}
        const style = CARD_STYLES[styleIdx % CARD_STYLES.length];
        styleIdx += 1;
        const rawStatus = (batch.status || "active").toLowerCase();
        const status = rawStatus === "completed" ? "completed" : "active";
        assignments.push({
          id: `${programId}__${batchId}__${courseId}`,
          programId,
          programName,
          programSlug: createSlug(programName) || programId,
          batchId,
          batchName: batch.name || batchId,
          courseId,
          courseName: title,
          courseSlug: createSlug(title) || courseId,
          schedule: batch.schedule || batch.classSchedule || "—",
          time: batch.time || batch.classTime || "—",
          startDate: batch.startDate || batch.start || "",
          endDate: batch.endDate || batch.end || "",
          studentsCount,
          totalSessions:
            typeof course.totalSessions === "number" ? course.totalSessions : chapterCount,
          completedSessions:
            typeof batch.completedSessions === "number" ? batch.completedSessions : 0,
          status,
          ...style,
        });
      }
    }
  }
  return assignments.sort((a, b) =>
    `${a.programName} ${a.batchName} ${a.courseName}`.localeCompare(
      `${b.programName} ${b.batchName} ${b.courseName}`
    )
  );
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function progressPercent(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

/** Combined sessions progress across course rows in one batch. */
function programAggregateProgress(classes) {
  let completed = 0;
  let total = 0;
  for (const c of classes) {
    completed += Number(c.completedSessions) || 0;
    total += Number(c.totalSessions) || 0;
  }
  const pct = progressPercent(completed, total);
  return { pct, completed, total };
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const TRAINER_ROLES = ["crtTrainer", "trainer", "admin", "superadmin"];

export default function CRTTrainerPage() {
  const [filter, setFilter] = useState("all");
  const [activeModal, setActiveModal] = useState(null); // 'attendance' | 'unlock' | 'notes'
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState(null);
  const [authUid, setAuthUid] = useState(null);
  const [viewerRole, setViewerRole] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [studentsByAssignment, setStudentsByAssignment] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [referenceNotes, setReferenceNotes] = useState([]);
  const [loadingReferenceNotes, setLoadingReferenceNotes] = useState(false);
  // attendance: assignment id -> student row id -> present (true/false)
  const [attendance, setAttendance] = useState({});
  /** Firestore-backed unlock list for the open "Unlock class" modal (chapter doc ids). */
  const [unlockSnapshotIds, setUnlockSnapshotIds] = useState([]);
  const [unlockMeta, setUnlockMeta] = useState(null); // { crtId, courseId, chapters }
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  // Dummy state: shared note ids per class key -> Set of noteIds
  const [sharedNotes, setSharedNotes] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [unlockSaving, setUnlockSaving] = useState(false);
  const [notesSharing, setNotesSharing] = useState(false);
  // Share reference notes: link input and shared links per class
  const [referenceLinkUrl, setReferenceLinkUrl] = useState("");
  const [referenceLinkTitle, setReferenceLinkTitle] = useState("");
  const [sharedLinksByClass, setSharedLinksByClass] = useState({}); // classKey -> [{ id, url, title, sharedAt }]
  const [linkShareSuccess, setLinkShareSuccess] = useState(false);
  // When user clicks Share on a reference material, show text field + upload
  const [expandedShareNoteId, setExpandedShareNoteId] = useState(null);
  const [shareLinkInput, setShareLinkInput] = useState("");
  /** `${programId}__${courseId}` → trainer full-course preview enabled (Firestore trainerPreview/default). */
  const [trainerPreviewMap, setTrainerPreviewMap] = useState({});
  const [previewSavingKey, setPreviewSavingKey] = useState(null);
  /** `${programId}__${batchId}` → expanded; click row (e.g. MCA - 1) to show courses for that batch */
  const [expandedBatchGroups, setExpandedBatchGroups] = useState({});

  const loadAssignments = async () => {
    if (!db || !authUid) {
      setAssignments([]);
      setTrainerPreviewMap({});
      setLoadingAssignments(false);
      return;
    }
    setLoadingAssignments(true);
    setAssignmentsError(null);
    try {
      const list = await fetchAssignmentsForTrainer(db, authUid);
      setAssignments(list);
      const seen = new Set();
      const pairs = [];
      for (const a of list) {
        const k = `${a.programId}__${a.courseId}`;
        if (seen.has(k)) continue;
        seen.add(k);
        pairs.push({ programId: a.programId, courseId: a.courseId });
      }
      const nextPreview = {};
      await Promise.all(
        pairs.map(async ({ programId, courseId }) => {
          const k = `${programId}__${courseId}`;
          try {
            const snap = await getDoc(
              doc(db, "crt", programId, "courses", courseId, "trainerPreview", "default")
            );
            nextPreview[k] = snap.exists() && snap.data()?.enabled === true;
          } catch {
            nextPreview[k] = false;
          }
        })
      );
      setTrainerPreviewMap(nextPreview);
    } catch (e) {
      console.error(e);
      setAssignmentsError(e?.message || "Failed to load assignments.");
      setAssignments([]);
      setTrainerPreviewMap({});
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleTrainerPreviewToggle = async (cls, enabled) => {
    if (!db) return;
    const key = `${cls.programId}__${cls.courseId}`;
    setPreviewSavingKey(key);
    try {
      const ref = doc(db, "crt", cls.programId, "courses", cls.courseId, "trainerPreview", "default");
      await setDoc(ref, { enabled, updatedAt: serverTimestamp() }, { merge: true });
      setTrainerPreviewMap((prev) => ({ ...prev, [key]: enabled }));
    } catch (e) {
      console.error(e);
      alert(e?.message || "Could not update trainer preview setting.");
    } finally {
      setPreviewSavingKey(null);
    }
  };

  useEffect(() => {
    if (!auth || !db) {
      setAuthUid(null);
      setViewerRole(null);
      setAccessDenied(false);
      setLoadingAssignments(false);
      return;
    }
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setAuthUid(null);
        setViewerRole(null);
        setAccessDenied(false);
        setAuthReady(true);
        return;
      }
      setAuthUid(u.uid);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const role = snap.exists() ? snap.data()?.role : null;
        setViewerRole(role || null);
        setAccessDenied(!TRAINER_ROLES.includes(role));
      } catch {
        setViewerRole(null);
        setAccessDenied(true);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!accessDenied && authUid && db && isFirebaseConfigured) {
      loadAssignments();
    } else {
      setLoadingAssignments(false);
    }
  }, [authUid, accessDenied]);

  useEffect(() => {
    if (activeModal !== "attendance" || !selectedClass || !db) return;
    const aid = selectedClass.id;
    if (studentsByAssignment[aid]) return;
    let cancelled = false;
    (async () => {
      setLoadingStudents(true);
      try {
        const snap = await getDocs(
          collection(db, "crt", selectedClass.programId, "batches", selectedClass.batchId, "students")
        );
        if (cancelled) return;
        const list = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            name: x.name || x.studentName || x.displayName || "—",
            email: x.email || "",
            rollNo: x.rollNo || x.regNo || x.regdNo || x.registrationNo || "",
            studentId: x.studentId || x.uid || "",
          };
        });
        setStudentsByAssignment((prev) => ({ ...prev, [aid]: list }));
      } catch (e) {
        console.error(e);
        setStudentsByAssignment((prev) => ({ ...prev, [aid]: [] }));
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeModal, selectedClass?.id, selectedClass?.programId, selectedClass?.batchId]);

  useEffect(() => {
    if (activeModal !== "notes" || !selectedClass || !db) {
      setReferenceNotes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingReferenceNotes(true);
      try {
        const snap = await getDocs(
          collection(
            db,
            "crt",
            selectedClass.programId,
            "courses",
            selectedClass.courseId,
            "referenceMaterials"
          )
        );
        if (cancelled) return;
        setReferenceNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        if (!cancelled) setReferenceNotes([]);
      } finally {
        if (!cancelled) setLoadingReferenceNotes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeModal, selectedClass?.id, selectedClass?.programId, selectedClass?.courseId]);

  const openModal = (modal, cls) => {
    setSelectedClass(cls);
    setActiveModal(modal);
    setAttendanceSaved(false);
    if (modal === "notes") {
      setReferenceLinkUrl("");
      setReferenceLinkTitle("");
      setLinkShareSuccess(false);
      setExpandedShareNoteId(null);
      setShareLinkInput("");
    }
  };
  const closeModal = () => {
    setActiveModal(null);
    setSelectedClass(null);
  };

  const classKey = (cls) => (cls ? `${cls.id}-${cls.courseId}` : "");
  const studentsForClass = (cls) =>
    (cls?.id && studentsByAssignment[cls.id]) || [];

  const getAttendanceForClass = (cls) => {
    const key = cls?.id;
    if (!key) return {};
    return attendance[key] ?? {};
  };
  const setAttendanceForClass = (cls, studentId, present) => {
    const key = cls?.id;
    if (!key) return;
    setAttendance((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [studentId]: present },
    }));
  };
  useEffect(() => {
    if (activeModal !== "unlock" || !selectedClass || !db) {
      setUnlockMeta(null);
      setUnlockSnapshotIds([]);
      setUnlockError(null);
      return;
    }
    let cancelled = false;
    let unsub = () => {};
    (async () => {
      setUnlockLoading(true);
      setUnlockError(null);
      try {
        const { crtId, courseId } = await resolveCrtAndCourse(
          db,
          selectedClass.programId,
          selectedClass.courseId,
          selectedClass.programName
        );
        if (cancelled) return;
        if (!crtId || !courseId) {
          setUnlockMeta(null);
          setUnlockError(
            "No matching CRT programme/course in Firestore. Ensure programme slug and course id match your CRT admin data."
          );
          setUnlockLoading(false);
          return;
        }
        const chRef = collection(db, "crt", crtId, "courses", courseId, "chapters");
        const chSnap = await getDocs(query(chRef, orderBy("order", "asc")));
        if (cancelled) return;
        const chapters = chSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const batchId = selectedClass.batchId;
        if (!batchId) {
          setUnlockMeta(null);
          setUnlockError(
            "This class has no batch. Unlocks are stored per batch — ask an admin to assign this course to a batch."
          );
          setUnlockLoading(false);
          return;
        }
        setUnlockMeta({ crtId, courseId, batchId, chapters });
        /** Per-batch only: students in other batches stay locked. */
        const unlockCol = collection(
          db,
          "crt",
          crtId,
          "batches",
          batchId,
          "courses",
          courseId,
          "chapterUnlocks"
        );
        unsub = onSnapshot(unlockCol, (snap) => {
          if (cancelled) return;
          setUnlockSnapshotIds(
            snap.docs.filter((d) => d.data()?.unlocked === true).map((d) => d.id)
          );
        });
      } catch (e) {
        console.error(e);
        if (!cancelled) setUnlockError(e?.message || "Failed to load course chapters.");
      } finally {
        if (!cancelled) setUnlockLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [
    activeModal,
    selectedClass?.id,
    selectedClass?.programId,
    selectedClass?.courseId,
    selectedClass?.batchId,
  ]);

  const isChapterUnlockedForTrainer = (chapterId) => unlockSnapshotIds.includes(chapterId);

  const handleToggleChapterUnlock = async (chapterId) => {
    if (!unlockMeta || !db || !unlockMeta.batchId) return;
    const currently = unlockSnapshotIds.includes(chapterId);
    try {
      setUnlockSaving(true);
      const ref = doc(
        db,
        "crt",
        unlockMeta.crtId,
        "batches",
        unlockMeta.batchId,
        "courses",
        unlockMeta.courseId,
        "chapterUnlocks",
        chapterId
      );
      if (currently) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          unlocked: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to update day unlock. Check Firestore rules and connection.");
    } finally {
      setUnlockSaving(false);
    }
  };
  const isNoteShared = (cls, noteId) => {
    const key = classKey(cls);
    const set = sharedNotes[key];
    return set ? set.has(noteId) : false;
  };
  const getNoteSharedFromDummy = (cls, note) => {
    return note.shared || isNoteShared(cls, note.id);
  };
  const shareNote = (cls, noteId) => {
    const key = classKey(cls);
    setSharedNotes((prev) => {
      const next = new Set(prev[key] || []);
      next.add(noteId);
      return { ...prev, [key]: next };
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedClass) return;
    setAttendanceSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setAttendanceSaving(false);
    setAttendanceSaved(true);
  };
  const handleSaveUnlock = () => {
    closeModal();
  };
  const handleShareNote = async (cls, noteId) => {
    setNotesSharing(true);
    await new Promise((r) => setTimeout(r, 500));
    shareNote(cls, noteId);
    setNotesSharing(false);
  };

  const openShareForNote = (noteId) => {
    setExpandedShareNoteId((prev) => (prev === noteId ? null : noteId));
    if (expandedShareNoteId !== noteId) setShareLinkInput("");
  };

  const handleUploadShareNote = async (cls, note) => {
    const url = shareLinkInput?.trim();
    if (url) {
      const key = classKey(cls);
      const newEntry = {
        id: `link-${note.id}-${Date.now()}`,
        url: url.startsWith("http") ? url : `https://${url}`,
        title: note.title,
        sharedAt: getTodayStr(),
      };
      setSharedLinksByClass((prev) => ({
        ...prev,
        [key]: [...(prev[key] || []), newEntry],
      }));
    }
    setNotesSharing(true);
    await new Promise((r) => setTimeout(r, 400));
    shareNote(cls, note.id);
    setNotesSharing(false);
    setExpandedShareNoteId(null);
    setShareLinkInput("");
  };

  const sharedLinksForClass = (cls) => {
    const key = classKey(cls);
    return sharedLinksByClass[key] || [];
  };

  const handleShareReferenceLink = async (e) => {
    e?.preventDefault();
    if (!selectedClass) return;
    const url = referenceLinkUrl?.trim();
    if (!url) return;
    setNotesSharing(true);
    setLinkShareSuccess(false);
    await new Promise((r) => setTimeout(r, 400));
    const key = classKey(selectedClass);
    const newEntry = {
      id: `link-${Date.now()}`,
      url: url.startsWith("http") ? url : `https://${url}`,
      title: referenceLinkTitle?.trim() || "Reference link",
      sharedAt: getTodayStr(),
    };
    setSharedLinksByClass((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newEntry],
    }));
    setReferenceLinkUrl("");
    setReferenceLinkTitle("");
    setNotesSharing(false);
    setLinkShareSuccess(true);
  };

  const filteredClasses = useMemo(
    () =>
      filter === "all"
        ? assignments
        : assignments.filter((c) => c.status === filter),
    [assignments, filter]
  );

  /** Stable list of assignment ids so unlock listeners are not torn down when only progress counts change */
  const unlockWatchKey = useMemo(
    () => filteredClasses.map((c) => c.id).sort().join("|"),
    [filteredClasses]
  );

  /** Live: completed sessions = count of chapterUnlocks docs with unlocked:true (matches Unlock Class modal) */
  useEffect(() => {
    if (!db || !isFirebaseConfigured || !unlockWatchKey) return;
    if (!filteredClasses.length) return;
    const list = filteredClasses;
    const unsubs = [];
    for (const cls of list) {
      if (!cls.batchId || !cls.programId || !cls.courseId) continue;
      const assignmentId = cls.id;
      const unlockCol = collection(
        db,
        "crt",
        cls.programId,
        "batches",
        cls.batchId,
        "courses",
        cls.courseId,
        "chapterUnlocks"
      );
      const unsub = onSnapshot(
        unlockCol,
        (snap) => {
          const completed = snap.docs.filter((d) => d.data()?.unlocked === true).length;
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === assignmentId ? { ...a, completedSessions: completed } : a
            )
          );
        },
        (err) => {
          console.warn("[crtTrainar] chapterUnlocks listener", assignmentId, err);
        }
      );
      unsubs.push(unsub);
    }
    return () => {
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-subscribe when visible assignment ids change (filter), not when progress counts update
  }, [unlockWatchKey, db, isFirebaseConfigured]);

  const batchGroups = useMemo(() => {
    const map = new Map();
    for (const cls of filteredClasses) {
      const key = `${cls.programId}__${cls.batchId}`;
      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          programId: cls.programId,
          programName: cls.programName,
          programSlug: cls.programSlug,
          batchId: cls.batchId,
          batchName: cls.batchName,
          /** e.g. "MCA - 1" (program + batch, not course title) */
          batchTitle: `${cls.programName} - ${cls.batchName}`,
          classes: [],
        });
      }
      map.get(key).classes.push(cls);
    }
    return Array.from(map.values()).sort((a, b) => {
      const byProg = a.programName.localeCompare(b.programName);
      if (byProg !== 0) return byProg;
      return String(a.batchName).localeCompare(String(b.batchName), undefined, {
        numeric: true,
      });
    });
  }, [filteredClasses]);

  const toggleBatchGroup = (groupKey) => {
    setExpandedBatchGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const stats = {
    total: assignments.length,
    active: assignments.filter((c) => c.status === "active").length,
    completed: assignments.filter((c) => c.status === "completed").length,
    totalStudents: assignments.reduce((s, c) => s + (c.studentsCount || 0), 0),
  };

  if (!authReady) {
    return (
      <CheckAuth>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl border-2 border-[#00448a] border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading...</p>
          </div>
        </div>
      </CheckAuth>
    );
  }

  if (accessDenied) {
    return (
      <CheckAuth>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="max-w-md w-full text-center p-10 rounded-3xl bg-white border border-slate-200 shadow-xl">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access denied</h1>
            <p className="text-slate-600 mb-6">
              This page is for CRT trainers. Your role is{" "}
              <span className="font-semibold">{viewerRole || "unknown"}</span>.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-5 py-3 bg-[#00448a] text-white rounded-xl hover:bg-[#003a76] transition-colors font-medium"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </CheckAuth>
    );
  }

  return (
    <CheckAuth>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href="/crt"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-[#00448a] font-medium text-sm transition-colors p-1.5 rounded-lg hover:bg-white/80"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to CRT
              </Link>
              <div className="hidden sm:block w-px h-6 bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00448a] to-cyan-600 flex items-center justify-center shadow-lg shadow-[#00448a]/20">
                  <AcademicCapIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                    CRT Trainer
                  </h1>
                  <p className="text-slate-600 text-sm mt-0.5">
                    Classes from batches where you are assigned as trainer
                  </p>
                </div>
              </div>
            </div>
            {isFirebaseConfigured && (
              <button
                type="button"
                onClick={loadAssignments}
                disabled={loadingAssignments}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loadingAssignments ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>

          {!isFirebaseConfigured && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm mb-6">
              Firebase is not configured. Assignments cannot be loaded.
            </div>
          )}
          {assignmentsError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm mb-6">
              {assignmentsError}
            </div>
          )}

          {/* Stats cards */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <BookOpenIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Assigned Classes
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.active}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Completed
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.completed}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00448a]/10 flex items-center justify-center">
                  <UserGroupIcon className="w-5 h-5 text-[#00448a]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {stats.totalStudents}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm font-medium text-slate-600 mr-2">
              Filter:
            </span>
            {["all", "active", "completed"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  filter === key
                    ? "bg-[#00448a] text-white shadow-md shadow-[#00448a]/25"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <p className="text-sm text-slate-600 mb-6 max-w-3xl leading-relaxed">
            Only batches with show class enabled appear here (set{" "}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
              showClass: false
            </code>{" "}
            on a batch document in Firestore to hide it until ready). Use Unlock Class to open course days for your
            batch; optional{" "}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80">
              assignedCourseIds
            </code>{" "}
            on the batch limits which courses show. Rows are grouped by batch (e.g. MCA - 1); click a row to expand and
            see all courses for that batch.
          </p>

          {/* Batches (program - batch name) → expand for course cards */}
          <div className="space-y-6">
            {loadingAssignments ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <ArrowPathIcon className="w-10 h-10 text-[#00448a] mx-auto mb-3 animate-spin" />
                <p className="text-slate-500 font-medium">Loading assignments…</p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <BookOpenIcon className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium max-w-md mx-auto">
                  {filter === "all"
                    ? "No classes yet. Ask an admin to assign you to a CRT batch (CRT Admin → Trainer management), or check that the batch has show class enabled (not showClass: false) and lists this course if assignedCourseIds is set."
                    : "No assigned classes for this filter."}
                </p>
              </motion.div>
            ) : (
              batchGroups.map((group, gi) => {
                const isOpen = expandedBatchGroups[group.groupKey];
                const agg = programAggregateProgress(group.classes);
                return (
                  <motion.div
                    key={group.groupKey}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.05, duration: 0.25 }}
                    className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleBatchGroup(group.groupKey)}
                      aria-expanded={!!isOpen}
                      className="w-full text-left px-5 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-slate-50/90 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00448a]/12 to-cyan-600/10 flex items-center justify-center shrink-0 border border-slate-200/60">
                          <AcademicCapIcon className="w-6 h-6 text-[#00448a]" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                            {group.batchTitle}
                          </h2>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {group.programName} · {group.classes.length} course
                            {group.classes.length === 1 ? "" : "s"} ·{" "}
                            {isOpen ? "Click to collapse" : "Click to show all courses"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 lg:max-w-md lg:flex-1 lg:min-w-[240px]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-slate-500 font-medium">Progress</span>
                            <span className="text-slate-700 font-semibold tabular-nums">
                              {agg.total ? (
                                <>
                                  {agg.completed} / {agg.total} sessions ({agg.pct}%)
                                </>
                              ) : (
                                <>—</>
                              )}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#00448a] to-cyan-600 transition-all duration-500"
                              style={{ width: `${agg.pct}%` }}
                            />
                          </div>
                        </div>
                        <ChevronDownIcon
                          className={`w-6 h-6 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-4 sm:px-4 sm:py-5">
                        <div className="space-y-6">
                          {group.classes.map((cls, ci) => {
                const progress = progressPercent(
                  cls.completedSessions,
                  cls.totalSessions
                );
                const href = `/crt/${encodeURIComponent(cls.programSlug)}/courses/${encodeURIComponent(cls.courseId)}`;
                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.04, duration: 0.25 }}
                  >
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-lg hover:border-slate-300/80 transition-all duration-200">
                      <div className="flex flex-col lg:flex-row">
                        <div className="flex-1 p-6 sm:p-8">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div
                                className={`w-14 h-14 rounded-xl ${cls.iconBg} ${cls.iconColor} flex items-center justify-center shrink-0 shadow-sm`}
                              >
                                <BookOpenIcon className="w-7 h-7" />
                              </div>
                              <div>
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                                  {cls.courseName}
                                </h2>
                                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarDaysIcon className="w-4 h-4" />
                                    {cls.schedule}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    {cls.time}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                  cls.status === "active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {cls.status === "active"
                                  ? "Active"
                                  : "Completed"}
                              </span>
                              <Link
                                href={href}
                                className="inline-flex items-center gap-1 text-sm font-medium text-[#00448a] hover:underline"
                              >
                                View course
                                <ChevronRightIcon className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-5">
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <span className="text-slate-500 font-medium">
                                Sessions progress
                              </span>
                              <span className="text-slate-700 font-semibold">
                                {cls.completedSessions} / {cls.totalSessions} (
                                {progress}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${cls.color} transition-all duration-500`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-slate-100">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                              <UserGroupIcon className="w-4 h-4 text-slate-400" />
                              <strong className="text-slate-800">
                                {cls.studentsCount}
                              </strong>{" "}
                              students
                            </span>
                            <span className="text-sm text-slate-500">
                              {formatDate(cls.startDate)} –{" "}
                              {formatDate(cls.endDate)}
                            </span>
                          </div>

                          <div className="mt-4 p-3 rounded-xl bg-violet-50/90 border border-violet-200/70">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                id={`trainer-preview-${cls.id}`}
                                checked={trainerPreviewMap[`${cls.programId}__${cls.courseId}`] === true}
                                disabled={
                                  !isFirebaseConfigured ||
                                  previewSavingKey === `${cls.programId}__${cls.courseId}`
                                }
                                onChange={(e) => handleTrainerPreviewToggle(cls, e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 shrink-0"
                              />
                              <label
                                htmlFor={`trainer-preview-${cls.id}`}
                                className="text-sm text-slate-700 cursor-pointer select-none min-w-0"
                              >
                                <span className="font-semibold text-slate-900">
                                  Unlock full course for trainer
                                </span>
                                <span className="block text-slate-600 mt-1 leading-relaxed">
                                  When checked, you can open every day on the course page without using day-by-day
                                  unlocks. Uncheck to see the same locked days as students (use Unlock Class to open
                                  days for both).
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Action buttons — Unlock Class first (batch-scoped day unlocks) */}
                          <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openModal("unlock", cls)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00448a] text-white hover:bg-[#003a75] font-semibold text-sm transition-colors shadow-md shadow-[#00448a]/20"
                            >
                              <LockOpenIcon className="w-4 h-4" />
                              Unlock Class
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal("attendance", cls)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-sm transition-colors border border-emerald-200/80"
                            >
                              <ClipboardDocumentCheckIcon className="w-4 h-4" />
                              Mark Attendance
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal("notes", cls)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-sm transition-colors border border-amber-200/80"
                            >
                              <DocumentArrowUpIcon className="w-4 h-4" />
                              Share Reference Notes
                            </button>
                          </div>
                        </div>
                        <div
                          className={`hidden lg:block w-1.5 min-h-[120px] bg-gradient-to-b ${cls.color} opacity-90`}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </motion.div>
                );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Modals */}
          <AnimatePresence>
            {activeModal && selectedClass && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                  onClick={closeModal}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "tween", duration: 0.2 }}
                  className="fixed inset-4 sm:inset-8 md:inset-12 lg:max-w-3xl lg:mx-auto z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {activeModal === "attendance" && "Mark Attendance"}
                        {activeModal === "unlock" && "Unlock Class"}
                        {activeModal === "notes" && "Share Reference Notes"}
                      </h3>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {selectedClass.courseName} · {selectedClass.batchName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      aria-label="Close"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {/* Attendance modal */}
                    {activeModal === "attendance" && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                          Date: <strong>{getTodayStr()}</strong>. Mark students present or absent.
                        </p>
                        {attendanceSaved && (
                          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
                            <CheckCircleIcon className="w-5 h-5 shrink-0" />
                            Attendance saved successfully.
                          </div>
                        )}
                        {loadingStudents && studentsForClass(selectedClass).length === 0 ? (
                          <p className="text-sm text-slate-500 py-6 text-center">Loading students…</p>
                        ) : (
                        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                          {studentsForClass(selectedClass).map((student) => {
                            const present = getAttendanceForClass(selectedClass)[student.id];
                            return (
                              <li
                                key={student.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors"
                              >
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {student.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {student.rollNo} · {student.email}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttendanceForClass(
                                        selectedClass,
                                        student.id,
                                        true
                                      )
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                      present === true
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                                    }`}
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAttendanceForClass(
                                        selectedClass,
                                        student.id,
                                        false
                                      )
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                      present === false
                                        ? "bg-red-100 text-red-800 border border-red-200"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                                    }`}
                                  >
                                    <XCircleIcon className="w-4 h-4" />
                                    Absent
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        )}
                        {studentsForClass(selectedClass).length === 0 && !loadingStudents && (
                          <p className="text-sm text-slate-500 py-4">No students in this batch yet.</p>
                        )}
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleSaveAttendance}
                            disabled={attendanceSaving}
                            className="px-5 py-2.5 rounded-xl bg-[#00448a] text-white font-semibold text-sm hover:bg-[#003a76] disabled:opacity-60 transition-colors"
                          >
                            {attendanceSaving ? "Saving…" : "Save Attendance"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Unlock class modal — writes to: crt/{crtId}/batches/{batchId}/courses/{courseId}/chapterUnlocks/{chapterId} */}
                    {activeModal === "unlock" && (
                      <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                          Unlock each day (chapter) for <strong>this batch only</strong>. Students in other batches for the same course stay locked until their trainer unlocks for their batch.
                        </p>
                        {!isFirebaseConfigured && (
                          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Firebase is not configured. Add env keys to use live unlocks.
                          </p>
                        )}
                        {unlockLoading && (
                          <p className="text-sm text-slate-500">Loading chapters from Firestore…</p>
                        )}
                        {unlockError && (
                          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {unlockError}
                          </p>
                        )}
                        {!unlockLoading && unlockMeta?.chapters?.length === 0 && !unlockError && (
                          <p className="text-sm text-slate-600">No chapters found for this course. Add days under CRT admin.</p>
                        )}
                        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                          {(unlockMeta?.chapters || []).map((ch) => {
                            const unlocked = isChapterUnlockedForTrainer(ch.id);
                            const canSync = Boolean(unlockMeta?.crtId && unlockMeta?.courseId);
                            return (
                              <li
                                key={ch.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors"
                              >
                                <span className="font-medium text-slate-900">
                                  Day {typeof ch.order === "number" ? ch.order : "—"}: {ch.title}
                                </span>
                                <button
                                  type="button"
                                  disabled={!canSync || unlockLoading}
                                  onClick={() => handleToggleChapterUnlock(ch.id)}
                                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                    unlocked
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-slate-100 text-slate-600 hover:bg-violet-100 hover:text-violet-700 border border-transparent"
                                  }`}
                                >
                                  {unlocked ? (
                                    <>
                                      <LockOpenIcon className="w-4 h-4" />
                                      Unlocked
                                    </>
                                  ) : (
                                    <>
                                      <LockClosedIcon className="w-4 h-4" />
                                      Locked
                                    </>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        <div className="flex justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleSaveUnlock}
                            disabled={unlockSaving}
                            className="px-5 py-2.5 rounded-xl bg-[#00448a] text-white font-semibold text-sm hover:bg-[#003a76] disabled:opacity-60 transition-colors"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Share reference notes modal */}
                    {activeModal === "notes" && (
                      <div className="space-y-6">
                        <p className="text-sm text-slate-600">
                          Share reference notes with this class. Paste a link below or share from the list. Course documents can be stored under{" "}
                          <code className="text-xs bg-slate-100 px-1 rounded">referenceMaterials</code> in Firestore.
                        </p>
                        {/* Shared links list */}
                        {sharedLinksForClass(selectedClass).length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 mb-2">Shared links</h4>
                            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                              {sharedLinksForClass(selectedClass).map((item) => (
                                <li
                                  key={item.id}
                                  className="flex items-center justify-between gap-4 px-4 py-3 bg-white hover:bg-slate-50/50"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                      <LinkIcon className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-slate-900 truncate">{item.title}</p>
                                      <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[#00448a] hover:underline truncate block"
                                      >
                                        {item.url}
                                      </a>
                                    </div>
                                  </div>
                                  <span className="text-xs text-slate-500 shrink-0">
                                    Shared {formatDate(item.sharedAt)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <h4 className="text-sm font-semibold text-slate-800 mb-2">Reference materials</h4>
                          {loadingReferenceNotes ? (
                            <p className="text-sm text-slate-500 py-4">Loading…</p>
                          ) : referenceNotes.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4 border border-dashed border-slate-200 rounded-xl px-4">
                              No documents in{" "}
                              <code className="text-xs">crt/{selectedClass.programId}/courses/{selectedClass.courseId}/referenceMaterials</code>.
                              Add them in Firebase or use shared links above.
                            </p>
                          ) : (
                          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                            {referenceNotes.map((note) => {
                              const shared =
                                getNoteSharedFromDummy(selectedClass, note);
                              const isExpanded = expandedShareNoteId === note.id;
                              return (
                                <li
                                  key={note.id}
                                  className="bg-white hover:bg-slate-50/50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                        <DocumentArrowUpIcon className="w-5 h-5 text-amber-600" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-900">
                                          {note.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {note.type}
                                          {shared && (
                                            <> · Shared{note.sharedAt ? ` ${formatDate(note.sharedAt)}` : ""}</>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    {shared ? (
                                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        Shared
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => openShareForNote(note.id)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                          isExpanded
                                            ? "bg-[#00448a] text-white ring-2 ring-[#00448a] ring-offset-2"
                                            : "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200"
                                        }`}
                                      >
                                        <DocumentArrowUpIcon className="w-4 h-4" />
                                        Share
                                      </button>
                                    )}
                                  </div>
                                  {/* Expanded: text field + upload button */}
                                  {isExpanded && !shared && (
                                    <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-amber-50/30">
                                      <div className="flex flex-col sm:flex-row gap-3 mt-3">
                                        <input
                                          type="url"
                                          inputMode="url"
                                          placeholder="Paste link (e.g. https://drive.google.com/... or notes URL)"
                                          value={shareLinkInput}
                                          onChange={(e) => setShareLinkInput(e.target.value)}
                                          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleUploadShareNote(selectedClass, note)}
                                            disabled={notesSharing}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-60 transition-colors"
                                          >
                                            <DocumentArrowUpIcon className="w-4 h-4" />
                                            {notesSharing ? "Uploading…" : "Upload"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { setExpandedShareNoteId(null); setShareLinkInput(""); }}
                                            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </CheckAuth>
  );
}
