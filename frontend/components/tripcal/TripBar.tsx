"use client";

import type { CalTrip, Trip } from "@/types/api";
import { formatDelta, formatPrice, nearMissMark } from "@/lib/format";
import { getDestination } from "@/data/destinations.gen";
import CountryFlag from "@/components/ui/CountryFlag";
import { useFavouriteSet } from "@/lib/favourite-scope";
import { isFavouriteTrip } from "@/lib/favourites";
import { FAV_GLYPH, FAV_GLYPH_TEXT, favRing } from "./favouriteSkin";

interface TripBarProps {
  trip: CalTrip;
  /** 1-based start column within the month (clamped to month edges). */
  startCol: number;
  /** 1-based end column within the month (inclusive, clamped). */
  endCol: number;
  /** 0-based lane row. */
  lane: number;
  /** true if the trip starts before this month (left edge is a continuation). */
  clippedStart: boolean;
  /** true if the trip ends after this month (right edge is a continuation). */
  clippedEnd: boolean;
  /**
   * Committed trip-stretch delta vs the stored fare (a bar the user swapped to
   * a longer/earlier variant but isn't hovering). Appends "·+€21"; null = none.
   */
  stretchDelta?: number | null;
  onHover: (trip: CalTrip | null, el: HTMLElement | null) => void;
  onClick: (trip: CalTrip) => void;
}

const MONTHS3 = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** "2026-12-02" → "→2 DEC" — the return-date chip on a month-clipped bar. */
function returnChip(date: string): string {
  return `→${Number(date.slice(8, 10))} ${MONTHS3[Number(date.slice(5, 7)) - 1]}`;
}

// tier → bar skin. Yellow allowed here (deal bars are a sanctioned yellow use).
const TIER_BAR: Record<Trip["deal_tier"], string> = {
  steal: "bg-steal text-white border-transparent",
  deal: "bg-brand/15 text-brand-ink border border-brand",
  fair: "bg-card text-ink border border-line",
};

// Availability exception: a very cheap trip spilling 1 day outside the user's
// free window. Hollow dashed amber overrides the tier skin — the colour says
// "doesn't fit", the fact it's shown at all says "but it's a steal".
const NEAR_AVAIL_BAR =
  "bg-nearmiss/10 text-nearmiss-ink border border-dashed border-nearmiss";

/**
 * Bars this narrow (a 2-night trip spans 3 day columns, ~50px) can't hold
 * "🇪🇸 VLC €56" — the price, the thing you actually scan for, is what gets
 * truncated away. At or below this span the label sheds everything but the
 * flag and the fare; the city and every marker are one hover away (tooltip).
 */
const COMPACT_MAX_SPAN = 3;

/**
 * Marks a bar whose city the user — or, on a group calendar, the crew — has
 * starred. See components/tripcal/favouriteSkin for why the ring is an inset
 * shadow rather than a border.
 */
function favouriteMark(trip: CalTrip, saved: ReadonlySet<string>) {
  const isFav = isFavouriteTrip(trip, saved);
  return {
    isFav,
    // Near-miss keeps its own dashed-amber skin; the ring rides on top of
    // whichever fill actually renders, so pick the tier the bar is showing.
    ring: favRing(isFav, trip.deal_tier),
  };
}

/**
 * One trip rendered as a rounded pill spanning out→ret day columns, placed on
 * its lane row. Mono "BCN €39" label at the left end. Color by tier
 * (DESIGN_V1 §G). Hover surfaces the tooltip; click opens the popover.
 */
export default function TripBar({
  trip,
  startCol,
  endCol,
  lane,
  clippedStart,
  clippedEnd,
  stretchDelta = null,
  onHover,
  onClick,
}: TripBarProps) {
  const span = Math.max(1, endCol - startCol + 1);
  const compact = span <= COMPACT_MAX_SPAN;
  const favourites = useFavouriteSet();
  const { isFav, ring } = favouriteMark(trip, favourites);
  const country = getDestination(trip.destination)?.country;
  const stretchMark =
    stretchDelta != null ? ` ·${formatDelta(stretchDelta)}` : null;

  // Auto-extend badge: the calendar swapped in a longer variant at ~the same
  // fare because the extra days fit the user's free window.
  // Near-miss marker: this bar spills up to 2 days outside the user's free
  // window ("−2d" = leaves early, "+1d" = back late, "±1d" = a day each side).
  const na = trip.near_avail;
  const naMark = na ? ` ${nearMissMark(na)}` : null;

  const ae = trip.auto_extended;
  const aeMark = ae
    ? ` +${ae.extra_nights}d${Math.round(ae.delta_price) <= 0 ? " free" : ` +€${Math.round(ae.delta_price)}`}`
    : null;

  // The chip sits outside the button (which is overflow-hidden), so a clipped
  // bar needs a positioning wrapper carrying the grid placement.
  return (
    <div
      className="relative z-10 h-6 min-w-0"
      style={{
        gridColumn: `${startCol} / span ${span}`,
        gridRow: lane + 1,
      }}
    >
      <button
        type="button"
        onMouseEnter={(e) => onHover(trip, e.currentTarget)}
        onMouseLeave={() => onHover(null, null)}
        onFocus={(e) => onHover(trip, e.currentTarget)}
        onBlur={() => onHover(null, null)}
        onClick={() => onClick(trip)}
        title={`${trip.origin} → ${trip.destination} · ${formatPrice(trip.price)}${
          ae
            ? ` · auto-stretched +${ae.extra_nights} night${ae.extra_nights === 1 ? "" : "s"} for ${formatPrice(ae.delta_price)} more`
            : ""
        }`}
        className={`group/bar flex h-6 w-full min-w-0 items-center overflow-hidden rounded-full text-left transition-transform duration-[120ms] ease-out-quart hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
          compact ? "px-1" : "px-1.5"
        } ${trip.near_avail ? NEAR_AVAIL_BAR : TIER_BAR[trip.deal_tier]} ${ring} ${
          clippedStart ? "rounded-l-none" : ""
        } ${clippedEnd ? "rounded-r-none" : ""}`}
      >
        <span className="tnum truncate font-mono text-[11px] font-semibold uppercase tracking-wide">
          {/* Survives compact mode: when the label sheds the city and every
              marker, "is this one mine?" is still worth one character. */}
          {isFav && (
            <span className={`mr-0.5 ${FAV_GLYPH_TEXT[trip.deal_tier]}`}>
              {FAV_GLYPH}
            </span>
          )}
          <CountryFlag code={country} className={compact ? "mr-0.5" : "mr-1"} />
          {compact ? (
            formatPrice(trip.price)
          ) : (
            <>
              {trip.destination} {formatPrice(trip.price)}
              {naMark && <span className="opacity-70">{naMark}</span>}
              {aeMark && <span className="opacity-70">{aeMark}</span>}
              {stretchMark && <span className="opacity-70">{stretchMark}</span>}
            </>
          )}
        </span>
      </button>
      {clippedEnd && (
        <span
          aria-hidden="true"
          className="tnum pointer-events-none absolute -right-1 -top-[7px] z-[5] rounded-full border border-steal bg-[#e1f5ee] px-1 font-mono text-[8px] leading-[1.4] text-steal-ink"
        >
          {returnChip(trip.return_date)}
        </span>
      )}
    </div>
  );
}
