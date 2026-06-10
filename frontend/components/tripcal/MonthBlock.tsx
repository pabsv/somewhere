"use client";

import { useMemo } from "react";
import type { Trip, DateWindow } from "@/types/api";
import { assignLanes } from "@/lib/lanes";
import TripBar from "./TripBar";
import DensityStrip from "./DensityStrip";
import {
  type MonthSpec,
  clampDayInMonth,
  dayStr,
  isWeekend,
  spansMonth,
} from "./calendarMath";

interface MonthBlockProps {
  spec: MonthSpec;
  /** trips whose interval intersects this month (pre-filtered by the page) */
  trips: Trip[];
  /** date → count over the unfiltered match, for the heat strip */
  density: Record<string, number>;
  /** availability windows to underlay (already day-clipped is not required) */
  windows: DateWindow[];
  today: string;
  onBarHover: (trip: Trip | null, el: HTMLElement | null) => void;
  onBarClick: (trip: Trip) => void;
  onDayClick: (day: string) => void;
}

const MAX_LANES = 6;
const LANE_H = 28; // px per lane row incl. gap

/**
 * One month rendered as a horizontal gantt: equal-width day columns with a
 * faint weekend tint and a today marker line, a mono day-number axis, up to 6
 * lane-packed TripBars, an optional steal-green availability underlay, and a
 * density heat strip along the bottom.
 */
export default function MonthBlock({
  spec,
  trips,
  density,
  windows,
  today,
  onBarHover,
  onBarClick,
  onDayClick,
}: MonthBlockProps) {
  const cols = spec.days;

  // ─── Lane assignment (score desc, greedy ≤6, overflow → density) ──────────
  const { lanes, overflow } = useMemo(
    () =>
      assignLanes(
        trips.map((t) => ({
          key: t.key,
          outbound_date: t.outbound_date,
          return_date: t.return_date,
          score: t.score,
        })),
        MAX_LANES,
      ),
    [trips],
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

  const dayNumbers = Array.from({ length: cols }, (_, i) => i + 1);

  return (
    <section className="rounded-card border border-line bg-card p-4 shadow-card">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {spec.label}
        </h2>
        <span className="tnum font-mono text-[11px] text-ink-muted">
          {placedTrips.length} shown
        </span>
      </div>

      {/* ─── Day-number axis ──────────────────────────────────────────────── */}
      <div
        className="mb-1 grid gap-px"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {dayNumbers.map((d) => {
          const weekend = isWeekend(spec.year, spec.month, d);
          const isToday = todayCol === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onDayClick(dayStr(spec.year, spec.month, d))}
              className={`tnum text-center font-mono text-[9px] leading-none transition-colors hover:text-ink ${
                isToday
                  ? "font-bold text-ink"
                  : weekend
                    ? "text-ink-muted/50"
                    : "text-ink-muted"
              }`}
              title={`Trips spanning ${dayStr(spec.year, spec.month, d)}`}
            >
              {d}
            </button>
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

        {/* availability underlay (steal-green soft fill) */}
        {availSegments.length > 0 && (
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
            const startCol = clampDayInMonth(trip.outbound_date, spec);
            const endCol = clampDayInMonth(trip.return_date, spec);
            return (
              <TripBar
                key={trip.key}
                trip={trip}
                startCol={startCol}
                endCol={endCol}
                lane={lanes.get(trip.key) ?? 0}
                clippedStart={trip.outbound_date < spec.startStr}
                clippedEnd={trip.return_date > spec.endStr}
                onHover={onBarHover}
                onClick={onBarClick}
              />
            );
          })}
        </div>
      </div>

      {/* ─── Density heat strip ───────────────────────────────────────────── */}
      <DensityStrip
        spec={spec}
        density={density}
        overflowCount={overflow.length}
        onDayClick={onDayClick}
      />
    </section>
  );
}
