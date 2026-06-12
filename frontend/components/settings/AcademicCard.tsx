"use client";

// Academic calendar card (availability v2 — docs/AVAILABILITY_V2.md):
// enable the TU/e calendar, set mandatory-attendance weekdays per quartile,
// copy the LLM interview prompt, and import the resulting JSON.

import { useEffect, useState } from "react";
import Chip from "@/components/ui/Chip";
import { getPreferences, putPreferences, putAvailability } from "@/lib/client";
import { listCalendars } from "@/lib/academic";
import { INTERVIEW_PROMPT } from "@/data/interviewPrompt";
import {
  AvailabilityImportSchema,
  type BusyWeekdaysPref,
  type Preferences,
} from "@/types/api";

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
  const [importText, setImportText] = useState("");

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

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(INTERVIEW_PROMPT);
      setMessage("Interview prompt copied — paste it into any AI chat.");
    } catch {
      setMessage("Clipboard blocked — copy from docs/AVAILABILITY_V2.md.");
    }
  };

  const runImport = async () => {
    if (!prefs) return;
    setMessage(null);
    let raw: unknown;
    try {
      // tolerate a ```json fence around the block
      raw = JSON.parse(
        importText.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, ""),
      );
    } catch {
      setMessage("That isn’t valid JSON.");
      return;
    }
    const parsed = AvailabilityImportSchema.safeParse(raw);
    if (!parsed.success) {
      setMessage("JSON doesn’t match the expected shape — re-copy the prompt and retry.");
      return;
    }
    const imp = parsed.data;
    setSaving(true);
    try {
      const nextPrefs = await putPreferences({
        ...prefs,
        academic_calendar: imp.academic_calendar,
        busy_weekdays: imp.busy_weekdays,
        ...(imp.trip_min_nights != null
          ? { trip_min_nights: imp.trip_min_nights }
          : {}),
        ...(imp.trip_max_nights != null
          ? { trip_max_nights: imp.trip_max_nights }
          : {}),
      });
      await putAvailability(imp.windows);
      setPrefs(nextPrefs);
      setImportText("");
      setMessage(
        `Imported: calendar ${imp.academic_calendar ?? "off"}, ${imp.windows.length} window(s). Painted windows were replaced.`,
      );
    } catch {
      setMessage("Import failed — try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="space-y-5">
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
            Mandatory attendance days (can’t travel over these on teaching
            weeks)
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

      {/* LLM interview: copy + import */}
      <div className="space-y-2 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <Chip onClick={copyPrompt}>Copy interview prompt</Chip>
          <span className="text-sm text-ink-muted">
            Paste it into any AI chat, answer the questions, paste the JSON it
            gives you below.
          </span>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"version": 1, "academic_calendar": "tue-2026-2027", …}'
          rows={4}
          className="w-full rounded-(--radius-tag) border border-line bg-paper p-3 font-mono text-xs text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
        />
        <Chip
          onClick={runImport}
          disabled={saving || importText.trim().length === 0}
        >
          Import
        </Chip>
      </div>

      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  );
}
