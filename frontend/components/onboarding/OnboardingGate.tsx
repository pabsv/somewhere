"use client";

// Hard gate: bounce a signed-in user with pending onboarding to /welcome from
// anywhere else in the app. Exempt auth-flow routes so sign-in/out and the
// wizard itself never loop. sessionStorage flag covers the gap between
// finishing the wizard and the JWT actually refreshing (see auth.ts
// trigger==="update" handling).

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const DONE_KEY = "somewhere:onboarding-done";
const EXEMPT_PREFIXES = ["/welcome", "/login", "/register", "/join", "/api"];

export default function OnboardingGate() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.onboarding_pending) return;
    if (EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }
    if (sessionStorage.getItem(DONE_KEY)) return;

    router.replace("/welcome");
  }, [status, session, pathname, router]);

  return null;
}
