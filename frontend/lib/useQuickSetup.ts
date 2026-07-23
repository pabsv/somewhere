"use client";

// Quick setup: tick recurring weekly available days, apply — those days for
// the next 12 months are painted into the availability calendar. The calendar
// stays the single source of truth; this is just a fast way to fill it.
// Extracted from Settings → AcademicCard so /welcome's Calendar step can
// drive the exact same apply sequence.

import { useState } from "react";
import { putPreferences, putAvailability } from "@/lib/client";
import { generateFreeWindows } from "@/lib/academic";
import { todayStr } from "@/components/tripcal/calendarMath";
import type { DateWindow } from "@/types/api";

/** Matches MONTHS_AHEAD in YearPaint — the painted calendar's horizon. */
const MONTHS_AHEAD = 12;

/** YearPaint listens for this after the windows are rewritten. */
export const AVAILABILITY_UPDATED_EVENT = "somewhere:availability-updated";
/** Emitted after availability has been persisted without requesting a repaint. */
export const AVAILABILITY_SAVED_EVENT = "somewhere:availability-saved";

/** AcademicCard uses this to capture unsaved paint before replacing it. */
export const AVAILABILITY_SNAPSHOT_EVENT = "somewhere:availability-snapshot";

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

  /** Paint selected weekday windows, persist the legacy field, notify YearPaint. */
  const apply = async () => {
    setApplying(true);
    try {
      const windows = generateFreeWindows(busy, todayStr(), MONTHS_AHEAD);
      await putAvailability(windows);
      const updated = await putPreferences({ busy_weekdays: busy });
      window.dispatchEvent(
        new CustomEvent<{ windows: DateWindow[] }>(AVAILABILITY_UPDATED_EVENT, {
          detail: { windows },
        }),
      );
      return { windows, prefs: updated };
    } finally {
      setApplying(false);
    }
  };

  return { busy, setBusy, toggle, applying, apply };
}
