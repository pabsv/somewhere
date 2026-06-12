"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Button from "@/components/ui/Button";
import { getAvailability, putAvailability, ApiError } from "@/lib/client";
import { AVAILABILITY_UPDATED_EVENT } from "@/components/settings/AcademicCard";
import { parseLocalDate } from "@/lib/format";
import type { DateWindow } from "@/types/api";

// ─── Date helpers (local, YYYY-MM-DD strings throughout) ─────────────────────

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const MONTHS_AHEAD = 12;

// Brand-yellow diagonal hatch for painted (available) days — the single
// sanctioned yellow use on this surface (DESIGN_V1 §F). Inline so we don't
// touch the frozen globals.css.
const HATCH_STYLE = {
  backgroundColor: "color-mix(in srgb, var(--color-brand) 22%, transparent)",
  backgroundImage:
    "repeating-linear-gradient(45deg, var(--color-brand) 0, var(--color-brand) 2px, transparent 2px, transparent 6px)",
} as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayKey(): string {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Days in a 0-indexed month. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday-first weekday index (0=Mon … 6=Sun) for the 1st of a month. */
function firstWeekdayMonFirst(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

/** Step a YYYY-MM-DD string by N days, returning a new YYYY-MM-DD string. */
function addDays(key: string, n: number): string {
  const d = parseLocalDate(key);
  d.setDate(d.getDate() + n);
  return toKey(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Inclusive set of YYYY-MM-DD keys between a and b (order-agnostic). */
function keysBetween(a: string, b: string): string[] {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const out: string[] = [];
  let cur = lo;
  // guard against runaway loops
  for (let i = 0; i < 800 && cur <= hi; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Collapse a set of painted day-keys into contiguous DateWindow runs. */
function keysToWindows(keys: Set<string>): DateWindow[] {
  const sorted = [...keys].sort();
  const windows: DateWindow[] = [];
  let runStart: string | null = null;
  let prev: string | null = null;

  for (const k of sorted) {
    if (runStart === null) {
      runStart = k;
      prev = k;
      continue;
    }
    if (prev !== null && addDays(prev, 1) === k) {
      prev = k;
    } else {
      windows.push({ start_date: runStart, end_date: prev as string });
      runStart = k;
      prev = k;
    }
  }
  if (runStart !== null && prev !== null) {
    windows.push({ start_date: runStart, end_date: prev });
  }
  return windows;
}

/** Expand DateWindow[] into a flat set of day keys. */
function windowsToKeys(windows: DateWindow[]): Set<string> {
  const set = new Set<string>();
  for (const w of windows) {
    for (const k of keysBetween(w.start_date, w.end_date)) set.add(k);
  }
  return set;
}

// ─── Month grid model ────────────────────────────────────────────────────────

interface MonthModel {
  year: number;
  month: number; // 0-indexed
  label: string;
  /** leading blank cells before day 1 (Mon-first) */
  lead: number;
  days: number;
}

function buildMonths(count: number): MonthModel[] {
  const now = new Date();
  const out: MonthModel[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    out.push({
      year,
      month,
      label: `${MONTH_NAMES[month]} ${year}`,
      lead: firstWeekdayMonFirst(year, month),
      days: daysInMonth(year, month),
    });
  }
  return out;
}

// ─── Component ───────────────────────────────────────────────────────────────

type Mode = "loading" | "ready" | "error";

interface DragState {
  /** the day where the pointer went down */
  anchor: string;
  /** true = painting (anchor was empty), false = erasing (anchor was painted) */
  painting: boolean;
}

export default function YearPaint() {
  const months = useMemo(() => buildMonths(MONTHS_AHEAD), []);
  const today = useMemo(() => todayKey(), []);

  const [painted, setPainted] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  // pointer-drag paint state
  const drag = useRef<DragState | null>(null);
  // keyboard fallback (Enter/Space): a pending start day for the two-click flow
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  // ─── Load existing windows on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setMode("loading");
    getAvailability()
      .then((res) => {
        if (cancelled) return;
        setPainted(windowsToKeys(res.windows));
        setMode("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError("Sign in to continue.");
        } else {
          setLoadError(
            e instanceof Error ? e.message : "Could not load your dates.",
          );
        }
        setMode("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Re-sync when Quick setup rewrites the windows ──────────────────────────
  useEffect(() => {
    const onUpdated = () => {
      getAvailability()
        .then((res) => setPainted(windowsToKeys(res.windows)))
        .catch(() => {
          /* keep current paint on refresh failure */
        });
    };
    window.addEventListener(AVAILABILITY_UPDATED_EVENT, onUpdated);
    return () =>
      window.removeEventListener(AVAILABILITY_UPDATED_EVENT, onUpdated);
  }, []);

  // ─── Paint mutation helpers ─────────────────────────────────────────────────
  const applyRange = useCallback(
    (from: string, to: string, painting: boolean) => {
      setPainted((prev) => {
        const next = new Set(prev);
        for (const k of keysBetween(from, to)) {
          if (painting) next.add(k);
          else next.delete(k);
        }
        return next;
      });
    },
    [],
  );

  // ─── Pointer drag (mouse / touch / pen) ─────────────────────────────────────
  // pointerdown arms a drag from the anchor cell; pointerenter extends it;
  // pointerup (window listener) commits. A down+up on the SAME cell with no
  // movement is treated as a single-day toggle. All painting happens here, so
  // we suppress the synthetic mouse `click` to avoid double-handling.
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, key: string) => {
      if (e.button !== 0) return; // primary button / touch only
      const painting = !painted.has(key);
      drag.current = { anchor: key, painting };
      applyRange(key, key, painting);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture is best-effort; harmless if unsupported
      }
    },
    [painted, applyRange],
  );

  const onPointerEnter = useCallback(
    (key: string) => {
      const d = drag.current;
      if (!d) return;
      // repaint the whole anchor→current span so reversing direction is clean
      applyRange(d.anchor, key, d.painting);
    },
    [applyRange],
  );

  // end the drag on pointer-up anywhere (window listener so drags off-grid end)
  useEffect(() => {
    function end() {
      drag.current = null;
    }
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  // ─── Keyboard fallback (two-click window flow) ──────────────────────────────
  // Keyboard-activated clicks have detail === 0 (no associated pointer). Mouse
  // clicks (detail >= 1) are already handled by the pointer drag above, so we
  // ignore them here. First keyboard activation sets a pending start; the second
  // paints the inclusive span.
  const onKeyActivate = useCallback(
    (key: string) => {
      if (pendingStart === null) {
        setPendingStart(key);
        return;
      }
      applyRange(pendingStart, key, true);
      setPendingStart(null);
    },
    [pendingStart, applyRange],
  );

  // ─── Derived windows ────────────────────────────────────────────────────────
  const windows = useMemo(() => keysToWindows(painted), [painted]);

  // ─── Save ────────────────────────────────────────────────────────────────────
  const onSave = useCallback(() => {
    setSaving(true);
    setSaveMsg(null);
    putAvailability(windows)
      .then((res) => {
        setPainted(windowsToKeys(res.windows));
        setSaveMsg({ kind: "ok", text: "Saved ✓" });
      })
      .catch((e) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setSaveMsg({ kind: "err", text: "Sign in to save." });
        } else {
          setSaveMsg({
            kind: "err",
            text: e instanceof Error ? e.message : "Could not save.",
          });
        }
      })
      .finally(() => setSaving(false));
  }, [windows]);

  // auto-fade the saved message
  useEffect(() => {
    if (saveMsg?.kind !== "ok") return;
    const t = setTimeout(() => setSaveMsg(null), 2000);
    return () => clearTimeout(t);
  }, [saveMsg]);

  const clearAll = useCallback(() => {
    setPainted(new Set());
    setPendingStart(null);
  }, []);

  // ─── Render: error / loading gates ──────────────────────────────────────────
  if (mode === "error") {
    return (
      <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted">
        {loadError}
      </div>
    );
  }

  if (mode === "loading") {
    return <YearPaintSkeleton />;
  }

  return (
    <div>
      {/* actions + hint */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <button
          type="button"
          onClick={clearAll}
          disabled={windows.length === 0}
          className="text-sm text-ink-muted transition-colors hover:text-alert disabled:opacity-40"
        >
          Clear all
        </button>
        {saveMsg && (
          <span
            className={`text-sm transition-opacity ${
              saveMsg.kind === "ok" ? "text-steal" : "text-alert"
            }`}
          >
            {saveMsg.text}
          </span>
        )}
        <span className="text-sm text-ink-muted/70">
          Drag to paint free days, drag again to erase.
        </span>
        {pendingStart && (
          <span className="font-mono text-xs text-ink">
            Pick an end day for {prettyDay(pendingStart)} — or{" "}
            <button
              type="button"
              onClick={() => setPendingStart(null)}
              className="underline underline-offset-2 hover:text-alert"
            >
              cancel
            </button>
          </span>
        )}
      </div>

      {/* month grids */}
      <div
        className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
        style={{ touchAction: "none" }}
      >
        {months.map((m) => (
          <MonthGrid
            key={`${m.year}-${m.month}`}
            model={m}
            today={today}
            painted={painted}
            pendingStart={pendingStart}
            onPointerDown={onPointerDown}
            onPointerEnter={onPointerEnter}
            onKeyActivate={onKeyActivate}
          />
        ))}
      </div>


    </div>
  );
}

// ─── One month grid ────────────────────────────────────────────────────────────

interface MonthGridProps {
  model: MonthModel;
  today: string;
  painted: Set<string>;
  pendingStart: string | null;
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>, key: string) => void;
  onPointerEnter: (key: string) => void;
  onKeyActivate: (key: string) => void;
}

function MonthGrid({
  model,
  today,
  painted,
  pendingStart,
  onPointerDown,
  onPointerEnter,
  onKeyActivate,
}: MonthGridProps) {
  const { year, month, label, lead, days } = model;

  return (
    <div className="select-none">
      <h3 className="mb-2 font-display text-sm font-semibold text-ink">
        {label}
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="pb-1 text-center font-mono text-[10px] uppercase tracking-wide text-ink-muted/60"
          >
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const key = toKey(year, month, day);
          const isPast = key < today;
          const isToday = key === today;
          const isPainted = painted.has(key);
          const isPending = pendingStart === key;

          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              aria-pressed={isPainted}
              aria-label={`${day} ${label}${isPainted ? " — free" : ""}`}
              onPointerDown={(e) => {
                if (isPast) return;
                onPointerDown(e, key);
              }}
              onPointerEnter={() => {
                if (isPast) return;
                onPointerEnter(key);
              }}
              onClick={(e) => {
                if (isPast) return;
                // Mouse clicks (detail >= 1) are handled by the pointer drag;
                // only keyboard activations (detail === 0) take this path.
                if (e.detail === 0) onKeyActivate(key);
              }}
              style={isPainted ? HATCH_STYLE : undefined}
              className={[
                "tnum relative aspect-square rounded-[5px] text-center font-mono text-xs transition-colors",
                isPast
                  ? "cursor-default text-ink-muted/25"
                  : "cursor-pointer hover:ring-1 hover:ring-ink/15",
                isPainted ? "text-brand-ink font-semibold" : "text-ink",
                isPending ? "ring-2 ring-ink" : "",
                isToday && !isPainted ? "ring-1 ring-ink/40" : "",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function YearPaintSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, m) => (
        <div key={m}>
          <div className="mb-2 h-4 w-28 animate-pulse rounded bg-line" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-[5px] bg-line"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── tiny local formatter for the pending-start hint ──────────────────────────
function prettyDay(key: string): string {
  const d = parseLocalDate(key);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}
