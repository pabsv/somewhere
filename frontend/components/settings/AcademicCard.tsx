"use client";

// Quick setup (availability v2 — docs/AVAILABILITY_V2.md): enable the TU/e
// academic calendar and tick the mandatory-attendance weekdays per quartile.
// Exams + the 2 weeks before are blocked automatically; recesses, holidays
// and post-exam weeks are free. Painted windows below override everything.

import { useEffect, useState } from "react";
import Chip from "@/components/ui/Chip";
import { getPreferences, putPreferences } from "@/lib/client";
import { listCalendars } from "@/lib/academic";
import type { BusyWeekdaysPref, Preferences } from "@/types/api";

const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Mon" },
  { iso: 2, label: "Tue" },
  { iso: 3, label: "Wed" },
  { iso: 4, label: "Thu" },
  { iso: 5, label: "Fri" },
];

const QUARTILES = ["q1", "q2", "q3", "q4"] as const;

const EMPTY_BW: BusyWeekdaysPref = { q1: [], q2: [], q3: [], q4: [] };

export default function AcademicCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then(setPrefs)
      .catch(() => setMessage("Couldn’t load preferences."));
  }, []);

  const calendar = listCalendars()[0]; // single registered calendar for now
  const enabled = prefs?.academic_calendar === calendar.id;
  const bw: BusyWeekdaysPref = prefs?.busy_weekdays ?? EMPTY_BW;

  const save = async (next: Preferences, okMessage: string) => {
    setSaving(true);
    setMessage(null);
    try {
      setPrefs(await putPreferences(next));
      setMessage(okMessage);
    } catch {
      setMessage("Save failed — try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = () => {
    if (!prefs) return;
    void save(
      {
        ...prefs,
        academic_calendar: enabled ? null : calendar.id,
        busy_weekdays: bw,
      },
      enabled ? "Academic calendar off." : `Using ${calendar.name}.`,
    );
  };

  const toggleWeekday = (q: (typeof QUARTILES)[number], iso: number) => {
    if (!prefs) return;
    const list = bw[q].includes(iso)
      ? bw[q].filter((d) => d !== iso)
      : [...bw[q], iso].sort();
    void save(
      { ...prefs, busy_weekdays: { ...bw, [q]: list } },
      "Mandatory days saved.",
    );
  };

  if (!prefs) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      {/* enable toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <Chip selected={enabled} onClick={toggleEnabled} disabled={saving}>
          {calendar.name}
        </Chip>
        <span className="text-sm text-ink-muted">
          {enabled
            ? "Exams + the 2 weeks before are blocked; recesses, holidays and post-exam weeks are free."
            : "Off — only your painted windows apply."}
        </span>
      </div>

      {/* per-quartile mandatory weekdays */}
      {enabled && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Days you must be on campus (per quartile)
          </p>
          {QUARTILES.map((q) => (
            <div key={q} className="flex flex-wrap items-center gap-2">
              <span className="tnum w-7 font-mono text-xs uppercase text-ink-muted">
                {q.toUpperCase()}
              </span>
              {WEEKDAYS.map((d) => (
                <Chip
                  key={d.iso}
                  size="sm"
                  selected={bw[q].includes(d.iso)}
                  onClick={() => toggleWeekday(q, d.iso)}
                  disabled={saving}
                >
                  {d.label}
                </Chip>
              ))}
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  );
}
