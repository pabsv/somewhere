"use client";

// Quick setup: tick recurring weekly busy days, hit "Apply to calendar" —
// the free gaps for the next 12 months are painted into the availability
// calendar below. The calendar is the single source of truth; this is just
// a fast way to fill it. Apply sequence lives in lib/useQuickSetup.ts,
// shared with the /welcome onboarding wizard.

import { useEffect, useState } from "react";
import Chip from "@/components/ui/Chip";
import { getPreferences } from "@/lib/client";
import { useQuickSetup, WEEKDAYS, AVAILABILITY_UPDATED_EVENT } from "@/lib/useQuickSetup";
import type { Preferences } from "@/types/api";

// Re-exported: YearPaint listens for this event name.
export { AVAILABILITY_UPDATED_EVENT };

export default function AcademicCard() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const { busy, setBusy, toggle, applying, apply } = useQuickSetup();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setPrefs(p);
        setBusy(p.busy_weekdays ?? []);
      })
      .catch(() => setMessage("Couldn’t load preferences."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = async () => {
    if (!prefs) return;
    setMessage(null);
    try {
      const { windows, prefs: updated } = await apply(prefs);
      setPrefs(updated);
      setMessage(
        `Painted ${windows.length} free window(s) into your calendar below — fine-tune there.`,
      );
    } catch {
      setMessage("Couldn’t apply — try again.");
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
          onClick={onApply}
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
