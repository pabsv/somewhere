"use client";

// ─── Favourite cities — shared client state ──────────────────────────────────
// "Favourites": destinations the user stars as places they *want* — somewhere
// they'd take on a merely-good fare, or a "home" to fly to whenever cheap + free.
// Surfaced (pinned + filterable + relaxed deal tiers) across Explore / City /
// Calendar, plus a dedicated Explore strip. One fetch per signed-in session,
// held in context so every CityCard / header / filter shares the same Set.
// Toggling is optimistic: flip locally, PUT replace-all, revert on failure.
// City storage stays `users.saved_cities`; `users.saved_countries` remembers
// which country containers should remain grouped when only partly selected.
// Server contract: GET/PUT /api/saved-cities (see types/api.ts).

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
  /** Countries intentionally kept as grouped, partially editable selections. */
  countryGroups: Set<string>;
  isSaved: (code: string) => boolean;
  /** Optimistically flip a city's saved state and persist. No-op if signed out. */
  toggle: (code: string) => void;
  /** Add or remove several cities as one optimistic, ordered save. */
  setMany: (codes: readonly string[], active: boolean) => void;
  /** Select/remove a whole country and its city codes as one mutation. */
  setCountryGroup: (
    country: string,
    codes: readonly string[],
    active: boolean,
  ) => void;
  /** Toggle one city while retaining its country container. */
  toggleGroupedCity: (country: string, code: string) => void;
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
  const [countryGroups, setCountryGroups] = useState<Set<string>>(EMPTY);
  const [ready, setReady] = useState(false);
  const savedRef = useRef<Set<string>>(EMPTY);
  const countryGroupsRef = useRef<Set<string>>(EMPTY);
  const mutationRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const adoptSaved = useCallback((next: Set<string>, groups: Set<string>) => {
    savedRef.current = next;
    countryGroupsRef.current = groups;
    setSaved(next);
    setCountryGroups(groups);
  }, []);

  // Load once per sign-in; clear on sign-out.
  useEffect(() => {
    if (status === "loading") return;
    if (!signedIn) {
      mutationRef.current += 1;
      // Stable EMPTY ref → no cascading render; safe to clear synchronously.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      adoptSaved(EMPTY, EMPTY);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    getSavedCities()
      .then((res) => {
        if (!cancelled) {
          adoptSaved(
            new Set(res.cities.map((c) => c.toUpperCase())),
            new Set(res.countries.map((c) => c.toUpperCase())),
          );
        }
      })
      .catch(() => {
        if (!cancelled) adoptSaved(new Set(), new Set());
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status, signedIn, adoptSaved]);

  const updateMany = useCallback(
    (
      rawCodes: readonly string[],
      active?: boolean,
      group?: { code: string; active: boolean },
    ) => {
      if (!signedIn) return;
      const codes = rawCodes.map((code) => code.toUpperCase());
      const prev = savedRef.current;
      const prevGroups = countryGroupsRef.current;
      const next = new Set(prev);
      const nextGroups = new Set(prevGroups);
      for (const code of codes) {
        if (active === true) next.add(code);
        else if (active === false) next.delete(code);
        else if (next.has(code)) next.delete(code);
        else next.add(code);
      }
      if (group) {
        const groupCode = group.code.toUpperCase();
        if (group.active) nextGroups.add(groupCode);
        else nextGroups.delete(groupCode);
      }
      if (
        next.size === prev.size &&
        [...next].every((code) => prev.has(code)) &&
        nextGroups.size === prevGroups.size &&
        [...nextGroups].every((code) => prevGroups.has(code))
      ) {
        return;
      }

      const mutation = ++mutationRef.current;
      adoptSaved(next, nextGroups);

      // Serialize replace-all writes so a slower, older response can never
      // overwrite a newer country/city selection on the server.
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() => putSavedCities([...next], [...nextGroups]))
        .then((res) => {
          if (mutation !== mutationRef.current) return;
          adoptSaved(
            new Set(res.cities.map((c) => c.toUpperCase())),
            new Set(res.countries.map((c) => c.toUpperCase())),
          );
        })
        .catch(() => {
          if (mutation === mutationRef.current) {
            adoptSaved(prev, prevGroups);
          }
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

  const setCountryGroup = useCallback(
    (country: string, codes: readonly string[], active: boolean) =>
      updateMany(codes, active, { code: country, active }),
    [updateMany],
  );

  const toggleGroupedCity = useCallback(
    (country: string, code: string) =>
      updateMany([code], undefined, { code: country, active: true }),
    [updateMany],
  );

  const isSaved = useCallback((code: string) => saved.has(code.toUpperCase()), [
    saved,
  ]);

  return (
    <SavedCitiesContext.Provider
      value={{
        saved,
        countryGroups,
        isSaved,
        toggle,
        setMany,
        setCountryGroup,
        toggleGroupedCity,
        ready,
        signedIn,
      }}
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
    countryGroups: EMPTY,
    isSaved: () => false,
    toggle: () => {},
    setMany: () => {},
    setCountryGroup: () => {},
    toggleGroupedCity: () => {},
    ready: true,
    signedIn: false,
  };
}
