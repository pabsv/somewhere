"use client";

// First-run onboarding — a "boarding sequence" through six steps:
// CHECK-IN → ORIGINS → CALENDAR → DESTINATIONS → ALERTS → DEPARTURES.
// Reaching the last step (DEPARTURES) marks onboarding complete server-side.
// Every network write reuses the exact same client calls as Settings
// (putPreferences / putAvailability / useSavedCities), so nothing here
// invents a parallel data path.

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  getAvailability,
  getPreferences,
  putPreferences,
  getCities,
} from "@/lib/client";
import { useSavedCities } from "@/lib/saved-cities";
import {
  AVAILABILITY_SAVED_EVENT,
  AVAILABILITY_UPDATED_EVENT,
} from "@/lib/useQuickSetup";
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
  const previewCalendar =
    process.env.NODE_ENV === "development" &&
    params.get("preview") === "calendar";
  const { update } = useSession();
  const { isSaved } = useSavedCities();

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(previewCalendar ? 2 : 0);
  const [furthestStep, setFurthestStep] = useState(previewCalendar ? 2 : 0);
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [originsSelected, setOriginsSelected] = useState<string[]>([]);
  const [notifyOptin, setNotifyOptin] = useState(false);
  const [hasAvailability, setHasAvailability] = useState(false);

  const [payoffRows, setPayoffRows] = useState<DepartureRow[] | null>(null);

  // ─── Gate + seed ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pendingRes, p, availability] = await Promise.all([
          fetch("/api/onboarding").then((r) => r.json()),
          getPreferences(),
          getAvailability(),
        ]);
        if (cancelled) return;
        if (!pendingRes.pending && !previewCalendar) {
          router.replace(next);
          return;
        }
        setPrefs(p);
        setOriginsSelected(p.origins);
        setNotifyOptin(!!p.notify_optin);
        setHasAvailability(availability.windows.length > 0);
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

  useEffect(() => {
    const onAvailabilityUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ windows?: unknown[] }>).detail;
      if (detail?.windows) setHasAvailability(detail.windows.length > 0);
    };
    window.addEventListener(AVAILABILITY_UPDATED_EVENT, onAvailabilityUpdated);
    window.addEventListener(AVAILABILITY_SAVED_EVENT, onAvailabilityUpdated);
    return () =>
      [AVAILABILITY_UPDATED_EVENT, AVAILABILITY_SAVED_EVENT].forEach((event) =>
        window.removeEventListener(event, onAvailabilityUpdated),
      );
  }, []);

  // ─── Completion ─────────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(async () => {
    if (previewCalendar) return;
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
  }, [previewCalendar, update]);

  const leave = useCallback(() => {
    router.replace(next);
  }, [router, next]);

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
        const updated = await putPreferences({ origins: originsSelected });
        setPrefs(updated);
      } else if (step === 4 && prefs) {
        const updated = await putPreferences({ notify_optin: notifyOptin });
        setPrefs(updated);
      }
    } catch {
      // a save hiccup shouldn't strand the user mid-wizard — Settings covers retry
    } finally {
      setSaving(false);
      setStep((s) => {
        const nextStep = Math.min(s + 1, LAST_STEP);
        setFurthestStep((furthest) => Math.max(furthest, nextStep));
        return nextStep;
      });
    }
  }, [step, prefs, originsSelected, notifyOptin]);

  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  if (!ready) return null;

  // The calendar step hosts the full Settings-size YearPaint — give it the
  // whole page width; every other step stays a focused narrow column.
  const wide = step === 2;
  const currentStepComplete =
    step === 0 ||
    (step === 1 && originsSelected.length > 0) ||
    (step === 2 && hasAvailability) ||
    step === 3 ||
    step === 4 ||
    step === LAST_STEP;
  const furthestClickableStep = Math.min(
    LAST_STEP,
    Math.max(furthestStep, currentStepComplete ? step + 1 : step),
  );

  return (
    <div
      className={`mx-auto flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center px-4 py-10 sm:px-6 ${
        wide ? "max-w-6xl" : "max-w-2xl"
      }`}
    >
      {/* ─── Progress ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-2 flex items-center">
          <span className="tnum font-mono text-xs uppercase tracking-widest text-ink-muted">
            {String(step + 1).padStart(2, "0")} / {STEP_LABELS.length} — {STEP_LABELS[step]}
          </span>
        </div>
        <nav className="flex gap-1" aria-label="Onboarding progress">
          {STEP_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (i > furthestStep) goNext();
                else if (i !== step) setStep(i);
              }}
              disabled={i > furthestClickableStep || i === step || saving}
              aria-current={i === step ? "step" : undefined}
              aria-label={`${i + 1}. ${label}${
                i <= furthestClickableStep && i !== step
                  ? " — go to this step"
                  : ""
              }`}
              className={`group relative flex h-5 flex-1 items-center ${
                i <= furthestClickableStep && i !== step
                  ? "cursor-pointer"
                  : "cursor-default"
              }`}
            >
              <span
                className={`h-1 w-full rounded-full transition-[height,background-color] ${
                  i <= step ? "bg-brand" : "bg-line"
                } ${i <= furthestClickableStep && i !== step ? "group-hover:h-1.5 group-focus-visible:h-1.5" : ""}`}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-(--radius-tag) bg-ink px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-paper opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {String(i + 1).padStart(2, "0")} — {label}
              </span>
            </button>
          ))}
        </nav>
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
        {step === 2 && <CalendarStep />}
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
