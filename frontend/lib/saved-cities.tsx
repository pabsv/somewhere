"use client";

// ─── Saved cities — shared client state ──────────────────────────────────────
// "Interest cities": destinations the user stars as focus points, surfaced
// (pinned + filterable) across Explore / City / Calendar. One fetch per signed-
// in session, held in context so every CityCard / header / filter shares the
// same Set. Toggling is optimistic: flip locally, PUT replace-all, revert on
// failure. Server contract: GET/PUT /api/saved-cities (see types/api.ts).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { getSavedCities, putSavedCities } from "@/lib/client";

interface SavedCitiesValue {
  /** Uppercase IATA codes the user has starred. */
  saved: Set<string>;
  isSaved: (code: string) => boolean;
  /** Optimistically flip a city's saved state and persist. No-op if signed out. */
  toggle: (code: string) => void;
  /** True once the initial fetch has resolved (or settled signed-out). */
  ready: boolean;
  signedIn: boolean;
}

const SavedCitiesContext = createContext<SavedCitiesValue | null>(null);

// Stable empty set: a shared reference so clearing state can bail via Object.is
// (a fresh `new Set()` each render would force a cascading re-render).
const EMPTY: Set<string> = new Set();

export function SavedCitiesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  const [saved, setSaved] = useState<Set<string>>(EMPTY);
  const [ready, setReady] = useState(false);

  // Load once per sign-in; clear on sign-out.
  useEffect(() => {
    if (status === "loading") return;
    if (!signedIn) {
      // Stable EMPTY ref → no cascading render; safe to clear synchronously.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaved(EMPTY);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    getSavedCities()
      .then((res) => {
        if (!cancelled) setSaved(new Set(res.cities.map((c) => c.toUpperCase())));
      })
      .catch(() => {
        if (!cancelled) setSaved(new Set());
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status, signedIn]);

  const toggle = useCallback(
    (raw: string) => {
      if (!signedIn) return;
      const code = raw.toUpperCase();
      const prev = saved;
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);

      setSaved(next); // optimistic
      putSavedCities([...next])
        .then((res) => {
          // Reconcile with the server's sanitized truth.
          setSaved(new Set(res.cities.map((c) => c.toUpperCase())));
        })
        .catch(() => {
          // Revert on failure.
          setSaved(prev);
        });
    },
    [signedIn, saved],
  );

  const isSaved = useCallback((code: string) => saved.has(code.toUpperCase()), [
    saved,
  ]);

  return (
    <SavedCitiesContext.Provider
      value={{ saved, isSaved, toggle, ready, signedIn }}
    >
      {children}
    </SavedCitiesContext.Provider>
  );
}

/**
 * Read shared saved-cities state. Returns a signed-out, empty default when used
 * outside the provider (keeps components renderable in isolation/tests).
 */
export function useSavedCities(): SavedCitiesValue {
  const ctx = useContext(SavedCitiesContext);
  if (ctx) return ctx;
  return {
    saved: EMPTY,
    isSaved: () => false,
    toggle: () => {},
    ready: true,
    signedIn: false,
  };
}
