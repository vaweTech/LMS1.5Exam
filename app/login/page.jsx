"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // After successful login, go to CRT PO Management (adjust if you want a different page)
      router.push("/Admin/crt/po-management");
    } catch (err) {
      setError(err?.message || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Login</h1>
        <p className="text-sm text-slate-600 mb-6">
          Sign in with your registered email and password.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00448a] focus:border-[#00448a]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00448a] focus:border-[#00448a]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full px-4 py-2.5 rounded-xl bg-[#00448a] text-white text-sm font-medium hover:bg-[#003a76] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

