"use client";

// First-run onboarding — a "boarding sequence" through six steps:
// CHECK-IN → ORIGINS → CALENDAR → DESTINATIONS → ALERTS → DEPARTURES.
// Reaching the last step (DEPARTURES) marks onboarding complete server-side;
// "Skip for now" from any earlier step does the same and leaves immediately.
// Every network write reuses the exact same client calls as Settings
// (putPreferences / putAvailability / useSavedCities), so nothing here
// invents a parallel data path.

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getPreferences, putPreferences, getCities } from "@/lib/client";
import { useSavedCities } from "@/lib/saved-cities";
import { useUniCalendar } from "@/lib/university/context";
import { formatDateBoard } from "@/lib/format";
import type { Preferences } from "@/types/api";
import type { DepartureRow } from "@/components/board/DepartureBoard";

import CheckInStep from "./steps/CheckInStep";
import OriginsStep from "./steps/OriginsStep";
import CalendarStep from "./steps/CalendarStep";
import DestinationsStep from "./steps/DestinationsStep";
import AlertsStep from "./steps/AlertsStep";
import PayoffStep from "./steps/PayoffStep";

const STEP_LABELS = [
  "CHECK-IN",
  "ORIGINS",
  "CALENDAR",
  "DESTINATIONS",
  "ALERTS",
  "DEPARTURES",
] as const;
const LAST_STEP = STEP_LABELS.length - 1;
const DONE_KEY = "somewhere:onboarding-done";

export default function OnboardingWizard() {
  const router = useRouter();
  const params = useSearchParams();
  // Land on the calendar after onboarding unless the signup flow carried a
  // meaningful destination (e.g. a /join/<token> round trip).
  const rawNext = params.get("next");
  const next = rawNext && rawNext !== "/" ? rawNext : "/calendar";
  const { update } = useSession();
  const { isSaved } = useSavedCities();
  const { setUniversity } = useUniCalendar();

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [originsSelected, setOriginsSelected] = useState<string[]>([]);
  const [notifyOptin, setNotifyOptin] = useState(false);
  const [universityOn, setUniversityOn] = useState(false);

  const [payoffRows, setPayoffRows] = useState<DepartureRow[] | null>(null);

  // ─── Gate + seed ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pendingRes, p] = await Promise.all([
          fetch("/api/onboarding").then((r) => r.json()),
          getPreferences(),
        ]);
        if (cancelled) return;
        if (!pendingRes.pending) {
          router.replace(next);
          return;
        }
        setPrefs(p);
        setOriginsSelected(p.origins);
        setNotifyOptin(!!p.notify_optin);
        setUniversityOn(p.university === "tue");
      } catch {
        // fail open — don't trap the user behind a blank screen
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Completion ─────────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(async () => {
    try {
      await fetch("/api/onboarding", { method: "POST" });
    } catch {
      // best-effort — OnboardingGate's sessionStorage flag still stops re-gating
    }
    try {
      await update();
    } catch {
      // token refresh best-effort; sessionStorage flag is the fallback guard
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DONE_KEY, "1");
    }
  }, [update]);

  const leave = useCallback(() => {
    router.replace(next);
  }, [router, next]);

  const skip = useCallback(() => {
    completeOnboarding().then(leave);
  }, [completeOnboarding, leave]);

  // ─── Reaching the payoff step = done; fetch origin-relevant deals ──────────
  useEffect(() => {
    if (step !== LAST_STEP) return;
    completeOnboarding();
    getCities({ from: originsSelected.length ? originsSelected : undefined })
      .then((res) => {
        const rows: DepartureRow[] = res.cities
          .slice()
          .sort((a, b) => {
            const sa = isSaved(a.code) ? 0 : 1;
            const sb = isSaved(b.code) ? 0 : 1;
            if (sa !== sb) return sa - sb;
            return a.best.price - b.best.price;
          })
          .slice(0, 6)
          .map((c) => ({
            origin: c.best.origin,
            destination: c.code,
            city: c.name,
            date: formatDateBoard(c.best.outbound_date),
            nights: c.best.nights,
            price: c.best.price,
            tier: c.best.deal_tier,
          }));
        setPayoffRows(rows);
      })
      .catch(() => setPayoffRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Step transitions ───────────────────────────────────────────────────────
  const goNext = useCallback(async () => {
    setSaving(true);
    try {
      if (step === 1 && prefs) {
        const updated = await putPreferences({ ...prefs, origins: originsSelected });
        setPrefs(updated);
      } else if (step === 2 && prefs) {
        // availability saves through AcademicCard / YearPaint themselves —
        // only the TU/e preference goes through the wizard
        const updated = await putPreferences({
          ...prefs,
          university: universityOn ? "tue" : null,
        });
        setPrefs(updated);
      } else if (step === 4 && prefs) {
        const updated = await putPreferences({ ...prefs, notify_optin: notifyOptin });
        setPrefs(updated);
      }
    } catch {
      // a save hiccup shouldn't strand the user mid-wizard — Settings covers retry
    } finally {
      setSaving(false);
      setStep((s) => Math.min(s + 1, LAST_STEP));
    }
  }, [step, prefs, originsSelected, universityOn, notifyOptin]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  if (!ready) return null;

  // The calendar step hosts the full Settings-size YearPaint — give it the
  // whole page width; every other step stays a focused narrow column.
  const wide = step === 2;

  return (
    <div
      className={`mx-auto flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center px-4 py-10 sm:px-6 ${
        wide ? "max-w-6xl" : "max-w-2xl"
      }`}
    >
      {/* ─── Progress ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="tnum font-mono text-xs uppercase tracking-widest text-ink-muted">
            {String(step + 1).padStart(2, "0")} / {STEP_LABELS.length} — {STEP_LABELS[step]}
          </span>
          {step < LAST_STEP && (
            <button
              type="button"
              onClick={skip}
              className="font-mono text-xs uppercase tracking-wide text-ink-muted underline hover:text-ink"
            >
              Skip for now
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-brand" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─── Step content ────────────────────────────────────────────────────── */}
      <div className="rounded-(--radius-card) border border-line bg-card p-6 shadow-(--shadow-card) sm:p-8">
        {step === 0 && <CheckInStep />}
        {step === 1 && (
          <OriginsStep
            selected={originsSelected}
            onToggle={(code) =>
              setOriginsSelected((prev) =>
                prev.includes(code)
                  ? prev.filter((c) => c !== code)
                  : [...prev, code],
              )
            }
          />
        )}
        {step === 2 && (
          <CalendarStep
            university={universityOn}
            onToggleUniversity={() => {
              const next = !universityOn;
              setUniversityOn(next);
              // live overlay on the YearPaint below (persisted on Next)
              setUniversity(next ? "tue" : null);
            }}
          />
        )}
        {step === 3 && <DestinationsStep />}
        {step === 4 && (
          <AlertsStep
            notifyOptin={notifyOptin}
            onToggle={() => setNotifyOptin((v) => !v)}
          />
        )}
        {step === 5 && <PayoffStep rows={payoffRows} onFinish={leave} />}

        {step < LAST_STEP && (
          <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="rounded-(--radius-tag) px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-0"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={saving}
              className="rounded-(--radius-tag) bg-ink px-6 py-2 text-sm font-medium text-paper transition-colors hover:bg-night disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : step === 0
                  ? "Set me up"
                  : step === LAST_STEP - 1
                    ? "Show me the deals"
                    : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
