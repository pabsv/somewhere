"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
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

// Brand-yellow paint for available days — the single sanctioned yellow use on
// this surface (DESIGN_V1 §F). Inline so we don't touch the frozen globals.css.
// A window renders as one connected run: SOLID brand on its first/last day
// (the endpoints), a faint tint on the days in between, bridged across the
// grid gaps. Endpoint overlays still map time vertically (top = 00:00 →
// bottom = 24:00) so a partial day (free from / back by) reads as a partial
// fill.
const ENDPOINT_BG = "var(--color-brand)";
const MID_BG = "color-mix(in srgb, var(--color-brand) 16%, transparent)";

// grid gap-1 = 4px — how far a run overlay reaches into the gap to fuse with
// the horizontally-adjacent cell
const GAP_PX = 4;

// vertical time-scrub: pixels of drag per hour step
const PX_PER_HOUR = 8;
// movement (px) below which a pointer gesture counts as a tap
const TAP_SLOP = 5;

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

// ─── Edge roles + times ───────────────────────────────────────────────────────
// A day's role within its painted window decides which edge time it can carry:
//   first  → "free from" (start_time)      last → "back by" (end_time)
//   single → both                          mid  → none (always a full day)

type Role = "first" | "last" | "mid" | "single";

function buildRoles(windows: DateWindow[]): Map<string, Role> {
  const roles = new Map<string, Role>();
  for (const w of windows) {
    if (w.start_date === w.end_date) {
      roles.set(w.start_date, "single");
      continue;
    }
    roles.set(w.start_date, "first");
    roles.set(w.end_date, "last");
    for (const k of keysBetween(addDays(w.start_date, 1), addDays(w.end_date, -1)))
      roles.set(k, "mid");
  }
  return roles;
}

