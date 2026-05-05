import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/apiAuth";
import admin, { adminDb, writeDocumentViaRest, writeDocumentPathViaRest } from "@/lib/firebaseAdmin";

const COLLEGE_HOSTS_COLLECTION = "collegeHosts";
/** Full college-admin profile: users/{uid}/details/profile */
const USER_DETAILS_SUBCOLLECTION = "details";
const USER_DETAILS_DOC_ID = "profile";
const DEFAULT_PASSWORD = "VaweCollegeAdmin@2026";

function normalizeSubdomain(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const isRetryableError = (e) => {
  const msg = `${e?.message || ""} ${e?.cause?.message || ""}`;
  return (
    /socket hang up|ECONNRESET|ETIMEDOUT|EPIPE|ECONNREFUSED|fetch failed|network|UND_ERR|UNAVAILABLE|DEADLINE_EXCEEDED/i.test(
      msg
    ) ||
    e?.code === "ECONNRESET" ||
    e?.code === "ETIMEDOUT" ||
    e?.code === "UNAVAILABLE" ||
    e?.code === 14
  );
};

async function withRetry(fn, maxAttempts = 6) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts && isRetryableError(e)) {
        const delayMs = [800, 1500, 3000, 5000, 7000][attempt - 1] || 8000;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export async function POST(req) {
  return withAdminAuth(req, async (authReq) => {
    try {
      const body = await authReq.json();
      const name = String(body.name || "").trim();
      const subdomain = normalizeSubdomain(body.subdomain);
      const email = String(body.email || "").trim().toLowerCase();
      const rootDomain = String(body.rootDomain || "skillwins.in").trim() || "skillwins.in";
      const host = subdomain ? `${subdomain}.${rootDomain}` : "";
      const passwordRaw = String(body.password || "").trim();
      const password = passwordRaw || DEFAULT_PASSWORD;
      const moduleLms = !!body.moduleLms;
      const moduleCrt = !!body.moduleCrt;

      if (!name || !subdomain || !host) {
        return NextResponse.json(
          { error: "name, subdomain, and a valid host are required" },
          { status: 400 }
        );
      }
      if (!email) {
        return NextResponse.json({ error: "email is required" }, { status: 400 });
      }
      if (!moduleLms && !moduleCrt) {
        return NextResponse.json(
          { error: "Select at least one module: LMS and/or CRT" },
          { status: 400 }
        );
      }

      let userRecord;
      try {
        userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        });
      } catch (e) {
        if (e?.code === "auth/email-already-exists") {
          return NextResponse.json(
            {
              error:
                "This email already has an account. Use a different email or delete the existing Auth user first.",
            },
            { status: 409 }
          );
        }
        throw e;
      }

      const uid = userRecord.uid;
      const ts = admin.firestore.FieldValue.serverTimestamp();

      /** Minimal fields on users/{uid} for existing auth / AdminAccess reads */
      const userRootDoc = {
        role: "collegeAdmin",
        moduleLms,
        moduleCrt,
        platformEmpty: true,
        status: "active",
        createdAt: ts,
        createdBySuperAdminUid: authReq.user.uid,
      };

      /** Full profile at users/{uid}/details/profile */
      const userDetailsDoc = {
        name,
        email,
        role: "collegeAdmin",
        subdomain,
        host,
        moduleLms,
        moduleCrt,
        platformEmpty: true,
        status: "active",
        collegeAdminUid: uid,
        createdAt: ts,
        createdBySuperAdminUid: authReq.user.uid,
      };

      const collegeDoc = {
        name,
        subdomain,
        host,
        collegeAdminUid: uid,
        collegeAdminEmail: email,
        moduleLms,
        moduleCrt,
        platformEmpty: true,
        emptyLms: moduleLms,
        emptyCrt: moduleCrt,
        updatedAt: ts,
      };

      const detailsPath = `users/${uid}/${USER_DETAILS_SUBCOLLECTION}/${USER_DETAILS_DOC_ID}`;

      try {
        await withRetry(() => adminDb.collection("users").doc(uid).set(userRootDoc, { merge: true }));
        await withRetry(() =>
          adminDb.collection("users").doc(uid).collection(USER_DETAILS_SUBCOLLECTION).doc(USER_DETAILS_DOC_ID).set(userDetailsDoc, { merge: true })
        );
        await withRetry(() =>
          adminDb.collection(COLLEGE_HOSTS_COLLECTION).doc(subdomain).set(collegeDoc, { merge: true })
        );
      } catch (firestoreError) {
        if (!isRetryableError(firestoreError)) throw firestoreError;
        console.warn(
          "create-college-admin: Firestore SDK failed, trying REST fallback…",
          firestoreError.message
        );
        const now = new Date();
        await writeDocumentViaRest("users", uid, {
          role: "collegeAdmin",
          moduleLms,
          moduleCrt,
          platformEmpty: true,
          status: "active",
          createdAt: now,
          createdBySuperAdminUid: authReq.user.uid,
        });
        await writeDocumentPathViaRest(detailsPath, {
          name,
          email,
          role: "collegeAdmin",
          subdomain,
          host,
          moduleLms,
          moduleCrt,
          platformEmpty: true,
          status: "active",
          collegeAdminUid: uid,
          createdAt: now,
          createdBySuperAdminUid: authReq.user.uid,
        });
        await writeDocumentViaRest(COLLEGE_HOSTS_COLLECTION, subdomain, {
          name,
          subdomain,
          host,
          collegeAdminUid: uid,
          collegeAdminEmail: email,
          moduleLms,
          moduleCrt,
          platformEmpty: true,
          emptyLms: moduleLms,
          emptyCrt: moduleCrt,
          updatedAt: now,
        });
      }

      return NextResponse.json({
        ok: true,
        uid,
        host,
        defaultPasswordUsed: !passwordRaw,
        initialPassword: !passwordRaw ? password : undefined,
      });
    } catch (e) {
      console.error("create-college-admin", e);
      return NextResponse.json(
        { error: e?.message || "Failed to create college admin" },
        { status: 500 }
      );
    }
  });
}
