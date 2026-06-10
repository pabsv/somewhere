"use client";

import type { Trip } from "@/types/api";
import { formatPrice } from "@/lib/format";

interface TripBarProps {
  trip: Trip;
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
  onHover: (trip: Trip | null, el: HTMLElement | null) => void;
  onClick: (trip: Trip) => void;
}

// tier → bar skin. Yellow allowed here (deal bars are a sanctioned yellow use).
const TIER_BAR: Record<Trip["deal_tier"], string> = {
  steal: "bg-steal text-white border-transparent",
  deal: "bg-brand/15 text-brand-ink border border-brand",
  fair: "bg-card text-ink border border-line",
};

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
  onHover,
  onClick,
}: TripBarProps) {
  const span = Math.max(1, endCol - startCol + 1);

  return (
    <button
      type="button"
      onMouseEnter={(e) => onHover(trip, e.currentTarget)}
      onMouseLeave={() => onHover(null, null)}
      onFocus={(e) => onHover(trip, e.currentTarget)}
      onBlur={() => onHover(null, null)}
      onClick={() => onClick(trip)}
      style={{
        gridColumn: `${startCol} / span ${span}`,
        gridRow: lane + 1,
      }}
      title={`${trip.origin} → ${trip.destination} · ${formatPrice(trip.price)}`}
      className={`group/bar relative z-10 flex h-6 min-w-0 items-center overflow-hidden rounded-full px-1.5 text-left transition-transform duration-[120ms] ease-out-quart hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
        TIER_BAR[trip.deal_tier]
      } ${clippedStart ? "rounded-l-none" : ""} ${
        clippedEnd ? "rounded-r-none" : ""
      }`}
    >
      <span className="tnum truncate font-mono text-[11px] font-semibold uppercase tracking-wide">
        {trip.destination} {formatPrice(trip.price)}
      </span>
    </button>
  );
}
