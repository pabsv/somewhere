"use client";

import { useMemo, useState } from "react";
import type { Trip, DateWindow } from "@/types/api";
import type { UniPeriod } from "@/lib/university/tue";
import { assignLanes } from "@/lib/lanes";
import TripBar from "./TripBar";
import StretchOverlay, { type StretchCell } from "./StretchOverlay";
import DensityStrip from "./DensityStrip";
import FreeStrip from "./FreeStrip";
import {
  type MonthSpec,
  clampDayInMonth,
  isWeekend,
  spansMonth,
  weekdayLetter,
} from "./calendarMath";

/** A committed trip-stretch swap for a bar not currently hovered. */
export interface StretchSelection {
  out_date: string;
  return_date: string;
  price: number;
  nights: number;
  /** displayed price − stored price (drives the "·+€21" bar tail). */
  deltaPrice: number;
}

/** The live "full-length bubble" surface for the currently hovered bar. */
export interface StretchContext {
  /** hovered trip key. */
  key: string;
  /** availability-window (or stretch-envelope) bounds — the bubble span. */
  winStart: string;
  winEnd: string;
  /** currently displayed bar span (selected variant, or the base trip). */
  selOut: string;
  selRet: string;
  /** bar label without the delta tail, e.g. "BCN €60". */
  barLabel: string;
  /** signed delta tail, e.g. "+€21" (null = unmodified). */
  deltaLabel: string | null;
  modified: boolean;
  /** free-day fare cells (dates + labels; columns resolved per month here). */
  cells: Array<{ date: string; side: "earlier" | "later"; label: string; active: boolean }>;
  onPickDay: (date: string) => void;
  onBar: () => void;
}

interface MonthBlockProps {
  spec: MonthSpec;
  /** trips whose interval intersects this month (pre-filtered by the page) */
  trips: Trip[];
  /** date → count over the unfiltered match, for the heat strip */
  density: Record<string, number>;
  /** availability windows to underlay (already day-clipped is not required) */
  windows: DateWindow[];
  /** draw the faint steal-green wash behind the bars (default true) */
  underlay?: boolean;
  /** render the slim steal-green FreeStrip above the day axis (default false) */
  showFreeStrip?: boolean;
  /** academic periods (exams/breaks) to wash under the bars; [] = no overlay */
  uniPeriods?: UniPeriod[];
  today: string;
  /**
   * Committed trip-stretch swaps keyed by trip.key — a modified bar that isn't
   * currently hovered renders at these swapped dates with a "·+€21" tail.
   */
  selections?: Map<string, StretchSelection>;
  /**
   * The live "full-length bubble" for the hovered bar (design option 2c): a
   * dashed pill over the whole availability window with a fare on each free
   * day. Only rendered in the month that fully contains the window.
   */
  stretch?: StretchContext | null;
  onBarHover: (trip: Trip | null, el: HTMLElement | null) => void;
  onBarClick: (trip: Trip) => void;
}

const MAX_LANES = 6;
const LANE_H = 28; // px per lane row incl. gap

/**
 * One month rendered as a horizontal gantt: equal-width day columns with a
 * faint weekend tint and a today marker line, a mono day-number axis,
 * lane-packed TripBars (6 lanes collapsed, unlimited when expanded via the
 * header chevron or the "+N more" label), an optional steal-green availability
 * underlay, and a density heat strip along the bottom.
 */
