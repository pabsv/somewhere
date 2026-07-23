"use client";

// Quick setup: tick recurring weekly available days, hit "Apply to calendar" —
// those days for the next 12 months are painted into the availability
// calendar below. The calendar is the single source of truth; this is just
// a fast way to fill it. Apply sequence lives in lib/useQuickSetup.ts,
// shared with the /welcome onboarding wizard.

import { useEffect, useState } from "react";
import Chip from "@/components/ui/Chip";
import {
  getAvailability,
  getPreferences,
  putAvailability,
  putPreferences,
} from "@/lib/client";
import {
  useQuickSetup,
  WEEKDAYS,
  AVAILABILITY_SNAPSHOT_EVENT,
  AVAILABILITY_UPDATED_EVENT,
} from "@/lib/useQuickSetup";
import { useUniCalendar } from "@/lib/university/context";
import type { DateWindow, Preferences } from "@/types/api";

const UNDO_WINDOW_MS = 15_000;

interface UndoAction {
  windows: DateWindow[];
  busyWeekdays: number[] | null;
}

async function currentAvailability(): Promise<DateWindow[]> {
  const captured: { windows?: DateWindow[] } = {};
  window.dispatchEvent(
    new CustomEvent(AVAILABILITY_SNAPSHOT_EVENT, {
      detail: {
        respond: (windows: DateWindow[]) => {
          captured.windows = windows;
        },
      },
    }),
  );

  if (captured.windows) return captured.windows;
  return (await getAvailability()).windows;
}

