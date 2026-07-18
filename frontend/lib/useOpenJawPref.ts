"use client";

// ─── useOpenJawPref — does this user want open-jaw combos shown? ─────────────
// Reads Preferences.allow_open_jaw (default true). Signed-out users always get
// combos (the preference is an opt-OUT for people who hate split tickets).
// One fetch per mount; errors fall back to true — the pref must never be the
// reason a page breaks. Spec: docs/MULTICITY_PLAN.md Phase 3.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getPreferences } from "@/lib/client";

export function useOpenJawPref(): boolean {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [allow, setAllow] = useState(true);

  useEffect(() => {
    if (!signedIn) {
      setAllow(true);
      return;
    }
    let cancelled = false;
    getPreferences()
      .then((p) => {
        if (!cancelled) setAllow(p.allow_open_jaw ?? true);
      })
      .catch(() => {
        if (!cancelled) setAllow(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return allow;
}
