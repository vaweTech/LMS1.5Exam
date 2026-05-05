"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth, db } from "./firebase"; // make sure db = getFirestore(app)
import { doc, getDoc } from "firebase/firestore";
import { collegeAdminPathAllowed } from "./collegeAdminAccess";

export default function CheckAdminAuth({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/auth/login"); // not logged in
        return;
      }

      try {
        // get user doc from Firestore
        const userDocRef = doc(db, "users", user.uid); // assuming user.uid is your doc id
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role;

          if (role === "admin" || role === "superadmin") {
            setIsLoading(false);
          } else if (role === "collegeAdmin") {
            if (!pathname?.startsWith("/Admin")) {
              router.push("/not-authorized");
            } else {
              const ok = collegeAdminPathAllowed(
                pathname,
                !!userData.moduleLms,
                !!userData.moduleCrt
              );
              if (ok) setIsLoading(false);
              else router.push("/not-authorized");
            }
          } else {
            router.push("/not-authorized"); // redirect non-admins
          }
        } else {
          router.push("/not-authorized"); // no user doc found
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        router.push("/error");
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return <>{children}</>;
}
