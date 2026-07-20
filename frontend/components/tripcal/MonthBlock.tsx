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
  addDays,
  clampDayInMonth,
  diffDays,
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
  /**
   * Trips that BELONG to the previous month (outbound before this month) but
   * whose return crosses into it. Rendered as ghost bars over a left "fog"
   * lead-in zone — the mirror of the right spillover — so a boundary-crossing
   * flight reads consistently from both months. Same flights, same price order,
   * same skin; capped at SPILL_MAX days of lead-in (older crossings are shown
   * only in their home month). Defaults to none.
   */
  inbound?: Trip[];
  /** date → count over the unfiltered match, for the heat strip */
  density: Record<string, number>;
  /** availability windows to underlay (already day-clipped is not required) */
  windows: DateWindow[];
  /**
   * Per-day availability heat (date → free-member count). When present, the
   * availability underlay renders as a graded green heat map (darker = more
   * people free) instead of the uniform wash from `windows`. Used by the group
   * calendar; the personal calendar omits it. Requires `heatMax` > 0.
   */
  availHeat?: Record<string, number>;
  /** heat normaliser (known member count); count/heatMax → cell darkness */
  heatMax?: number;
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

// Max ghost "spillover" day-columns added at each month edge so a
// month-crossing bar can run its full length inside one row. The zone renders
// foggy (dim axis numbers + translucent wash) to read as the neighbouring
// month. Right edge = next month's first days (a departing bar's tail); left
// edge = previous month's last days (a returning bar's head). A crossing beyond
// SPILL_MAX days still clips and falls back to the "→N MON" chip / a rounded-off
// left edge.
const SPILL_MAX = 7;

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

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
  inbound = [],
  density,
  windows,
  availHeat,
  heatMax = 0,
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

  // Inbound crossings that fit the SPILL_MAX lead-in (older ones live only in
  // their home month). Days-before = how far the outbound predates this month.
  const inboundFit = useMemo(
    () =>
      inbound
        .map((t) => ({ t, before: diffDays(t.outbound_date, spec.startStr) }))
        .filter(({ before }) => before > 0 && before <= SPILL_MAX),
    [inbound, spec],
  );

  // ─── Lane assignment (price asc, greedy ≤6 unless expanded) ───────────────
  // Inbound ghosts share the native lane pool so a returning bar and a native
  // bar never overlap in the same lane; price order keeps it deterministic.
  const { lanes, overflow } = useMemo(
    () =>
      assignLanes(
        [...inboundFit.map(({ t }) => t), ...trips].map((t) => ({
          key: t.key,
          outbound_date: t.outbound_date,
          return_date: t.return_date,
          price: t.price,
        })),
        expanded ? Number.POSITIVE_INFINITY : MAX_LANES,
      ),
    [inboundFit, trips, expanded],
  );

  const nativeKeys = useMemo(() => new Set(trips.map((t) => t.key)), [trips]);
  const placedTrips = trips.filter((t) => lanes.has(t.key));
  const placedInbound = inboundFit.filter(({ t }) => lanes.has(t.key));
  // "N shown" + "+N more" account for native bars only; a dropped inbound ghost
  // is still visible in its home month, so it never inflates this month's count.
  const nativeOverflow = overflow.filter((k) => nativeKeys.has(k));
  const laneCount = Math.max(
    1,
    [...placedTrips, ...placedInbound.map(({ t }) => t)].reduce(
      (m, t) => Math.max(m, (lanes.get(t.key) ?? 0) + 1),
      0,
    ),
  );

  // ─── Left "fog" lead-in columns (previous month's last days) ──────────────
  // Widened only as far as the placed inbound ghosts reach, capped at SPILL_MAX.
  const lead = useMemo(
    () => placedInbound.reduce((l, { before }) => Math.max(l, before), 0),
    [placedInbound],
  );

  // ─── Right "fog" spillover columns (next month's first days) ──────────────
  // Only as many as the placed bars actually need, capped at SPILL_MAX; 0 when
  // nothing crosses the boundary (grid identical to the plain month).
  const spill = useMemo(() => {
    let s = 0;
    for (const t of placedTrips) {
      const ret = selections?.get(t.key)?.return_date ?? t.return_date;
      if (ret > spec.endStr)
        s = Math.max(s, Math.min(SPILL_MAX, diffDays(spec.endStr, ret)));
    }
    return s;
  }, [placedTrips, selections, spec]);
  const totalCols = lead + cols + spill;

  /** Shift an in-month 1-based day column into the grid (past the left fog). */
  const rc = (dayCol: number) => dayCol + lead;

  /** End column for a return date — runs into the right spill zone when it fits. */
  const endColFor = (ret: string) =>
    ret <= spec.endStr
      ? rc(clampDayInMonth(ret, spec))
      : lead + cols + Math.min(spill, diffDays(spec.endStr, ret));

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

  // Axis cells: the left fog (previous month's last days, dim), the month's
  // days, then the right spill zone's next-month days (dim).
  const dayNumbers = Array.from({ length: cols }, (_, i) => i + 1);
  const spillNumbers = Array.from({ length: spill }, (_, i) => i + 1);
  const leadDates = useMemo(
    () => Array.from({ length: lead }, (_, i) => addDays(spec.startStr, i - lead)),
    [lead, spec],
  );

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
      dayCol: rc(clampDayInMonth(c.date, spec)),
      side: c.side,
      label: c.label,
      active: c.active,
      date: c.date,
    }));
    return {
      trip: base,
      lane,
      winStartCol: rc(clampDayInMonth(stretch.winStart, spec)),
      winEndCol: rc(clampDayInMonth(stretch.winEnd, spec)),
      barStartCol: rc(clampDayInMonth(stretch.selOut, spec)),
      barEndCol: rc(clampDayInMonth(stretch.selRet, spec)),
      cells,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stretch, lanes, spec, placedTrips, lead]);

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
          {(nativeOverflow.length > 0 || expanded) && (
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
      {showFreeStrip && (
        <FreeStrip
          spec={spec}
          windows={windows}
          totalCols={totalCols}
          lead={lead}
        />
      )}

      {/* ─── Day-number axis (dim prev-month days | month | dim next-month) ── */}
      <div
        className="mb-1 grid gap-px"
        style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
      >
        {leadDates.map((ds) => {
          const y = Number(ds.slice(0, 4));
          const m = Number(ds.slice(5, 7)) - 1;
          const day = Number(ds.slice(8, 10));
          return (
            <div
              key={`l${ds}`}
              className="tnum text-center font-mono text-[9px] leading-none text-ink-muted/40"
            >
              <span className="block text-[8px] leading-none opacity-70">
                {weekdayLetter(y, m, day)}
              </span>
              <span className="mt-0.5 block">{day}</span>
            </div>
          );
        })}
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
        {spillNumbers.map((d) => (
          <div
            key={`s${d}`}
            className="tnum text-center font-mono text-[9px] leading-none text-ink-muted/40"
          >
            <span className="block text-[8px] leading-none opacity-70">
              {weekdayLetter(spec.year, spec.month + 1, d)}
            </span>
            <span className="mt-0.5 block">{d}</span>
          </div>
        ))}
      </div>

      {/* ─── Gantt lanes grid (relative for underlay + today line) ────────── */}
      <div className="relative">
        {/* weekend tint + today line underlay */}
        <div
          className="pointer-events-none absolute inset-0 grid gap-px"
          style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {leadDates.map((ds) => (
            <div key={`l${ds}`} />
          ))}
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
            style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {uniSegments.map((seg, i) => (
              <div
                key={i}
                className="rounded-[2px]"
                style={{
                  gridColumn: `${rc(seg.start)} / span ${Math.max(1, seg.end - seg.start + 1)}`,
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

        {/* availability underlay — graded green heat map (group calendar:
            darker = more members free, white = nobody) when availHeat is
            supplied, otherwise the uniform steal-green wash from `windows`.
            Kept subtle (5–28% steal-green) so it reads behind the fares. */}
        {underlay && availHeat && heatMax > 0 ? (
          <div
            className="pointer-events-none absolute inset-0 grid gap-px"
            style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
            aria-hidden="true"
          >
            {leadDates.map((ds) => (
              <div key={`l${ds}`} />
            ))}
            {dayNumbers.map((d) => {
              const key = `${spec.year}-${String(spec.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const count = availHeat[key] ?? 0;
              if (count <= 0) return <div key={d} />;
              const frac = Math.min(1, count / heatMax);
              const pct = Math.round(5 + 23 * frac); // 5%→28% steal-green ramp
              return (
                <div
                  key={d}
                  className="rounded-[2px]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-steal) ${pct}%, transparent)`,
                  }}
                />
              );
            })}
          </div>
        ) : (
          underlay &&
          availSegments.length > 0 && (
            <div
              className="pointer-events-none absolute inset-0 grid gap-px"
              style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {availSegments.map((seg, i) => (
                <div
                  key={i}
                  className="rounded-[2px] bg-steal/10"
                  style={{
                    gridColumn: `${rc(seg.start)} / span ${Math.max(1, seg.end - seg.start + 1)}`,
                  }}
                />
              ))}
            </div>
          )
        )}

        {/* today vertical marker */}
        {todayCol != null && (
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-px bg-ink/40"
            style={{
              left: `calc(${((rc(todayCol) - 0.5) / totalCols) * 100}%)`,
            }}
            aria-hidden="true"
          />
        )}

        {/* fog over the left lead-in — returning bars run under it, see-through */}
        {lead > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-30 border-r border-dashed border-line bg-card/60"
            style={{ width: `${(lead / totalCols) * 100}%` }}
            aria-hidden="true"
          >
            <span className="absolute -top-0.5 right-1 font-mono text-[8px] uppercase tracking-widest text-ink-muted/60">
              {MONTHS_SHORT[(spec.month + 11) % 12]}
            </span>
          </div>
        )}

        {/* fog over the right spill zone — bars run under it and read see-through */}
        {spill > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-30 border-l border-dashed border-line bg-card/60"
            style={{ left: `${((lead + cols) / totalCols) * 100}%` }}
            aria-hidden="true"
          >
            <span className="absolute -top-0.5 left-1 font-mono text-[8px] uppercase tracking-widest text-ink-muted/60">
              {MONTHS_SHORT[(spec.month + 1) % 12]}
            </span>
          </div>
        )}

        {/* the bars */}
        <div
          className="relative grid gap-px"
          style={{
            gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
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
                startCol={rc(clampDayInMonth(out, spec))}
                endCol={endColFor(ret)}
                lane={lanes.get(trip.key) ?? 0}
                clippedStart={out < spec.startStr}
                clippedEnd={
                  ret > spec.endStr && diffDays(spec.endStr, ret) > spill
                }
                stretchDelta={sel ? sel.deltaPrice : null}
                onHover={(t, el) => onBarHover(t ? trip : null, el)}
                onClick={() => onBarClick(trip)}
              />
            );
          })}

          {/* Inbound ghosts: previous-month departures returning into this
              month, rendered over the left fog. Head starts in the fog (or
              clips at the fog edge when it predates SPILL_MAX); tail runs into
              the real days so the label reads crisp — the mirror of the right
              spillover. No stretch/selection (the interaction lives in the
              trip's home month). */}
          {placedInbound.map(({ t, before }) => {
            const clippedS = before > lead;
            const startCol = clippedS ? 1 : lead - before + 1;
            const clippedE = t.return_date > spec.endStr;
            const endCol = clippedE
              ? lead + cols
              : rc(clampDayInMonth(t.return_date, spec));
            return (
              <TripBar
                key={`in-${t.key}`}
                trip={t}
                startCol={startCol}
                endCol={endCol}
                lane={lanes.get(t.key) ?? 0}
                clippedStart={clippedS}
                clippedEnd={clippedE}
                onHover={(tr, el) => onBarHover(tr ? t : null, el)}
                onClick={() => onBarClick(t)}
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
        overflowCount={nativeOverflow.length}
        onExpand={() => setExpanded(true)}
        totalCols={totalCols}
        lead={lead}
      />
    </section>
  );
}
