import { NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";

const isTransientNetworkError = (e) =>
  e?.code === "ECONNRESET" ||
  e?.code === "ETIMEDOUT" ||
  e?.errno === "ECONNRESET" ||
  (e?.message && /socket hang up|ECONNRESET|ETIMEDOUT/i.test(e.message));

async function withRetry(fn, maxAttempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts && isTransientNetworkError(e)) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    if (!uid) return NextResponse.json({ error: "Trainer uid required" }, { status: 400 });

    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await withRetry(() => userRef.get());
    if (!userSnap.exists) return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    const data = userSnap.data();
    if (data?.role !== "trainer")
      return NextResponse.json({ error: "User is not a trainer" }, { status: 400 });

    await withRetry(() => admin.auth().deleteUser(uid));
    await withRetry(() => userRef.delete());

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete-trainer error", e);
    return NextResponse.json(
      { error: e.message || "Failed to delete trainer" },
      { status: 500 }
    );
  }
}
