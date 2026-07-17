"use client";

// ─── University calendar — shared client state ────────────────────────────────
// Mirrors lib/saved-cities.tsx: one getPreferences() fetch per signed-in
// session resolves which university calendar (if any) to overlay on the
// calendar surfaces (MonthBlock wash, AgendaMonth notes, YearPaint stripes).
// setUniversity only updates local state — PreferencesCard calls it after a
// successful save so same-page consumers (YearPaint) update without a refetch.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { getPreferences } from "@/lib/client";
import {
  UNIVERSITY_CALENDARS,
  type UniPeriod,
  type UniversityId,
} from "./tue";

interface UniCalendarValue {
  university: UniversityId | null;
  /** Academic periods for the active university; empty when none/signed out. */
  periods: UniPeriod[];
  /** Local-state sync hook for PreferencesCard after a successful save. */
  setUniversity: (u: UniversityId | null) => void;
  /** True once the initial fetch has resolved (or settled signed-out). */
  ready: boolean;
}

const UniCalendarContext = createContext<UniCalendarValue | null>(null);

const NO_PERIODS: UniPeriod[] = [];

export function UniCalendarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const signedIn = status === "authenticated";

  const [university, setUniversity] = useState<UniversityId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!signedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUniversity(null);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    getPreferences()
      .then((p) => {
        if (!cancelled) setUniversity(p.university ?? null);
      })
      .catch(() => {
        if (!cancelled) setUniversity(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status, signedIn]);

  const periods = useMemo(
    () =>
      university ? UNIVERSITY_CALENDARS[university].periods : NO_PERIODS,
    [university],
  );

  const set = useCallback((u: UniversityId | null) => setUniversity(u), []);

  return (
    <UniCalendarContext.Provider
      value={{ university, periods, setUniversity: set, ready }}
    >
      {children}
    </UniCalendarContext.Provider>
  );
}

/**
 * Read the shared university-calendar state. Returns an inert default when
 * used outside the provider (keeps components renderable in isolation).
 */
export function useUniCalendar(): UniCalendarValue {
  const ctx = useContext(UniCalendarContext);
  if (ctx) return ctx;
  return {
    university: null,
    periods: NO_PERIODS,
    setUniversity: () => {},
    ready: true,
  };
}
