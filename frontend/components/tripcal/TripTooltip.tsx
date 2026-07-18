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
import type { StayExtension } from "./useStayExtensions";

interface TripTooltipProps {
  trip: CalTrip;
  /** the bar element the tooltip points at */
  anchor: HTMLElement;
  /** "stay longer" suggestions — omitted/empty = section hidden */
  extensions?: StayExtension[];
}

/** "+€8" / "−€4" / "±€0" — signed whole-euro delta vs the main fare. */
function formatDelta(delta: number): string {
  const r = Math.round(delta);
  if (r > 0) return `+€${r}`;
  if (r < 0) return `−€${-r}`;
  return "±€0";
}

/**
 * Lightweight hover tooltip: route, dates, nights, price, and "% below typical"
 * when the fare beats the route baseline (delta_pct < 0). Positioned just above
 * the hovered bar via fixed coordinates from the anchor's bounding box.
 */
export default function TripTooltip({
  trip,
  anchor,
  extensions = [],
}: TripTooltipProps) {
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
    // reposition when the "stay longer" rows pop in (tooltip height changes)
  }, [anchor, extensions.length]);

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
            ? `${oj.out.origin} → ${trip.destination} → ${oj.back.destination}`
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

      {/* ─── Open-jaw legs (mix & match bar) ───────────────────────────────── */}
      {oj && (
        <div className="mt-2 border-t border-line pt-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            Mix &amp; match — {oj.same_origin ? "two singles" : "two tickets"}
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

      {/* ─── "Stay longer" suggestions (sparse data → often absent) ───────── */}
      {extensions.length > 0 && (
        <div className="mt-2 border-t border-line pt-1.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            Stay longer
          </p>
          <ul className="mt-1 space-y-0.5">
            {extensions.map((ext) => (
              <li
                key={ext.return_date}
                className="tnum flex items-baseline justify-between gap-3 font-mono text-xs text-ink"
              >
                <span>
                  +{ext.extraNights} night{ext.extraNights === 1 ? "" : "s"}
                  <span className="text-ink-muted">
                    {" "}
                    · → {formatDateShort(ext.return_date)}
                  </span>{" "}
                  · {formatPrice(ext.price)}
                </span>
                <span
                  className={
                    Math.round(ext.deltaPrice) > 0
                      ? "text-ink-muted"
                      : "font-medium text-steal"
                  }
                >
                  {formatDelta(ext.deltaPrice)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