export default function MonthBlock({
  spec,
  trips,
  density,
  windows,
  underlay = true,
  showFreeStrip = false,
  uniPeriods,
  today,
  selections,
  stretch = null,
  onBarHover,
  onBarClick,
}: MonthBlockProps) {
  const cols = spec.days;

  // Expanded = no lane cap: every curated bar this month renders. Local state
  // on purpose — purely presentational, per-month, and every consumer of
  // MonthBlock (personal + group calendar) gets the toggle for free.
  const [expanded, setExpanded] = useState(false);

  // ─── Lane assignment (price asc, greedy ≤6 unless expanded) ───────────────
  const { lanes, overflow } = useMemo(
    () =>
      assignLanes(
        trips.map((t) => ({
          key: t.key,
          outbound_date: t.outbound_date,
          return_date: t.return_date,
          price: t.price,
        })),
        expanded ? Number.POSITIVE_INFINITY : MAX_LANES,
      ),
    [trips, expanded],
  );

  const placedTrips = trips.filter((t) => lanes.has(t.key));
  const laneCount = Math.max(
    1,
    placedTrips.reduce((m, t) => Math.max(m, (lanes.get(t.key) ?? 0) + 1), 0),
  );

  // today marker column (only if today falls inside this month)
  const todayCol =
    today >= spec.startStr && today <= spec.endStr
      ? Number(today.slice(8, 10))
      : null;

  // ─── Availability underlay segments (clipped to this month) ───────────────
  const availSegments = useMemo(
    () =>
      windows
        .filter((w) => spansMonth(w.start_date, w.end_date, spec))
        .map((w) => ({
          start: clampDayInMonth(w.start_date, spec),
          end: clampDayInMonth(w.end_date, spec),
        })),
    [windows, spec],
  );

  // ─── Academic-calendar wash segments (clipped to this month) ──────────────
  const uniSegments = useMemo(
    () =>
      (uniPeriods ?? [])
        .filter((p) => spansMonth(p.start, p.end, spec))
        .map((p) => ({
          start: clampDayInMonth(p.start, spec),
          end: clampDayInMonth(p.end, spec),
          kind: p.kind,
          label: p.label,
        })),
    [uniPeriods, spec],
  );

  const dayNumbers = Array.from({ length: cols }, (_, i) => i + 1);

  // ─── Trip-stretch bubble (hovered bar only) ────────────────────────────────
  // The full-length bubble uses window-local percentage geometry, so it only
  // renders in the month that fully contains the availability window. When the
  // window straddles a month boundary we skip it and the bar shows plainly.
  const overlay = useMemo(() => {
    if (!stretch) return null;
    const lane = lanes.get(stretch.key);
    if (lane == null) return null;
    const base = placedTrips.find((t) => t.key === stretch.key);
    if (!base) return null;
    if (stretch.winStart < spec.startStr || stretch.winEnd > spec.endStr)
      return null;
    const cells: StretchCell[] = stretch.cells.map((c) => ({
      dayCol: clampDayInMonth(c.date, spec),
      side: c.side,
      label: c.label,
      active: c.active,
      date: c.date,
    }));
    return {
      trip: base,
      lane,
      winStartCol: clampDayInMonth(stretch.winStart, spec),
      winEndCol: clampDayInMonth(stretch.winEnd, spec),
      barStartCol: clampDayInMonth(stretch.selOut, spec),
      barEndCol: clampDayInMonth(stretch.selRet, spec),
      cells,
    };
  }, [stretch, lanes, spec, placedTrips]);

  return (
    <section className="rounded-card border border-line bg-card p-4 shadow-card">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {spec.label}
        </h2>
        <span className="flex items-center gap-2">
          <span className="tnum font-mono text-[11px] text-ink-muted">
            {placedTrips.length} shown
          </span>
          {(overflow.length > 0 || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse month" : "Show all trips"}
              className="rounded-tag p-0.5 text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                <path d="M5 7.5L10 12.5L15 7.5" />
              </svg>
            </button>
          )}
        </span>
      </div>

      {/* ─── Availability free-strip (steal-green, above the day axis) ─────── */}
      {showFreeStrip && <FreeStrip spec={spec} windows={windows} />}

      {/* ─── Day-number axis ──────────────────────────────────────────────── */}
      <div
        className="mb-1 grid gap-px"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {dayNumbers.map((d) => {
          const weekend = isWeekend(spec.year, spec.month, d);
          const isToday = todayCol === d;
          return (
            <div
              key={d}
              className={`tnum text-center font-mono text-[9px] leading-none ${
                isToday
                  ? "font-bold text-ink"
                  : weekend
                    ? "text-ink-muted/50"
                    : "text-ink-muted"
              }`}
            >
              <span className="block text-[8px] leading-none opacity-70">
                {weekdayLetter(spec.year, spec.month, d)}
              </span>
              <span className="mt-0.5 block">{d}</span>
            </div>
          );
        })}
      </div>

      {/* ─── Gantt lanes grid (relative for underlay + today line) ────────── */}
      <div className="relative">
        {/* weekend tint + today line underlay */}
        <div
          className="pointer-events-none absolute inset-0 grid gap-px"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {dayNumbers.map((d) => (
            <div
              key={d}
              className={
                isWeekend(spec.year, spec.month, d) ? "bg-paper/70" : ""
              }
            />
          ))}
        </div>

        {/* academic-calendar wash (exam hatch / break tint), below avail + bars */}
        {uniSegments.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 grid gap-px"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {uniSegments.map((seg, i) => (
              <div
                key={i}
                className="rounded-[2px]"
                style={{
                  gridColumn: `${seg.start} / span ${Math.max(1, seg.end - seg.start + 1)}`,
                  ...(seg.kind === "exam"
                    ? {
                        backgroundImage:
                          "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-uni-exam) 22%, transparent) 0 2px, transparent 2px 6px)",
                      }
                    : {
                        backgroundColor:
                          "color-mix(in srgb, var(--color-uni-break) 14%, transparent)",
                      }),
                }}
              />
            ))}
          </div>
        )}

        {/* availability underlay (steal-green soft fill) */}
        {underlay && availSegments.length > 0 && (
          <div
            className="pointer-events-none absolute inset-0 grid gap-px"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {availSegments.map((seg, i) => (
              <div
                key={i}
                className="rounded-[2px] bg-steal/10"
                style={{
                  gridColumn: `${seg.start} / span ${Math.max(1, seg.end - seg.start + 1)}`,
                }}
              />
            ))}
          </div>
        )}

        {/* today vertical marker */}
        {todayCol != null && (
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-px bg-ink/40"
            style={{
              left: `calc(${((todayCol - 0.5) / cols) * 100}%)`,
            }}
            aria-hidden="true"
          />
        )}

        {/* the bars */}
        <div
          className="relative grid gap-px"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${laneCount}, ${LANE_H - 4}px)`,
            rowGap: "4px",
            minHeight: laneCount * LANE_H,
          }}
        >
          {placedTrips.map((trip) => {
            // The hovered trip renders via the bubble overlay in this month.
            if (overlay && stretch?.key === trip.key) return null;
            // A committed swap (not hovered) shows at its stretched dates + tail.
            const sel = selections?.get(trip.key);
            const out = sel?.out_date ?? trip.outbound_date;
            const ret = sel?.return_date ?? trip.return_date;
            const shown = sel
              ? { ...trip, outbound_date: out, return_date: ret, price: sel.price, duration_days: sel.nights }
              : trip;
            return (
              <TripBar
                key={trip.key}
                trip={shown}
                startCol={clampDayInMonth(out, spec)}
                endCol={clampDayInMonth(ret, spec)}
                lane={lanes.get(trip.key) ?? 0}
                clippedStart={out < spec.startStr}
                clippedEnd={ret > spec.endStr}
                stretchDelta={sel ? sel.deltaPrice : null}
                onHover={(t, el) => onBarHover(t ? trip : null, el)}
                onClick={() => onBarClick(trip)}
              />
            );
          })}

          {overlay && stretch && (
            <StretchOverlay
              trip={overlay.trip}
              winStartCol={overlay.winStartCol}
              winEndCol={overlay.winEndCol}
              lane={overlay.lane}
              barStartCol={overlay.barStartCol}
              barEndCol={overlay.barEndCol}
              cells={overlay.cells}
              barLabel={stretch.barLabel}
              deltaLabel={stretch.deltaLabel}
              modified={stretch.modified}
              onPickDay={stretch.onPickDay}
              onBar={stretch.onBar}
              onHover={onBarHover}
            />
          )}
        </div>
      </div>

      {/* ─── Density heat strip ───────────────────────────────────────────── */}
      <DensityStrip
        spec={spec}
        density={density}
        overflowCount={overflow.length}
        onExpand={() => setExpanded(true)}
      />
    </section>
  );
}
