"use client";

// ─── Favourite cities — shared client state ──────────────────────────────────
// "Favourites": destinations the user stars as places they *want* — somewhere
// they'd take on a merely-good fare, or a "home" to fly to whenever cheap + free.
// Surfaced (pinned + filterable + relaxed deal tiers) across Explore / City /
// Calendar, plus a dedicated Explore strip. One fetch per signed-in session,
// held in context so every CityCard / header / filter shares the same Set.
// Toggling is optimistic: flip locally, PUT replace-all, revert on failure.
// Storage stays `users.saved_cities` (no migration); server contract:
// GET/PUT /api/saved-cities (see types/api.ts).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  /** Add or remove several cities as one optimistic, ordered save. */
  setMany: (codes: readonly string[], active: boolean) => void;
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
  const savedRef = useRef<Set<string>>(EMPTY);
  const mutationRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const adoptSaved = useCallback((next: Set<string>) => {
    savedRef.current = next;
    setSaved(next);
  }, []);

  // Load once per sign-in; clear on sign-out.
  useEffect(() => {
    if (status === "loading") return;
    if (!signedIn) {
      mutationRef.current += 1;
      // Stable EMPTY ref → no cascading render; safe to clear synchronously.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      adoptSaved(EMPTY);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    getSavedCities()
      .then((res) => {
        if (!cancelled) {
          adoptSaved(new Set(res.cities.map((c) => c.toUpperCase())));
        }
      })
      .catch(() => {
        if (!cancelled) adoptSaved(new Set());
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status, signedIn, adoptSaved]);

  const updateMany = useCallback(
    (rawCodes: readonly string[], active?: boolean) => {
      if (!signedIn) return;
      const codes = rawCodes.map((code) => code.toUpperCase());
      const prev = savedRef.current;
      const next = new Set(prev);
      for (const code of codes) {
        if (active === true) next.add(code);
        else if (active === false) next.delete(code);
        else if (next.has(code)) next.delete(code);
        else next.add(code);
      }
      if (
        next.size === prev.size &&
        [...next].every((code) => prev.has(code))
      ) {
        return;
      }

      const mutation = ++mutationRef.current;
      adoptSaved(next);

      // Serialize replace-all writes so a slower, older response can never
      // overwrite a newer country/city selection on the server.
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => putSavedCities([...next]))
        .then((res) => {
          if (mutation !== mutationRef.current) return;
          adoptSaved(new Set(res.cities.map((c) => c.toUpperCase())));
        })
        .catch(() => {
          if (mutation === mutationRef.current) adoptSaved(prev);
        });
    },
    [signedIn, adoptSaved],
  );

  const toggle = useCallback(
    (code: string) => updateMany([code]),
    [updateMany],
  );

  const setMany = useCallback(
    (codes: readonly string[], active: boolean) => updateMany(codes, active),
    [updateMany],
  );

  const isSaved = useCallback((code: string) => saved.has(code.toUpperCase()), [
    saved,
  ]);

  return (
    <SavedCitiesContext.Provider
      value={{ saved, isSaved, toggle, setMany, ready, signedIn }}
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
    setMany: () => {},
    ready: true,
    signedIn: false,
  };
}
