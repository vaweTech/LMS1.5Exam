import { NextResponse } from "next/server";
import admin, { adminDb, writeDocumentViaRest } from "@/lib/firebaseAdmin";

const isRetryableError = (e) => {
  const msg = e?.message || "";
  return (
    /socket hang up|ECONNRESET|ETIMEDOUT|EPIPE|ECONNREFUSED/i.test(msg) ||
    e?.code === "ECONNRESET" ||
    e?.code === "ETIMEDOUT" ||
    e?.code === "UNAVAILABLE"
  );
};

async function withRetry(fn, maxAttempts = 5) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts && isRetryableError(e)) {
        const delayMs = [800, 1500, 3000, 5000][attempt - 1] || 6000;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export async function POST(req) {
  try {
    const { name, email, empId, department, mobile, notes, createdBy } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }

    const defaultPassword = "VawePO@2025";

    // 1) Create Firebase Auth user with default password
    const userRecord = await admin.auth().createUser({
      email,
      password: defaultPassword,
      displayName: name,
    });

    const now = new Date();

    // 2) User profile in top-level `users` collection
    const userDoc = {
      name,
      email,
      empId: empId || "",
      department: department || "",
      mobile: mobile || "",
      role: "crtPoUser",
      defaultPassword,
      status: "active",
      createdAt: now,
    };

    try {
      const userRef = adminDb.collection("users").doc(userRecord.uid);
      await withRetry(() => userRef.set(userDoc, { merge: true }));

      // 3) Data for the PO document
      const poData = {
        name,
        email,
        empId: empId || "",
        department: department || "",
        mobile: mobile || "",
        notes: notes || "",
        createdAt: now,
        createdBy: createdBy || null,
        userId: userRecord.uid,
      };

      // Store PO under subcollection `users/{uid}/po`
      const poRef = await withRetry(() =>
        userRef.collection("po").add(poData)
      );

      // Also store PO in top-level `crtPOs` to keep the admin list simple
      await withRetry(() =>
        adminDb.collection("crtPOs").doc(poRef.id).set(poData)
      );

      return NextResponse.json({
        ok: true,
        uid: userRecord.uid,
        poId: poRef.id,
        defaultPassword,
      });
    } catch (firestoreError) {
      if (!isRetryableError(firestoreError)) {
        throw firestoreError;
      }

      console.warn(
        "create-po-user: Firestore SDK failed, trying REST fallback…",
        firestoreError.message
      );

      // REST fallback – write user and one PO doc via REST
      const basePoId = `${userRecord.uid}-${Date.now()}`;

      const poDataRest = {
        name,
        email,
        empId: empId || "",
        department: department || "",
        mobile: mobile || "",
        notes: notes || "",
        createdAt: now,
        createdBy: createdBy || null,
        userId: userRecord.uid,
      };

      await writeDocumentViaRest("users", userRecord.uid, userDoc);
      await writeDocumentViaRest("crtPOs", basePoId, poDataRest);
      await writeDocumentViaRest(`users/${userRecord.uid}/po`, basePoId, poDataRest);

      return NextResponse.json({
        ok: true,
        uid: userRecord.uid,
        poId: basePoId,
        defaultPassword,
      });
    }
  } catch (e) {
    console.error("create-po-user error", e);
    return NextResponse.json(
      { error: e.message || "Failed to create PO user" },
      { status: 500 }
    );
  }
}
