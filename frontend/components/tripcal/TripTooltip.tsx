"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { Trip } from "@/types/api";
import { formatPrice, formatRange, nightsLabel } from "@/lib/format";
import { getDestination } from "@/data/destinations.gen";
import CountryFlag from "@/components/ui/CountryFlag";

interface TripTooltipProps {
  trip: Trip;
  /** the bar element the tooltip points at */
  anchor: HTMLElement;
}

/**
 * Lightweight hover tooltip: route, dates, nights, price, and "% below typical"
 * when the fare beats the route baseline (delta_pct < 0). Positioned just above
 * the hovered bar via fixed coordinates from the anchor's bounding box.
 */
export default function TripTooltip({ trip, anchor }: TripTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect();
    const el = ref.current;
    const w = el?.offsetWidth ?? 200;
    const h = el?.offsetHeight ?? 64;
    let left = a.left + a.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const top = a.top - h - 8;
    setPos({ left, top: top < 8 ? a.bottom + 8 : top });
  }, [anchor]);

  const belowPct =
    trip.delta_pct != null && trip.delta_pct < 0
      ? Math.round(-trip.delta_pct)
      : null;

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
        {belowPct != null && (
          <span className="ml-2 text-xs font-medium text-steal">
            {belowPct}% below typical
          </span>
        )}
      </p>
    </div>
  );
}
