"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CalTrip } from "@/types/api";
import {
  formatDelta,
  formatPrice,
  formatRange,
  nearMissSentence,
  nightsLabel,
} from "@/lib/format";
import {
  stretchCount,
  type StayStretch,
  type StretchSet,
} from "@/components/tripcal/useStayExtensions";
import { getDestination } from "@/data/destinations.gen";
import CountryFlag from "@/components/ui/CountryFlag";

interface TripTooltipProps {
  trip: CalTrip;
  /** the bar element the tooltip points at */
  anchor: HTMLElement;
  /**
   * Stretch options to list read-only (mobile long-press preview — there's no
   * hover there, so the desktop bubble can't exist; release dismisses, so the
   * rows are informational, not clickable). Omitted on desktop, where the
   * options live on the bar itself (the full-length bubble, 2c).
   */
  stretches?: StretchSet;
}

/** One read-only stretch row: shift label + priced delta (`~` = estimated). */
function stretchLabel(s: StayStretch): string {
  if (s.kind === "full") return "Full window";
  return s.kind === "earlier" ? `← ${s.daysEarlier}d` : `+${s.daysLater}d`;
}

/**
 * Lightweight hover tooltip: route, dates, nights, and price. Positioned just
 * above the hovered bar via fixed coordinates from the anchor's bounding box.
 * On desktop the stretch options live on the bar itself (the full-length
 * bubble, 2c); on the mobile rail they render here as read-only rows.
 */
export default function TripTooltip({
  trip,
  anchor,
  stretches,
}: TripTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const rows: StayStretch[] = stretches
    ? [
        ...stretches.earlier,
        ...stretches.later,
        ...(stretches.fullWindow ? [stretches.fullWindow] : []),
      ]
    : [];
  const rowCount = stretches ? stretchCount(stretches) : 0;

  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect();
    const el = ref.current;
    const w = el?.offsetWidth ?? 200;
    const h = el?.offsetHeight ?? 64;
    let left = a.left + a.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const top = a.top - h - 8;
    setPos({ left, top: top < 8 ? a.bottom + 8 : top });
    // reposition when the anchor (or its swapped dates) changes, and when the
    // stretch rows land (they grow the tooltip after the fetch resolves)
  }, [anchor, trip.outbound_date, trip.return_date, rowCount]);

  const dest = getDestination(trip.destination);

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? "visible" : "hidden",
      }}
      className="pointer-events-none fixed z-[60] w-max max-w-[15rem] rounded-card border border-line bg-card px-3 py-2 shadow-card"
    >
      <p className="text-sm font-semibold text-ink">
        <CountryFlag code={dest?.country} className="mr-1" />
        {dest?.name ?? trip.destination}
        <span className="tnum ml-2 font-mono text-xs font-medium uppercase tracking-wide text-ink-muted">
          {trip.origin} → {trip.destination}
        </span>
      </p>
      <p className="tnum mt-0.5 font-mono text-xs text-ink-muted">
        {formatRange(trip.outbound_date, trip.return_date)} ·{" "}
        {nightsLabel(trip.duration_days)}
      </p>
      <p className="tnum mt-1 font-mono text-sm font-semibold text-ink">
        {formatPrice(trip.price)}
      </p>

      {/* ─── Near-miss: spills up to 2 days outside the free window ───────── */}
      {trip.near_avail && (
        <p className="mt-1 text-xs font-medium text-nearmiss-ink">
          ⚠ {nearMissSentence(trip.near_avail)}
        </p>
      )}

      {/* ─── Stretch rows (mobile long-press only) ────────────────────────── */}
      {rows.length > 0 && (
        <div className="mt-2 border-t border-line pt-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            Stretch this trip
          </p>
          {rows.map((s) => (
            <p
              key={`${s.out_date}|${s.return_date}`}
              className="tnum mt-0.5 flex items-baseline justify-between gap-3 font-mono text-xs text-ink"
            >
              <span>
                {stretchLabel(s)}
                <span className="ml-1.5 text-ink-muted">
                  {formatRange(s.out_date, s.return_date)}
                </span>
              </span>
              <span className="font-semibold text-steal">
                {s.estimated ? "~" : ""}
                {formatDelta(s.deltaPrice)}
              </span>
            </p>
          ))}
          {rows.some((s) => s.estimated) && (
            <p className="mt-1 text-[10px] text-ink-muted">
              ~ estimated from one-way fares
            </p>
          )}
        </div>
      )}
    </div>
  );
}
