"use client";

import Link from "next/link";
import Sheet from "@/components/ui/Sheet";
import FareTag from "@/components/ui/FareTag";
import Badge from "@/components/ui/Badge";
import Spark from "@/components/ui/Spark";
import type { Trip } from "@/types/api";
import { getDestination } from "@/data/destinations.gen";
import { getSearchUrl } from "@/lib/searchUrl";
import { formatRange, nightsLabel, formatPrice } from "@/lib/format";

interface TripPopoverProps {
  trip: Trip | null;
  /** current ?from= query string (no leading ?), forwarded to the city link */
  fromQuery: string;
  onClose: () => void;
}

const TIER_BADGE: Record<Trip["deal_tier"], "steal" | "deal" | "neutral"> = {
  steal: "steal",
  deal: "deal",
  fair: "neutral",
};

function LegRow({
  label,
  dep,
  arr,
  duration,
  stops,
}: {
  label: string;
  dep: string;
  arr: string;
  duration: string;
  stops: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="tnum font-mono text-xs text-ink">
        {dep} → {arr}
        <span className="ml-2 text-ink-muted">
          {duration} · {stops === 0 ? "direct" : `${stops} stop${stops > 1 ? "s" : ""}`}
        </span>
      </span>
    </div>
  );
}

/**
 * Click-through trip detail in a side Sheet: full itinerary, the fare with its
 * tier badge and "% below typical" anchor, a price sparkline from
 * trip.price_points, a Google Flights deep link (new tab), and a
 * "More trips to {city} →" link to /city/[code] (preserving ?from=).
 */
export default function TripPopover({
  trip,
  fromQuery,
  onClose,
}: TripPopoverProps) {
  const open = trip != null;
  const city = trip ? getDestination(trip.destination)?.name ?? trip.city : "";
  const belowPct =
    trip?.delta_pct != null && trip.delta_pct < 0
      ? Math.round(-trip.delta_pct)
      : null;
  const cityHref = trip
    ? fromQuery
      ? `/city/${trip.destination}?${fromQuery}`
      : `/city/${trip.destination}`
    : "#";

  return (
    <Sheet open={open} onClose={onClose} title={trip ? city : undefined}>
      {trip && (
        <div className="space-y-5">
          {/* ─── Headline ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="tnum font-mono text-sm font-semibold uppercase tracking-wide text-ink">
                {trip.origin} → {trip.destination}
              </p>
              <p className="tnum mt-1 font-mono text-xs text-ink-muted">
                {formatRange(trip.outbound_date, trip.return_date)} ·{" "}
                {nightsLabel(trip.duration_days)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <FareTag price={trip.price} tier={trip.deal_tier} size="lg" />
              {trip.deal_tier !== "fair" && (
                <Badge variant={TIER_BADGE[trip.deal_tier]} />
              )}
            </div>
          </div>

          {/* ─── Anchor + sparkline ───────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-paper px-3 py-2.5">
            <div className="min-w-0">
              {belowPct != null ? (
                <p className="tnum font-mono text-sm font-medium text-steal">
                  {belowPct}% below typical
                </p>
              ) : (
                <p className="font-mono text-xs text-ink-muted">
                  around the typical fare for this route
                </p>
              )}
              <p className="tnum mt-0.5 font-mono text-[11px] text-ink-muted">
                {trip.airlines.length > 0 ? trip.airlines.join(", ") : "—"}
              </p>
            </div>
            {trip.price_points.length > 1 && (
              <Spark
                points={trip.price_points.map((pt) => ({
                  p: pt.p,
                  at: pt.at,
                }))}
                width={88}
                height={28}
              />
            )}
          </div>

          {/* ─── Itinerary legs ───────────────────────────────────────── */}
          <div className="rounded-card border border-line bg-card px-3">
            <LegRow
              label="Out"
              dep={trip.outbound.dep}
              arr={trip.outbound.arr}
              duration={trip.outbound.duration}
              stops={trip.outbound.stops}
            />
            <LegRow
              label="Back"
              dep={trip.ret.dep}
              arr={trip.ret.arr}
              duration={trip.ret.duration}
              stops={trip.ret.stops}
            />
          </div>

          {/* ─── Actions ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <a
              href={getSearchUrl(trip)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
            >
              Open on Google Flights
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3h7v7M13 3L7 9M11 9v3.5A1.5 1.5 0 0 1 9.5 14h-6A1.5 1.5 0 0 1 2 12.5v-6A1.5 1.5 0 0 1 3.5 5H7" />
              </svg>
            </a>
            <Link
              href={cityHref}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-muted"
            >
              More trips to {city} →
            </Link>
          </div>
        </div>
      )}
    </Sheet>
  );
}
