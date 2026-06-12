"use client";

// Quick setup: recurring weekly busy days (lectures, work, sports — anything
// you can't travel over). A trip qualifies if it fits a painted window below,
// or touches none of these days. Empty = no weekly constraint.

import { useEffect, useState } from "react";
import Chip from "@/components/ui/Chip";
import { getPreferences, putPreferences } from "@/lib/client";
import type { Preferences } from "@/types/api";

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then(setPrefs)
      .catch(() => setMessage("Couldn’t load preferences."));
  }, []);

  const busy = prefs?.busy_weekdays ?? [];

  const toggleWeekday = async (iso: number) => {
    if (!prefs) return;
    const list = busy.includes(iso)
      ? busy.filter((d) => d !== iso)
      : [...busy, iso].sort();
    setSaving(true);
    setMessage(null);
    try {
      setPrefs(await putPreferences({ ...prefs, busy_weekdays: list }));
      setMessage(list.length === 0 ? "No weekly busy days." : "Saved.");
    } catch {
      setMessage("Save failed — try again.");
    } finally {
      setSaving(false);
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
            onClick={() => toggleWeekday(d.iso)}
            disabled={saving}
          >
            {d.label}
          </Chip>
        ))}
      </div>
      <p className="text-sm text-ink-muted">
        {busy.length === 0
          ? "No recurring busy days — trips can land on any weekday."
          : "Trips spanning these days are hidden, unless they fit a painted window below."}
      </p>
      {message && <p className="text-xs text-ink-muted">{message}</p>}
    </div>
  );
}
