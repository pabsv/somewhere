"use client";

import { useEffect, useRef, useState } from "react";
import type { CalTrip, Trip } from "@/types/api";
import { useFavouriteSet } from "@/lib/favourite-scope";
import { isFavouriteTrip } from "@/lib/favourites";
import { FAV_GLYPH, FAV_GLYPH_TEXT, favRing } from "./favouriteSkin";

/** One free-day fare cell inside the bubble (already resolved to a month day). */
export interface StretchCell {
  /** 1-based day-of-month column (within the window, clamped to this month). */
  dayCol: number;
  side: "earlier" | "later";
  /** add-on fare vs the base trip, e.g. "+€12" / "~+€6". */
  label: string;
  /** currently claimed by the selection (sits under the bar). */
  active: boolean;
  /** the free day this cell books (YYYY-MM-DD) — the click key. */
  date: string;
}

interface StretchOverlayProps {
  /** hovered base trip (identity + tier skin). */
  trip: CalTrip;
  /** 1-based window bounds as day-of-month columns (clamped to this month). */
  winStartCol: number;
  winEndCol: number;
  /** 0-based lane row. */
  lane: number;
  /** displayed bar span (selected or base) as day-of-month columns. */
  barStartCol: number;
  barEndCol: number;
  /** per-free-day fare cells. */
  cells: StretchCell[];
  /** bar label, e.g. "BCN €60 ·+€21". */
  barLabel: string;
  /** signed delta vs base for the label tail (null = unmodified). */
  deltaLabel: string | null;
  /** true → the trip differs from its stored dates (bar-click resets). */
  modified: boolean;
  /** click a free day → swap the trip to that variant. */
  onPickDay: (date: string) => void;
  /** click the bar → reset (modified) or open the popover (unmodified). */
  onBar: () => void;
  /** keep / drop the hover as the pointer roams the window region. */
  onHover: (trip: CalTrip | null, el: HTMLElement | null) => void;
}

const QUART = "var(--ease-out-quart)";

// tier → bar skin, mirrors TripBar's TIER_BAR (kept in sync deliberately).
const TIER_BAR: Record<Trip["deal_tier"], string> = {
  steal: "bg-steal text-white",
  deal: "bg-brand/15 text-brand-ink border border-brand",
  fair: "bg-card text-ink border border-line",
};

/**
 * The "full-length bubble" trip-stretch surface (design option 2c). Rendered as
 * a single grid child spanning the availability window on the hovered bar's
 * lane; everything inside is absolutely positioned in window-local percentages
 * so the bar can animate its left/width as the user claims free days.
 *
 * Layers (bottom→top): window glow, dashed full-window bubble, free-day fare
 * cells, the moving trip bar (z-10, owns clicks over the days it covers). The
 * wrapper owns the hover so moving bar→cell→empty-day never dismisses it.
 */