export default function AcademicCard() {
  const { setUniversity } = useUniCalendar();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const { busy, setBusy, toggle, applying, apply } = useQuickSetup();
  const [message, setMessage] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [savingUniversity, setSavingUniversity] = useState(false);

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setPrefs(p);
        setBusy(p.busy_weekdays ?? []);
      })
      .catch(() => setMessage("Couldn’t load preferences."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!undo || applying || undoing || clearing) return;
    const timeout = window.setTimeout(() => setUndo(null), UNDO_WINDOW_MS);
    return () => window.clearTimeout(timeout);
  }, [undo, applying, undoing, clearing]);

  const onApply = async () => {
    if (!prefs) return;
    setMessage(null);
    setCapturing(true);
    let previousWindows: DateWindow[];
    try {
      previousWindows = await currentAvailability();
    } catch {
      setMessage("Couldn’t safely apply — try again.");
      setCapturing(false);
      return;
    }
    setCapturing(false);
    setUndo({
      windows: previousWindows,
      busyWeekdays: [...(prefs.busy_weekdays ?? [])],
    });
    try {
      const { prefs: updated } = await apply();
      setPrefs(updated);
    } catch {
      setMessage("Couldn’t apply — try again.");
    }
  };

  const onClear = async () => {
    setMessage(null);
    setCapturing(true);
    let previousWindows: DateWindow[];
    try {
      previousWindows = await currentAvailability();
    } catch {
      setMessage("Couldn’t safely clear the calendar — try again.");
      setCapturing(false);
      return;
    }
    setCapturing(false);
    setClearing(true);
    try {
      await putAvailability([]);
      window.dispatchEvent(
        new CustomEvent<{ windows: DateWindow[] }>(AVAILABILITY_UPDATED_EVENT, {
          detail: { windows: [] },
        }),
      );
      setUndo(
        previousWindows.length > 0
          ? { windows: previousWindows, busyWeekdays: null }
          : null,
      );
    } catch {
      setMessage("Couldn’t clear the calendar — try again.");
    } finally {
      setClearing(false);
    }
  };

  const onUndo = async () => {
    if (!undo || !prefs) return;
    const previous = undo;
    setUndo(null);
    setUndoing(true);
    setMessage(null);

    // Restore the local calendar first. This also cancels a pending autosave
    // from Clear all before the server restoration runs.
    window.dispatchEvent(
      new CustomEvent<{ windows: DateWindow[] }>(AVAILABILITY_UPDATED_EVENT, {
        detail: { windows: previous.windows },
      }),
    );

    try {
      await putAvailability(previous.windows);
    } catch {
      window.dispatchEvent(new Event(AVAILABILITY_UPDATED_EVENT));
      setMessage("Couldn’t restore your previous availability — try again.");
      setUndoing(false);
      return;
    }

    if (previous.busyWeekdays) {
      try {
        const updated = await putPreferences({
          busy_weekdays: previous.busyWeekdays,
        });
        setPrefs(updated);
        setBusy(previous.busyWeekdays);
      } catch {
        setMessage(
          "Calendar restored, but the quick-setup weekdays couldn’t be restored.",
        );
        setUndoing(false);
        return;
      }
    }

    setMessage("Previous availability restored.");
    setUndoing(false);
  };

  const onToggleUniversity = async () => {
    if (!prefs || savingUniversity) return;

    const previous = prefs.university ?? null;
    const next: Preferences["university"] =
      previous === "tue" ? null : "tue";
    const optimistic: Preferences = { ...prefs, university: next };

    setMessage(null);
    setPrefs(optimistic);
    setUniversity(next);
    setSavingUniversity(true);
    try {
      const updated = await putPreferences({ university: next });
      setPrefs(updated);
      setUniversity(updated.university ?? null);
    } catch {
      setPrefs(prefs);
      setUniversity(previous);
      setMessage("Couldn’t update the TU/e calendar — try again.");
    } finally {
      setSavingUniversity(false);
    }
  };

  if (!prefs) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  const controlsBusy = applying || undoing || capturing || clearing;
  const universityOn = prefs.university === "tue";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink">
          Quick setup
        </p>
        <p className="text-sm text-ink-muted">
          Select the weekdays you&apos;re usually available. Yellow means
          selected. Applying fills the next 12 months and replaces your current
          calendar.
        </p>
      </div>
      <div className="space-y-4 lg:flex lg:items-center lg:gap-2 lg:space-y-0">
        <div className="grid grid-cols-7 gap-1.5 sm:flex sm:items-center sm:gap-2 lg:shrink-0">
          {WEEKDAYS.map((d) => (
            <Chip
              key={d.iso}
              size="sm"
              appearance="availability"
              selected={busy.includes(d.iso)}
              onClick={() => toggle(d.iso)}
              disabled={controlsBusy}
              className="w-full min-w-0 justify-center px-0 sm:w-auto sm:px-2.5"
            >
              {d.label}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 sm:flex lg:shrink-0">
          <Chip
            size="sm"
            onClick={onApply}
            disabled={controlsBusy || busy.length === 0 || busy.length === 7}
            className="justify-center whitespace-nowrap sm:px-3.5 sm:py-1.5 sm:text-sm"
          >
            {applying ? "Applying…" : "Apply to calendar"}
          </Chip>
          <Chip
            size="sm"
            onClick={onClear}
            disabled={controlsBusy}
            className="whitespace-nowrap text-ink-muted hover:border-alert hover:text-alert disabled:cursor-not-allowed disabled:opacity-40 sm:px-3.5 sm:py-1.5 sm:text-sm"
          >
            {clearing ? "Clearing…" : "Clear all"}
          </Chip>
          <button
            type="button"
            onClick={onUndo}
            disabled={controlsBusy || !undo}
            aria-label="Undo the last calendar change"
            className="inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-steal transition-colors hover:bg-steal/10 disabled:cursor-not-allowed disabled:text-ink-muted disabled:hover:bg-transparent sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-sm"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ↶
            </span>
            Undo
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:min-w-0 lg:flex-nowrap">
          <Chip
            size="sm"
            selected={universityOn}
            onClick={onToggleUniversity}
            disabled={controlsBusy || savingUniversity}
            title="Show TU/e exams and holidays on the calendar"
            className="shrink-0"
          >
            TU/e student
          </Chip>
          {universityOn && (
            <span className="flex items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  aria-hidden="true"
                  className="inline-block h-[3px] w-4 rounded-full"
                  style={{ backgroundColor: "var(--color-uni-exam)" }}
                />
                TU/e exams
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  aria-hidden="true"
                  className="inline-block h-[3px] w-4 rounded-full"
                  style={{ backgroundColor: "var(--color-uni-break)" }}
                />
                TU/e holidays
              </span>
            </span>
          )}
        </div>
      </div>
      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  );
}