function fmtHour(h: number): string {
  return `${pad(h)}:00`;
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

type DragMode = "pending" | "paint" | "time";
type Edge = "from" | "back";

interface DragState {
  /** the day where the pointer went down */
  anchor: string;
  x0: number;
  y0: number;
  pointerId: number;
  mode: DragMode;
  /** press position within the anchor cell: top or bottom half (single days) */
  topHalf: boolean;
  /** paint mode: true = painting (anchor was empty), false = erasing */
  painting: boolean;
  /** time mode */
  edge: Edge | null;
  base: number;
  /** paint mode: painted set as it was on pointerdown — each move rebuilds
      from this so shrinking/reversing the drag span un-paints cleanly */
  snapshot: Set<string>;
  /** paint mode: last day cell the pointer actually hit — reused while the
      pointer is over row gaps / month gutters where hit-testing finds nothing */
  lastKey: string | null;
  /** anchor's window role at pointerdown — frozen so mid-drag repaints don't
      flip the pull-from-edge paint/erase decision */
  anchorRole: Role | undefined;
}

interface BadgeState {
  x: number;
  y: number;
  text: string;
}

export default function YearPaint() {
  const months = useMemo(() => buildMonths(MONTHS_AHEAD), []);
  const today = useMemo(() => todayKey(), []);

  const [painted, setPainted] = useState<Set<string>>(new Set());
  // edge times: keyed by day key; only meaningful while that key is a window
  // first/last day (pruned when windows change)
  const [fromT, setFromT] = useState<Map<string, number>>(new Map());
  const [backT, setBackT] = useState<Map<string, number>>(new Map());
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [badge, setBadge] = useState<BadgeState | null>(null);

  // pointer-drag state (paint ranges OR scrub an edge time)
  const drag = useRef<DragState | null>(null);
  // true while a pointer gesture is in flight — pauses edge-time pruning so a
  // window edge dragged away and back keeps its "free from"/"back by" hour
  const [dragActive, setDragActive] = useState(false);
  // keyboard fallback (Enter/Space): a pending start day for the two-click flow
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  // ─── Derived windows + roles ────────────────────────────────────────────────
  const windows = useMemo(() => {
    const base = keysToWindows(painted);
    return base.map((w) => {
      const st = fromT.get(w.start_date);
      const et = backT.get(w.end_date);
      return {
        ...w,
        ...(st != null ? { start_time: st } : {}),
        ...(et != null ? { end_time: et } : {}),
      };
    });
  }, [painted, fromT, backT]);

  const roles = useMemo(() => buildRoles(windows), [windows]);

  // day key → its containing window's [start, end] (for hover-to-delete)
  const keyToWin = useMemo(() => {
    const m = new Map<string, { s: string; e: string }>();
    for (const w of windows)
      for (const k of keysBetween(w.start_date, w.end_date))
        m.set(k, { s: w.start_date, e: w.end_date });
    return m;
  }, [windows]);

  // window currently under the mouse — its last day shows a delete ×
  const [hoverWin, setHoverWin] = useState<{ s: string; e: string } | null>(
    null,
  );

  const onHoverCell = useCallback(
    (key: string | null) => {
      if (drag.current) return; // no × mid-gesture
      const w = key ? (keyToWin.get(key) ?? null) : null;
      setHoverWin((prev) =>
        prev?.s === w?.s && prev?.e === w?.e ? prev : w,
      );
    },
    [keyToWin],
  );

  const onDeleteWindow = useCallback((s: string, e: string) => {
    setPainted((prev) => {
      const next = new Set(prev);
      for (const k of keysBetween(s, e)) next.delete(k);
      return next;
    });
    setHoverWin(null);
  }, []);

  // prune edge times whose day stopped being a window edge (repaint/erase).
  // Paused mid-drag: pruning only settles once the gesture ends, so passing
  // over an edge day without ending there doesn't wipe its hours.
  useEffect(() => {
    if (dragActive) return;
    const firsts = new Set<string>();
    const lasts = new Set<string>();
    for (const [k, r] of roles) {
      if (r === "first" || r === "single") firsts.add(k);
      if (r === "last" || r === "single") lasts.add(k);
    }
    setFromT((prev) => {
      if (![...prev.keys()].some((k) => !firsts.has(k))) return prev;
      const next = new Map(prev);
      for (const k of prev.keys()) if (!firsts.has(k)) next.delete(k);
      return next;
    });
    setBackT((prev) => {
      if (![...prev.keys()].some((k) => !lasts.has(k))) return prev;
      const next = new Map(prev);
      for (const k of prev.keys()) if (!lasts.has(k)) next.delete(k);
      return next;
    });
  }, [roles, dragActive]);

  // ─── Load existing windows on mount ────────────────────────────────────────
  const seedFromWindows = useCallback((ws: DateWindow[]) => {
    setPainted(windowsToKeys(ws));
    const f = new Map<string, number>();
    const b = new Map<string, number>();
    for (const w of ws) {
      if (w.start_time != null) f.set(w.start_date, w.start_time);
      if (w.end_time != null) b.set(w.end_date, w.end_time);
    }
    setFromT(f);
    setBackT(b);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMode("loading");
    getAvailability()
      .then((res) => {
        if (cancelled) return;
        seedFromWindows(res.windows);
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
  }, [seedFromWindows]);

  // ─── Re-sync when Quick setup rewrites the windows ──────────────────────────
  useEffect(() => {
    const onUpdated = () => {
      getAvailability()
        .then((res) => seedFromWindows(res.windows))
        .catch(() => {
          /* keep current paint on refresh failure */
        });
    };
    window.addEventListener(AVAILABILITY_UPDATED_EVENT, onUpdated);
    return () =>
      window.removeEventListener(AVAILABILITY_UPDATED_EVENT, onUpdated);
  }, [seedFromWindows]);

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

  const toggleDay = useCallback((key: string) => {
    setPainted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // "free from" — clamp 5..23; below 5 clears to all-day; on a single day it
  // must leave at least one hour before "back by"
  const setFrom = useCallback(
    (key: string, raw: number, backHere: number | null) => {
      let v = Math.min(raw, 23);
      if (backHere != null) v = Math.min(v, backHere - 1);
      setFromT((prev) => {
        const next = new Map(prev);
        if (v < 5) next.delete(key);
        else next.set(key, v);
        return next;
      });
      return v < 5 ? null : v;
    },
    [],
  );

  // "back by" — clamp 1..23; above 23 clears to all-day; on a single day it
  // must sit at least one hour after "free from"
  const setBack = useCallback(
    (key: string, raw: number, fromHere: number | null) => {
      let v = Math.max(raw, 1);
      if (fromHere != null) v = Math.max(v, fromHere + 1);
      setBackT((prev) => {
        const next = new Map(prev);
        if (v > 23) next.delete(key);
        else next.set(key, v);
        return next;
      });
      return v > 23 ? null : v;
    },
    [],
  );

  // ─── Pointer gestures ────────────────────────────────────────────────────────
  // pointerdown arms a PENDING gesture. The first move past TAP_SLOP decides:
  //   mostly-vertical on a window edge day → TIME scrub (badge follows pointer)
  //   anything else                        → PAINT range (elementFromPoint)
  // pointerup with no move → tap = toggle the day. Pointer capture stays on the
  // anchor cell, so we hit-test with elementFromPoint for range painting.
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, key: string) => {
      if (e.button !== 0) return; // primary button / touch only
      const rect = e.currentTarget.getBoundingClientRect();
      drag.current = {
        anchor: key,
        x0: e.clientX,
        y0: e.clientY,
        pointerId: e.pointerId,
        mode: "pending",
        topHalf: e.clientY - rect.top < rect.height / 2,
        painting: !painted.has(key),
        edge: null,
        base: 0,
        snapshot: painted,
        lastKey: null,
        anchorRole: roles.get(key),
      };
      setDragActive(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // capture is best-effort; harmless if unsupported
      }
    },
    [painted, roles],
  );

  useEffect(() => {
    function keyUnderPointer(e: PointerEvent): string | null {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const btn = el?.closest?.("[data-daykey]");
      return btn?.getAttribute("data-daykey") ?? null;
    }

    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;

      if (d.mode === "pending") {
        if (Math.hypot(dx, dy) < TAP_SLOP) return;
        const role = roles.get(d.anchor);
        const vertical = Math.abs(dy) > Math.abs(dx);
        const canTime =
          role === "first" || role === "last" || role === "single";
        if (vertical && canTime) {
          d.mode = "time";
          d.edge =
            role === "first"
              ? "from"
              : role === "last"
                ? "back"
                : d.topHalf
                  ? "from"
                  : "back";
          d.base =
            d.edge === "from"
              ? (fromT.get(d.anchor) ?? 4)
              : (backT.get(d.anchor) ?? 24);
        } else {
          d.mode = "paint";
        }
      }

      if (d.mode === "paint") {
        const hit = keyUnderPointer(e);
        if (hit) d.lastKey = hit;
        const cur = hit ?? d.lastKey ?? d.anchor;
        // Anchoring on a window edge means "pull": dragging outward extends
        // the window (paint), dragging inward shrinks it (erase). Decided per
        // move — the snapshot rebuild below makes direction flips clean.
        let painting = d.painting;
        const role = d.anchorRole;
        const isEdgePull =
          !d.painting &&
          (role === "first" || role === "last" || role === "single");
        if (isEdgePull) {
          painting =
            role === "single" ||
            (role === "last" ? cur >= d.anchor : cur <= d.anchor);
        }
        // Inward edge pull: the day under the finger becomes the new window
        // edge, so erase strictly beyond it (not the anchor→cursor span
        // inclusive — that would make e.g. day 19 unreachable when pulling
        // back from day 20).
        let spanA = d.anchor;
        let spanB = cur;
        if (isEdgePull && !painting) {
          if (role === "last") spanB = addDays(cur, 1);
          else spanB = addDays(cur, -1);
        }
        // rebuild from the pointerdown snapshot + the current span, so
        // shrinking or reversing the drag un-paints what the drag itself
        // added (and only that)
        setPainted(() => {
          const next = new Set(d.snapshot);
          for (const k of keysBetween(spanA, spanB)) {
            if (painting) next.add(k);
            else next.delete(k);
          }
          return next;
        });
        return;
      }

      // time scrub
      const raw = d.base + Math.round((e.clientY - d.y0) / PX_PER_HOUR);
      const role = roles.get(d.anchor);
      let text: string;
      if (d.edge === "from") {
        const backHere =
          role === "single" ? (backT.get(d.anchor) ?? null) : null;
        const v = setFrom(d.anchor, raw, backHere);
        text = v == null ? "free all day" : `free from ${fmtHour(v)}`;
      } else {
        const fromHere =
          role === "single" ? (fromT.get(d.anchor) ?? null) : null;
        const v = setBack(d.anchor, raw, fromHere);
        text = v == null ? "free all day" : `back by ${fmtHour(v)}`;
      }
      setBadge({ x: e.clientX, y: e.clientY, text });
    }

    function onUp(e: PointerEvent) {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d.mode === "pending") toggleDay(d.anchor);
      drag.current = null;
      setBadge(null);
      setDragActive(false);
    }

    function onCancel() {
      drag.current = null;
      setBadge(null);
      setDragActive(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [roles, fromT, backT, toggleDay, setFrom, setBack]);

  // ─── Keyboard ────────────────────────────────────────────────────────────────
  // Enter/Space keeps the two-click window flow. Arrow Up/Down adjusts the
  // focused edge day's time (Shift+arrows = "back by" on a single-day window).
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

  const onCellKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, key: string) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const role = roles.get(key);
      if (!role || role === "mid") return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const edge: Edge =
        role === "first"
          ? "from"
          : role === "last"
            ? "back"
            : e.shiftKey
              ? "back"
              : "from";
      if (edge === "from") {
        const backHere = role === "single" ? (backT.get(key) ?? null) : null;
        setFrom(key, (fromT.get(key) ?? 4) + step, backHere);
      } else {
        const fromHere = role === "single" ? (fromT.get(key) ?? null) : null;
        setBack(key, (backT.get(key) ?? 24) + step, fromHere);
      }
    },
    [roles, fromT, backT, setFrom, setBack],
  );

  // ─── Save ────────────────────────────────────────────────────────────────────
  const onSave = useCallback(() => {
    setSaving(true);
    setSaveMsg(null);
    putAvailability(windows)
      .then((res) => {
        seedFromWindows(res.windows);
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
  }, [windows, seedFromWindows]);

  // auto-fade the saved message
  useEffect(() => {
    if (saveMsg?.kind !== "ok") return;
    const t = setTimeout(() => setSaveMsg(null), 2000);
    return () => clearTimeout(t);
  }, [saveMsg]);

  const clearAll = useCallback(() => {
    setPainted(new Set());
    setFromT(new Map());
    setBackT(new Map());
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
          Drag across days to paint free days. Drag a trip&apos;s first or last
          day up/down to set when you get free / must be back.
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
      {/* pan-y (not none) so the page still scrolls past the 12-month grid on
          touch; edge-time cells opt into touch-action:none individually. */}
      <div
        className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
        style={{ touchAction: "pan-y" }}
      >
        {months.map((m) => (
          <MonthGrid
            key={`${m.year}-${m.month}`}
            model={m}
            today={today}
            painted={painted}
            roles={roles}
            fromT={fromT}
            backT={backT}
            pendingStart={pendingStart}
            hoverWin={hoverWin}
            onPointerDown={onPointerDown}
            onKeyActivate={onKeyActivate}
            onCellKeyDown={onCellKeyDown}
            onHoverCell={onHoverCell}
            onDeleteWindow={onDeleteWindow}
          />
        ))}
      </div>

      {/* time-scrub badge */}
      {badge && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 rounded-(--radius-tag) bg-ink px-2 py-1 font-mono text-sm font-semibold text-paper"
          style={{ left: badge.x + 14, top: badge.y - 34 }}
        >
          {badge.text}
        </div>
      )}
    </div>
  );
}

// ─── One month grid ────────────────────────────────────────────────────────────

interface MonthGridProps {
  model: MonthModel;
  today: string;
  painted: Set<string>;
  roles: Map<string, Role>;
  fromT: Map<string, number>;
  backT: Map<string, number>;
  pendingStart: string | null;
  hoverWin: { s: string; e: string } | null;
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>, key: string) => void;
  onKeyActivate: (key: string) => void;
  onCellKeyDown: (
    e: ReactKeyboardEvent<HTMLButtonElement>,
    key: string,
  ) => void;
  onHoverCell: (key: string | null) => void;
  onDeleteWindow: (s: string, e: string) => void;
}

/** Corner radii for a run overlay: rounded only at the true window caps. */
function capRadius(capLeft: boolean, capRight: boolean): string {
  const l = capLeft ? "5px" : "0";
  const r = capRight ? "5px" : "0";
  return `${l} ${r} ${r} ${l}`;
}

const MonthGrid = memo(function MonthGrid({
  model,
  today,
  painted,
  roles,
  fromT,
  backT,
  pendingStart,
  hoverWin,
  onPointerDown,
  onKeyActivate,
  onCellKeyDown,
  onHoverCell,
  onDeleteWindow,
}: MonthGridProps) {
  const { year, month, label, lead, days } = model;

  return (
    <div className="select-none" onPointerLeave={() => onHoverCell(null)}>
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
          const role = isPainted ? roles.get(key) : undefined;
          const isEdge =
            role === "first" || role === "last" || role === "single";

          // partial-day hatch: top = 00:00, bottom = 24:00
          const from =
            role === "first" || role === "single"
              ? (fromT.get(key) ?? 0)
              : 0;
          const back =
            role === "last" || role === "single" ? (backT.get(key) ?? 24) : 24;
          const hatchTop = (from / 24) * 100;
          const hatchHeight = ((back - from) / 24) * 100;
          const timeLabel =
            from > 0 && back < 24
              ? `${from}→${back}`
              : from > 0
                ? `${from}→`
                : back < 24
                  ? `→${back}`
                  : "";

          const ariaTime =
            from > 0 && back < 24
              ? `, free from ${fmtHour(from)}, back by ${fmtHour(back)}`
              : from > 0
                ? `, free from ${fmtHour(from)}`
                : back < 24
                  ? `, back by ${fmtHour(back)}`
                  : "";

          // run-connection geometry: a window renders as one fused shape
          const col = (lead + i) % 7;
          const prevPainted = isPainted && painted.has(addDays(key, -1));
          const nextPainted = isPainted && painted.has(addDays(key, 1));
          // bridge = reach across the 4px gap to the horizontally-adjacent cell
          const bridgeLeft = prevPainted && col > 0 && day > 1;
          const bridgeRight = nextPainted && col < 6 && day < days;
          // continuation without a bridge = run wraps a row or crosses a month
          const contPrev = prevPainted && !bridgeLeft;
          const contNext = nextPainted && !bridgeRight;
          // true window caps (first/last day of the whole range)
          const capLeft = isPainted && !prevPainted;
          const capRight = isPainted && !nextPainted;
          // hover-to-delete: × on the hovered window's last day
          const showDelete =
            !isPast && hoverWin !== null && key === hoverWin.e;

          return (
            <button
              key={key}
              type="button"
              disabled={isPast}
              data-daykey={isPast ? undefined : key}
              aria-pressed={isPainted}
              aria-label={`${day} ${label}${isPainted ? ` — free${ariaTime}` : ""}`}
              onPointerDown={(e) => {
                if (isPast) return;
                onPointerDown(e, key);
              }}
              onPointerEnter={(e) => {
                if (e.pointerType !== "mouse") return;
                onHoverCell(isPainted ? key : null);
              }}
              onClick={(e) => {
                if (isPast) return;
                // Mouse clicks (detail >= 1) are handled by the pointer drag;
                // only keyboard activations (detail === 0) take this path.
                if (e.detail === 0) onKeyActivate(key);
              }}
              onKeyDown={(e) => {
                if (isPast) return;
                onCellKeyDown(e, key);
              }}
              style={isEdge ? { touchAction: "none" } : undefined}
              className={[
                "tnum relative aspect-square rounded-[5px] text-center font-mono text-xs transition-colors",
                isPast
                  ? "cursor-default text-ink-muted/25"
                  : "cursor-pointer hover:ring-1 hover:ring-ink/15",
                isPainted ? "text-brand-ink font-semibold" : "text-ink",
                isEdge ? "cursor-ns-resize" : "",
                isPending ? "ring-2 ring-ink" : "",
                isToday && !isPainted ? "ring-1 ring-ink/40" : "",
              ].join(" ")}
            >
              {isPainted && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute"
                  style={
                    isEdge
                      ? {
                          top: `${hatchTop}%`,
                          height: `${hatchHeight}%`,
                          left: bridgeLeft ? -GAP_PX : 0,
                          right: bridgeRight ? -GAP_PX : 0,
                          borderRadius: capRadius(capLeft, capRight),
                          backgroundColor: ENDPOINT_BG,
                        }
                      : {
                          top: 0,
                          height: "100%",
                          left: bridgeLeft ? -GAP_PX : 0,
                          right: bridgeRight ? -GAP_PX : 0,
                          backgroundColor: MID_BG,
                        }
                  }
                />
              )}
              {contPrev && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-0 top-1/2 z-[1] -translate-y-1/2 text-[8px] leading-none text-brand-ink/70"
                >
                  ◂
                </span>
              )}
              {contNext && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-1/2 z-[1] -translate-y-1/2 text-[8px] leading-none text-brand-ink/70"
                >
                  ▸
                </span>
              )}
              {showDelete && hoverWin && (
                <span
                  role="button"
                  aria-label="Remove this date range"
                  title="Remove this range"
                  onPointerDown={(e) => {
                    // swallow the gesture so the cell doesn't start a paint drag
                    e.stopPropagation();
                    e.preventDefault();
                    onDeleteWindow(hoverWin.s, hoverWin.e);
                  }}
                  className="absolute -right-1.5 -top-1.5 z-[2] flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-ink text-[10px] font-bold leading-none text-paper shadow-sm transition-colors hover:bg-alert"
                >
                  ×
                </span>
              )}
              <span className="relative z-[1]">{day}</span>
              {timeLabel && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-px z-[1] text-center font-mono text-[8px] font-semibold leading-none text-brand-ink"
                >
                  {timeLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

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