export default function StretchOverlay({
  trip,
  winStartCol,
  winEndCol,
  lane,
  barStartCol,
  barEndCol,
  cells,
  barLabel,
  deltaLabel,
  modified,
  onPickDay,
  onBar,
  onHover,
}: StretchOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // fade the decorative layers in after mount (variants land ~200ms post-hover)
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    // Re-anchor the tooltip to the stable wrapper (the grid bar we replaced has
    // unmounted). Keyed on trip.key so a batched bar→bar hover swap re-anchors
    // to the new trip; trip.key is stable so this can't loop on identity churn.
    if (wrapRef.current) onHover(trip, wrapRef.current);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.key]);

  // This bar REPLACES the grid TripBar while hovering, so it has to carry the
  // gold contour too — otherwise the mark blinks off the moment you point at it.
  const favourites = useFavouriteSet();
  const isFav = isFavouriteTrip(trip, favourites);

  const winLen = Math.max(1, winEndCol - winStartCol + 1);
  const pctLeft = (col: number) => ((col - winStartCol) / winLen) * 100;
  const dayW = 100 / winLen;

  return (
    <div
      ref={wrapRef}
      style={{ gridColumn: `${winStartCol} / span ${winLen}`, gridRow: lane + 1 }}
      // Deliberately NO z-index: a z here would open a stacking context and
      // trap the fare cells below the sibling TripBars (z-10) — a neighbouring
      // trip inside the window would keep painting over the "~+€9" the user
      // hovered to read. Left at auto, the children below pick their own level.
      className="relative"
      onMouseEnter={(e) => onHover(trip, e.currentTarget)}
      onMouseLeave={() => onHover(null, null)}
    >
      {/* window glow */}
      <div
        aria-hidden="true"
        style={{ transition: "opacity 180ms ease" }}
        className={`pointer-events-none absolute -inset-[3px] rounded-lg bg-steal/7 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* decorative layers (bubble + fare cells) — fade together, over the bar's
          lifetime the bar stays fully opaque so a swap never flashes */}
      <div
        style={{
          transition: "opacity 180ms ease",
          pointerEvents: visible ? "auto" : "none",
        }}
        className={visible ? "opacity-100" : "opacity-0"}
      >
        {/* full-length dashed bubble spanning the whole window */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[2px] z-[4] box-border rounded-full border-[1.5px] border-dashed border-steal/55 bg-steal/8"
        />

        {/* one hit-target per free day with a real variant */}
        {cells.map((c) => {
          const outerLeft = c.dayCol === winStartCol;
          const outerRight = c.dayCol === winEndCol;
          const dividerLeft = cells.some(
            (x) => x.side === c.side && x.dayCol === c.dayCol - 1,
          );
          const rounding = outerLeft
            ? "rounded-l-full"
            : outerRight
              ? "rounded-r-full"
              : "";
          return (
            <button
              key={c.date}
              type="button"
              onClick={() => onPickDay(c.date)}
              title={`${c.side === "earlier" ? "Leave" : "Return"} ${c.date} · ${c.label}`}
              style={{
                left: `${pctLeft(c.dayCol)}%`,
                width: `${dayW}%`,
                borderLeft: dividerLeft
                  ? "1px dashed rgba(14,159,110,0.45)"
                  : undefined,
                transition: "background-color 120ms ease",
              }}
              className={`group/cell tnum absolute top-0 z-[15] flex h-6 items-center justify-center bg-transparent font-mono text-[9px] font-semibold leading-none text-steal hover:z-[17] hover:bg-steal/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${rounding}`}
            >
              {/* label hides under the bar once the day is claimed. It rides in
                  an opaque chip because a free day can still be covered by a
                  neighbouring trip's bar — the fare has to stay readable on
                  whatever happens to sit underneath. */}
              {!c.active && (
                <span className="rounded-full bg-card px-1 py-[2px] shadow-[0_0_0_1px_rgba(14,159,110,0.35)] group-hover/cell:bg-steal group-hover/cell:text-white group-hover/cell:shadow-none">
                  {c.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* the moving trip bar (owns clicks over the days it covers) */}
      <button
        type="button"
        onClick={onBar}
        onMouseEnter={(e) => onHover(trip, e.currentTarget)}
        title={
          modified
            ? "Click to reset to the original dates"
            : `${trip.origin} → ${trip.destination}`
        }
        style={{
          left: `${pctLeft(barStartCol)}%`,
          width: `${((barEndCol - barStartCol + 1) / winLen) * 100}%`,
          transition: `left 280ms ${QUART}, width 280ms ${QUART}`,
        }}
        className={`tnum absolute top-0 z-[16] flex h-6 min-w-0 items-center overflow-hidden rounded-full px-1.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${TIER_BAR[trip.deal_tier]} ${favRing(isFav, trip.deal_tier)}`}
      >
        <span className="truncate">
          {isFav && (
            <span className={`mr-0.5 ${FAV_GLYPH_TEXT[trip.deal_tier]}`}>
              {FAV_GLYPH}
            </span>
          )}
          {barLabel}
          {deltaLabel && <span className="opacity-70"> ·{deltaLabel}</span>}
        </span>
      </button>
    </div>
  );
}
