"use client";
import AuthForm from "../../../components/AuthForm";
import { firebaseAuth, db } from "../../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  async function handleLogin(email, password) {
    try {
      const cred = await firebaseAuth.login(email, password);
      if (db && cred?.user?.uid) {
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        const role = snap.exists() ? snap.data().role : null;
        if (role === "collegeAdmin") {
          router.push("/Admin/dashboard");
          return;
        }
      }
      router.push("/dashboard");
    } catch (err) {
      alert(err.message || "Login failed");
    }
  }

  // No OTP state in email-only page

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 text-center">Login</h1>

      {/* Email/password only */}
      <AuthForm
        onSubmit={handleLogin}
        submitLabel="Sign in"
      />
      
    </div>
  );
}
