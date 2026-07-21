"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalTrip, DateWindow, Trip } from "@/types/api";
import type { UniPeriod } from "@/lib/university/tue";
import { assignLanes } from "@/lib/lanes";
import {
  MONTH_H,
  ROW_H,
  buildRailLayout,
  enumerateDays,
  rankLanesByPrice,
  spanBox,
  type RailLayout,
} from "@/lib/railLayout";
import { formatPrice, nearMissMark } from "@/lib/format";
import { getDestination } from "@/data/destinations.gen";
import CountryFlag from "@/components/ui/CountryFlag";
import { useFavouriteSet } from "@/lib/favourite-scope";
import { isFavouriteTrip } from "@/lib/favourites";
import { FAV_GLYPH, FAV_GLYPH_TEXT, favRing } from "./favouriteSkin";
import TripTooltip from "./TripTooltip";

/** Sticky date gutter width (px). */
const GUTTER = 48;
/** Lane pitch (px). Tag is LANE_W − LANE_GAP wide. */
const LANE_W = 64;
const LANE_GAP = 4;
/** Lanes rendered before the "+N more" pill; tapping it lifts the cap. */
const MAX_LANES = 8;

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"];
/** Long-press duration that opens the desktop-style preview tooltip. */
const HOLD_MS = 350;

interface TripRailProps {
  /** every trip currently on the board (already filtered by the page) */
  trips: CalTrip[];
  /** date → count of trips spanning it, UNFILTERED by curation */
  density: Record<string, number>;
  /** availability windows; [] when signed out or none set */
  windows: DateWindow[];
  uniPeriods?: UniPeriod[];
  /** YYYY-MM-DD, first day of the rail */
  today: string;
  /** YYYY-MM-DD, last day of the rail */
  end: string;
  onPick: (trip: CalTrip) => void;
}

// tier → tag skin. Mirrors TripBar's TIER_BAR so a fare reads identically on
// both form factors.
const TIER_TAG: Record<Trip["deal_tier"], string> = {
  steal: "bg-steal text-white border border-steal",
  deal: "bg-brand/15 text-brand-ink border border-brand",
  fair: "bg-card text-ink border border-line",
};
const NEAR_AVAIL_TAG =
  "bg-nearmiss/10 text-nearmiss-ink border border-dashed border-nearmiss";

