"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CalTrip } from "@/types/api";
import {
  formatDateShort,
  formatPrice,
  formatRange,
  nightsLabel,
} from "@/lib/format";
import { getDestination } from "@/data/destinations.gen";
import CountryFlag from "@/components/ui/CountryFlag";

interface TripTooltipProps {
  trip: CalTrip;
  /** the bar element the tooltip points at */
  anchor: HTMLElement;
}

/**
 * Lightweight hover tooltip: route, dates, nights, price, and "% below typical"
 * when the fare beats the route baseline (delta_pct < 0). Positioned just above
 * the hovered bar via fixed coordinates from the anchor's bounding box. The
 * stretch options now live on the bar itself (the full-length bubble, 2c).
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
    // reposition when the anchor (or its swapped dates) changes
  }, [anchor, trip.outbound_date, trip.return_date]);

  const belowPct =
    trip.delta_pct != null && trip.delta_pct < 0
      ? Math.round(-trip.delta_pct)
      : null;

  const dest = getDestination(trip.destination);
  const oj = trip.openjaw ?? null;

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
          {oj
            ? oj.ground
              ? `${oj.out.origin} → ${oj.out.destination} ⇢ ${oj.back.origin} → ${oj.back.destination}`
              : `${oj.out.origin} → ${trip.destination} → ${oj.back.destination}`
            : `${trip.origin} → ${trip.destination}`}
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
        {oj && oj.vs_roundtrip != null && oj.vs_roundtrip > 0 && (
          <span className="ml-2 text-xs font-medium text-steal">
            €{Math.round(oj.vs_roundtrip)} under round trip
          </span>
        )}
      </p>

      {/* ─── Near-miss: spills 1 day outside the free window ──────────────── */}
      {trip.near_avail && (
        <p className="mt-1 text-xs font-medium text-nearmiss-ink">
          ⚠{" "}
          {trip.near_avail.out_spill > 0
            ? `Leaves ${trip.near_avail.out_spill} day before your free window`
            : `Returns ${trip.near_avail.ret_spill} day after your free window`}
        </p>
      )}

      {/* ─── Open-jaw legs (mix & match bar) ───────────────────────────────── */}
      {oj && (
        <div className="mt-2 border-t border-line pt-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            {oj.ground
              ? "Twin city — two tickets"
              : `Mix & match — ${oj.same_origin ? "two singles" : "two tickets"}`}
          </p>
          <ul className="mt-1 space-y-0.5">
            <li className="tnum flex items-baseline justify-between gap-3 font-mono text-xs text-ink">
              <span>
                {oj.out.origin} → {oj.out.destination}
                <span className="text-ink-muted">
                  {" "}
                  · {formatDateShort(oj.out.date)}
                </span>
              </span>
              <span>{formatPrice(oj.out.price)}</span>
            </li>
            {oj.ground && (
              <li className="tnum font-mono text-xs text-ink-muted">
                ⇢ {oj.ground.from} → {oj.ground.to} · ~{oj.ground.hours}h
                overland
              </li>
            )}
            <li className="tnum flex items-baseline justify-between gap-3 font-mono text-xs text-ink">
              <span>
                {oj.back.origin} → {oj.back.destination}
                <span className="text-ink-muted">
                  {" "}
                  · {formatDateShort(oj.back.date)}
                </span>
              </span>
              <span>{formatPrice(oj.back.price)}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
