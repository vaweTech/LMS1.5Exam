"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { computeAdminAccess } from "@/lib/collegeAdminAccess";

const AdminAccessContext = createContext(null);

const emptyAccess = {
  loading: true,
  user: null,
  role: null,
  moduleLms: true,
  moduleCrt: true,
  platformEmpty: false,
  collegeSubdomain: null,
  ...computeAdminAccess(null, true, true),
};

export function AdminAccessProvider({ children }) {
  const [state, setState] = useState(emptyAccess);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setState({
          loading: false,
          user: null,
          role: null,
          moduleLms: true,
          moduleCrt: true,
          platformEmpty: false,
          collegeSubdomain: null,
          ...computeAdminAccess(null, true, true),
        });
        return;
      }
      const snap = await getDoc(doc(db, "users", u.uid));
      const d = snap.exists() ? snap.data() : {};
      const role = d.role || d.Role;
      const isCollege = role === "collegeAdmin";
      const moduleLms = isCollege ? !!d.moduleLms : true;
      const moduleCrt = isCollege ? !!d.moduleCrt : true;
      const platformEmpty = isCollege && !!d.platformEmpty;
      let collegeSubdomain = (d.collegeSubdomain || d.subdomain || "").trim() || null;
      if (isCollege && !collegeSubdomain) {
        const detailSnap = await getDoc(doc(db, "users", u.uid, "details", "profile"));
        if (detailSnap.exists()) {
          const det = detailSnap.data() || {};
          collegeSubdomain = (det.subdomain || det.collegeSubdomain || "").trim() || null;
        }
      }
      setState({
        loading: false,
        user: u,
        role,
        moduleLms,
        moduleCrt,
        platformEmpty,
        collegeSubdomain,
        ...computeAdminAccess(role, moduleLms, moduleCrt),
      });
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => state, [state]);
  return (
    <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>
  );
}

export function useAdminAccess() {
  const ctx = useContext(AdminAccessContext);
  if (!ctx) {
    throw new Error("useAdminAccess must be used within AdminAccessProvider");
  }
  return ctx;
}
