"use client";

// Quick setup: tick recurring weekly busy days, hit "Apply to calendar" —
// the free gaps for the next 12 months are painted into the availability
// calendar below. The calendar is the single source of truth; this is just
// a fast way to fill it.

import { useEffect, useState } from "react";
import Chip from "@/components/ui/Chip";
import {
  getPreferences,
  putPreferences,
  putAvailability,
} from "@/lib/client";
import { generateFreeWindows } from "@/lib/academic";
import { todayStr } from "@/components/tripcal/calendarMath";
import type { Preferences } from "@/types/api";

/** Matches MONTHS_AHEAD in YearPaint — the painted calendar's horizon. */
const MONTHS_AHEAD = 12;

/** YearPaint listens for this to re-fetch after we rewrite the windows. */
export const AVAILABILITY_UPDATED_EVENT = "somewhere:availability-updated";

const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Mon" },
  { iso: 2, label: "Tue" },
  { iso: 3, label: "Wed" },
  { iso: 4, label: "Thu" },
  { iso: 5, label: "Fri" },
  { iso: 6, label: "Sat" },
  { iso: 7, label: "Sun" },
];

export default function AcademicCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setPrefs(p);
        setBusy(p.busy_weekdays ?? []);
      })
      .catch(() => setMessage("Couldn’t load preferences."));
  }, []);

  const toggle = (iso: number) =>
    setBusy((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort(),
    );

  const apply = async () => {
    if (!prefs) return;
    setApplying(true);
    setMessage(null);
    try {
      const windows = generateFreeWindows(busy, todayStr(), MONTHS_AHEAD);
      await putAvailability(windows);
      // remember the chip selection for next time
      setPrefs(await putPreferences({ ...prefs, busy_weekdays: busy }));
      window.dispatchEvent(new Event(AVAILABILITY_UPDATED_EVENT));
      setMessage(
        `Painted ${windows.length} free window(s) into your calendar below — fine-tune there.`,
      );
    } catch {
      setMessage("Couldn’t apply — try again.");
    } finally {
      setApplying(false);
    }
  };

  if (!prefs) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {WEEKDAYS.map((d) => (
          <Chip
            key={d.iso}
            size="sm"
            selected={busy.includes(d.iso)}
            onClick={() => toggle(d.iso)}
            disabled={applying}
          >
            {d.label}
          </Chip>
        ))}
        <Chip
          onClick={apply}
          disabled={applying || busy.length === 0 || busy.length === 7}
          className="ml-2"
        >
          {applying ? "Applying…" : "Apply to calendar"}
        </Chip>
      </div>
      <p className="text-sm text-ink-muted">
        Tick busy weekdays, apply — free days get painted below (replaces
        current paint).
      </p>
      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  );
}