/** "2026-09-06" → "6 SEP" */
function shortDate(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTHS_SHORT[Number(date.slice(5, 7)) - 1]}`;
}

/**
 * The mobile calendar: the desktop gantt rotated 90°.
 *
 * Time runs DOWN one continuous rail (the axis a phone has room on), lanes run
 * ACROSS it (the axis you swipe). The date gutter is `position: sticky; left:0`
 * inside the horizontal scroller, so the dates never leave the screen no matter
 * how far right you scroll.
 *
 * Because a trip's height IS its length, every tag clears 44×44 for free and
 * carries city, fare, code, nights and both dates with no interaction at all —
 * and month boundaries stop being a problem class: a 30 Aug → 9 Sep trip simply
 * passes through the September hairline.
 */
export default function TripRail({
  trips,
  density,
  windows,
  uniPeriods,
  today,
  end,
  onPick,
}: TripRailProps) {
  const [expanded, setExpanded] = useState(false);
  const [collapseRuns, setCollapseRuns] = useState(true);
  const favourites = useFavouriteSet();

  // ─── Long-press preview ───────────────────────────────────────────────────
  // Desktop hovers a bar to get TripTooltip; a phone has no hover, so holding
  // a tag opens the same tooltip and releasing dismisses it. The press must
  // not also fire the tap-to-open-popover click.
  const [preview, setPreview] = useState<{ trip: CalTrip; el: HTMLElement } | null>(
    null,
  );
  const holdTimer = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const cancelHold = useCallback(() => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setPreview(null);
    // A long press is normally followed by a click we want to swallow — but
    // not always (the browser drops it if the touch moved, or if a context
    // menu intervened). Re-arm on a timer so a stuck flag can never eat the
    // NEXT genuine tap.
    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 400);
    }
  }, []);

  useEffect(() => cancelHold, [cancelHold]);

  const startHold = useCallback(
    (trip: CalTrip, el: HTMLElement) => {
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        suppressClick.current = true;
        setPreview({ trip, el });
        // a real long-press should feel like one
        navigator.vibrate?.(8);
      }, HOLD_MS);
    },
    [],
  );

  const days = useMemo(() => enumerateDays(today, end), [today, end]);
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  // ─── Lanes: greedy price-first pack, then permute lanes so lane 0 is the
  // cheapest. Only ~4.8 lanes fit without swiping, so the ordering matters.
  const { lanes, laneCount, overflow } = useMemo(() => {
    const cap = expanded ? Number.POSITIVE_INFINITY : MAX_LANES;
    const res = assignLanes(
      trips.map((t) => ({
        key: t.key,
        outbound_date: t.outbound_date,
        return_date: t.return_date,
        price: t.price,
        // ±2-day bars are an opt-in extra — they overflow into "+N more"
        // before any trip that actually fits the free dates does.
        deprioritized: !!t.near_avail,
      })),
      cap,
    );
    const priceOf = new Map(trips.map((t) => [t.key, t.price] as const));
    const ranked = rankLanesByPrice(res.lanes, priceOf);
    const count = ranked.size
      ? Math.max(...[...ranked.values()]) + 1
      : 0;
    return { lanes: ranked, laneCount: count, overflow: res.overflow };
  }, [trips, expanded]);

  const drawn = useMemo(
    () => trips.filter((t) => lanes.has(t.key)),
    [trips, lanes],
  );

  // Days that must keep a full row: anything a drawn tag covers, plus every
  // free day. Everything else is collapsible.
  const keep = useMemo(() => {
    const set = new Set<string>();
    for (const t of drawn) {
      for (const d of enumerateDays(
        t.outbound_date < firstDay ? firstDay : t.outbound_date,
        t.return_date > lastDay ? lastDay : t.return_date,
      )) {
        set.add(d);
      }
    }
    for (const w of windows) {
      for (const d of enumerateDays(
        w.start_date < firstDay ? firstDay : w.start_date,
        w.end_date > lastDay ? lastDay : w.end_date,
      )) {
        set.add(d);
      }
    }
    // never collapse a month boundary away — it's the reader's anchor
    for (const d of days) if (d.slice(8, 10) === "01") set.add(d);
    set.add(firstDay);
    return set;
  }, [drawn, windows, days, firstDay, lastDay]);

  const layout: RailLayout = useMemo(
    () => buildRailLayout(days, keep, { collapse: collapseRuns }),
    [days, keep, collapseRuns],
  );

  const maxDensity = useMemo(
    () => Object.values(density).reduce((m, v) => Math.max(m, v), 0),
    [density],
  );

  const uniAt = useMemo(() => {
    const map = new Map<string, UniPeriod>();
    for (const p of uniPeriods ?? []) {
      for (const d of enumerateDays(
        p.start < firstDay ? firstDay : p.start,
        p.end > lastDay ? lastDay : p.end,
      )) {
        map.set(d, p);
      }
    }
    return map;
  }, [uniPeriods, firstDay, lastDay]);

  const freeDays = useMemo(() => {
    const set = new Set<string>();
    for (const w of windows) {
      for (const d of enumerateDays(w.start_date, w.end_date)) set.add(d);
    }
    return set;
  }, [windows]);

  const trackWidth =
    Math.max(laneCount, 1) * LANE_W + (overflow.length ? LANE_W + 8 : 8);
  const overflowPrice = useMemo(() => {
    const set = new Set(overflow);
    const prices = trips.filter((t) => set.has(t.key)).map((t) => t.price);
    return prices.length ? Math.min(...prices) : null;
  }, [overflow, trips]);

  return (
    <div className="rounded-card border border-line bg-card shadow-card">
      {/* ─── Rail header: what you're looking at + the swipe affordance ───── */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2">
        <span className="tnum font-mono text-[11px] text-ink-muted">
          {drawn.length} trip{drawn.length === 1 ? "" : "s"} ·{" "}
          {Math.max(laneCount, 1)} lane{laneCount === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          {layout.collapses.length > 0 && (
            <button
              type="button"
              onClick={() => setCollapseRuns((v) => !v)}
              className="tnum rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-ink-muted transition-colors active:bg-paper"
            >
              {collapseRuns ? "Show empty days" : "Hide empty days"}
            </button>
          )}
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted/70">
            swipe
            <svg
              viewBox="0 0 16 12"
              aria-hidden="true"
              className="h-3 w-4 stroke-current"
              fill="none"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 6h13M10 2l4 4-4 4" />
            </svg>
          </span>
        </div>
      </div>

      {/* ─── The rail. ONE horizontal scroller at full content height, so the
          page keeps ownership of vertical scroll (no nested y-scroller) and
          the gutter can stick to its left edge. ───────────────────────────── */}
      <div
        className="overflow-x-auto overflow-y-hidden [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div
          className="relative flex"
          style={{ height: layout.height, width: GUTTER + trackWidth }}
        >
          {/* ── Sticky date gutter ─────────────────────────────────────── */}
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-line bg-card"
            style={{ width: GUTTER, height: layout.height }}
          >
            {/* availability spines — one unbroken stroke per window, even
                across a month boundary (the desktop FreeStrip needs two) */}
            {windows.map((w, i) => {
              const a = layout.offsets.get(
                w.start_date < firstDay ? firstDay : w.start_date,
              );
              const b = layout.offsets.get(
                w.end_date > lastDay ? lastDay : w.end_date,
              );
              if (a == null || b == null) return null;
              const partial = w.start_time != null || w.end_time != null;
              return (
                <span
                  key={`w${i}`}
                  aria-hidden="true"
                  className="absolute left-0.5 w-1 rounded-full bg-steal"
                  style={{
                    top: a + 2,
                    height: b - a + ROW_H - 4,
                    backgroundImage: partial
                      ? "repeating-linear-gradient(135deg, var(--color-steal) 0 3px, transparent 3px 6px)"
                      : undefined,
                  }}
                />
              );
            })}

            {layout.rows.map((r) => {
              const count = density[r.date] ?? 0;
              const opacity =
                maxDensity > 0 && count > 0
                  ? 0.12 + 0.88 * (count / maxDensity)
                  : 0;
              const weekend = r.dow === 0 || r.dow === 6;
              const isToday = r.date === today;
              const uni = uniAt.get(r.date);
              return (
                <div
                  key={r.date}
                  className={`absolute left-0 flex items-center gap-1 pl-2 ${
                    weekend ? "bg-line/25" : ""
                  } ${freeDays.has(r.date) ? "bg-steal/[0.07]" : ""}`}
                  style={{ top: r.top, height: ROW_H, width: GUTTER }}
                >
                  {uni && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-1.5 top-0 h-full w-[3px] ${
                        uni.kind === "exam" ? "bg-uni-exam/40" : "bg-uni-break/40"
                      }`}
                    />
                  )}
                  <span
                    className={`tnum w-[15px] text-right font-mono text-[11px] leading-none ${
                      isToday ? "font-bold text-steal" : "text-ink"
                    }`}
                  >
                    {r.day}
                  </span>
                  <span className="font-mono text-[9px] leading-none text-ink-muted/60">
                    {DOW_LETTER[r.dow]}
                  </span>
                  {count > 0 && (
                    <span
                      aria-hidden="true"
                      title={`${count} trips span this day`}
                      className="absolute right-1 top-0.5 bottom-0.5 w-1.5 rounded-[1px] bg-brand"
                      style={{ opacity }}
                    />
                  )}
                </div>
              );
            })}

            {layout.collapses.map((c) => (
              <button
                key={c.from}
                type="button"
                onClick={() => setCollapseRuns(false)}
                aria-label={`Show ${c.days} empty days from ${c.from}`}
                className="absolute left-0 flex items-center justify-center font-mono text-[11px] text-ink-muted/70"
                style={{ top: c.top, height: 26, width: GUTTER }}
              >
                ⋯
              </button>
            ))}

            {/* Month label lives in the gutter, not the track: the gutter is
                sticky and above the tags, so the month can never be printed
                over a fare and a crossing tag can never hide the month. */}
            {layout.bands.map((b) => (
              <div
                key={`gb${b.month}`}
                className="absolute left-0 flex flex-col items-center justify-center border-t border-line bg-card leading-none"
                style={{ top: b.top, height: MONTH_H, width: GUTTER }}
              >
                <span className="font-mono text-[11px] font-bold tracking-wide text-ink">
                  {MONTHS_SHORT[Number(b.month.slice(5, 7)) - 1]}
                </span>
                <span className="tnum mt-px font-mono text-[7px] text-ink-muted/70">
                  {b.month.slice(0, 4)}
                </span>
              </div>
            ))}
          </div>

          {/* ── Track ──────────────────────────────────────────────────── */}
          <div
            className="relative shrink-0"
            style={{ width: trackWidth, height: layout.height }}
          >
            {/* row washes: weekend rhythm + availability, so you can still
                count weeks without a 7-column grid */}
            {layout.rows.map((r) => {
              const weekend = r.dow === 0 || r.dow === 6;
              const free = freeDays.has(r.date);
              if (!weekend && !free && r.date !== today) return null;
              return (
                <div key={r.date}>
                  {(weekend || free) && (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 ${
                        free ? "bg-steal/[0.06]" : "bg-line/25"
                      }`}
                      style={{ top: r.top, height: ROW_H }}
                    />
                  )}
                  {r.date === today && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 z-[15] border-t-2 border-steal"
                      style={{ top: r.top }}
                    />
                  )}
                </div>
              );
            })}

            {/* The band's track half is a warm stripe with a hairline top —
                a rule, not a wall. It sits UNDER the tags, so a trip crossing
                the boundary keeps running straight through it. */}
            {layout.bands.map((b) => (
              <span
                key={`b${b.month}`}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-line bg-paper/70"
                style={{ top: b.top, height: MONTH_H }}
              />
            ))}

            {/* collapsed-run labels sit in the track, where there's width */}
            {layout.collapses.map((c) => (
              <button
                key={`c${c.from}`}
                type="button"
                onClick={() => setCollapseRuns(false)}
                className="absolute left-1 flex items-center font-mono text-[10px] text-ink-muted/80"
                style={{ top: c.top, height: 26 }}
              >
                {c.days} days, nothing on the board
              </button>
            ))}

            {/* tags */}
            {drawn.map((t) => {
              const box = spanBox(
                layout,
                t.outbound_date,
                t.return_date,
                firstDay,
                lastDay,
              );
              if (!box) return null;
              const lane = lanes.get(t.key) ?? 0;
              const dest = getDestination(t.destination);
              const city = dest?.name ?? t.city;
              const na = t.near_avail;
              const isFav = isFavouriteTrip(t, favourites);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    if (suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    onPick(t);
                  }}
                  onTouchStart={(e) => startHold(t, e.currentTarget)}
                  onTouchMove={cancelHold}
                  onTouchEnd={cancelHold}
                  onTouchCancel={cancelHold}
                  onContextMenu={(e) => e.preventDefault()}
                  title={`${t.origin} → ${t.destination} · ${formatPrice(t.price)}`}
                  className={`absolute flex select-none flex-col items-start gap-px overflow-hidden px-1.5 pb-1.5 pt-1 text-left transition-transform [-webkit-touch-callout:none] active:scale-[.97] ${
                    na ? NEAR_AVAIL_TAG : TIER_TAG[t.deal_tier]
                  } ${favRing(isFav, t.deal_tier)}`}
                  style={{
                    left: lane * LANE_W,
                    top: box.top + 2,
                    width: LANE_W - LANE_GAP,
                    height: box.height - 4,
                    borderRadius: `${box.clippedStart ? "0 0" : "5px 5px"} ${
                      box.clippedEnd ? "0 0" : "16px 16px"
                    }`,
                  }}
                >
                  <span className="flex w-full items-center gap-1 truncate text-[10px] font-semibold leading-tight">
                    {/* Kept at every tag height — the shortest tags shed the
                        dates and the IATA row, but not "is this one mine?". */}
                    {isFav && (
                      <span className={FAV_GLYPH_TEXT[t.deal_tier]}>
                        {FAV_GLYPH}
                      </span>
                    )}
                    <CountryFlag code={dest?.country} />
                    <span className="truncate">{city}</span>
                  </span>
                  <span className="tnum font-mono text-[16px] font-bold leading-none">
                    {formatPrice(t.price)}
                  </span>
                  {box.height >= 90 && (
                    <span className="tnum font-mono text-[9px] leading-tight opacity-80">
                      {t.destination} · {t.duration_days}n
                      {na ? ` ${nearMissMark(na)}` : ""}
                    </span>
                  )}
                  {box.height >= 118 && (
                    <span className="tnum font-mono text-[9px] leading-tight opacity-65">
                      {Number(t.outbound_date.slice(8, 10))} →{" "}
                      {shortDate(t.return_date)}
                    </span>
                  )}
                </button>
              );
            })}

            {/* overflow pill — everything past the lane cap */}
            {overflow.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="tnum absolute top-2 rounded-card border border-line bg-card px-2 py-2 text-center font-mono text-[10px] leading-tight text-ink-muted"
                style={{ left: laneCount * LANE_W, width: LANE_W - LANE_GAP }}
              >
                {overflow.length}
                <br />
                more
                {overflowPrice != null && (
                  <>
                    <br />
                    {formatPrice(overflowPrice)}+
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hold-to-preview: the desktop hover tooltip, summoned by a long press
          and dismissed on release. */}
      {preview && <TripTooltip trip={preview.trip} anchor={preview.el} />}
    </div>
  );
}
