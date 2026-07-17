"use client";

// Quick setup: tick recurring weekly busy days, apply — the free gaps for the
// next 12 months are painted into the availability calendar. The calendar
// stays the single source of truth; this is just a fast way to fill it.
// Extracted from Settings → AcademicCard so /welcome's Calendar step can
// drive the exact same apply sequence.

import { useState } from "react";
import { putPreferences, putAvailability } from "@/lib/client";
import { generateFreeWindows } from "@/lib/academic";
import { todayStr } from "@/components/tripcal/calendarMath";
import type { Preferences } from "@/types/api";

/** Matches MONTHS_AHEAD in YearPaint — the painted calendar's horizon. */
const MONTHS_AHEAD = 12;

/** YearPaint listens for this to re-fetch after the windows are rewritten. */
export const AVAILABILITY_UPDATED_EVENT = "somewhere:availability-updated";

export const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Mon" },
  { iso: 2, label: "Tue" },
  { iso: 3, label: "Wed" },
  { iso: 4, label: "Thu" },
  { iso: 5, label: "Fri" },
  { iso: 6, label: "Sat" },
  { iso: 7, label: "Sun" },
];

export function useQuickSetup(initialBusy: number[] = []) {
  const [busy, setBusy] = useState<number[]>(initialBusy);
  const [applying, setApplying] = useState(false);

  const toggle = (iso: number) =>
    setBusy((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    );

  /** Paint free windows for `busy`, persist busy_weekdays, notify YearPaint. */
  const apply = async (prefs: Preferences) => {
    setApplying(true);
    try {
      const windows = generateFreeWindows(busy, todayStr(), MONTHS_AHEAD);
      await putAvailability(windows);
      const updated = await putPreferences({ ...prefs, busy_weekdays: busy });
      window.dispatchEvent(new Event(AVAILABILITY_UPDATED_EVENT));
      return { windows, prefs: updated };
    } finally {
      setApplying(false);
    }
  };

  return { busy, setBusy, toggle, applying, apply };
}
