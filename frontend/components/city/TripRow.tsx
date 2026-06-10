// ─── TripRow — one upcoming trip on the City detail (Track E) ────────────────
// origin→dest mono IATA codes · date range · nights · airlines · direct/stops
// Badge · FareTag (tier-colored price) · "% below typical" (steal-green) ·
// price sparkline · Google Flights link. Subtle hover lift. Spec §D Trip + §F.

import type { Trip } from "@/types/api";
import Badge from "@/components/ui/Badge";
import FareTag from "@/components/ui/FareTag";
import Spark from "@/components/ui/Spark";
import { formatRange, nightsLabel, parseLocalDate } from "@/lib/format";
import { getSearchUrl } from "@/lib/searchUrl";

interface TripRowProps {
  trip: Trip;
}

/** Whole nights between two YYYY-MM-DD dates (local-safe). */
function nightsBetween(out: string, ret: string): number {
  const ms = parseLocalDate(ret).getTime() - parseLocalDate(out).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export default function TripRow({ trip }: TripRowProps) {
  const nights = nightsBetween(trip.outbound_date, trip.return_date);
  const belowPct =
    trip.delta_pct != null && trip.delta_pct < 0
      ? Math.round(-trip.delta_pct)
      : null;
  const stopsLabel = trip.is_direct
    ? "Direct"
    : `${trip.outbound.stops} stop${trip.outbound.stops === 1 ? "" : "s"}`;
  const airlines = trip.airlines.join(", ");

  return (
    <a
      href={getSearchUrl(trip)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-card transition-transform duration-150 ease-out-quart hover:-translate-y-px sm:gap-4"
    >
      {/* Route + dates + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="tnum shrink-0 font-mono text-sm font-medium uppercase tracking-wide text-ink">
            {trip.origin}
            <span className="px-1 text-ink-muted">→</span>
            {trip.destination}
          </span>
          <span className="tnum truncate font-mono text-sm text-ink-muted">
            {formatRange(trip.outbound_date, trip.return_date)}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <span className="tnum font-mono">{nightsLabel(nights)}</span>
          <span aria-hidden="true" className="text-ink-muted/50">
            ·
          </span>
          <Badge variant="neutral">{stopsLabel}</Badge>
          {airlines ? (
            <span className="truncate">{airlines}</span>
          ) : null}
        </div>
      </div>

      {/* Price column */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          {trip.price_points.length > 1 ? (
            <Spark points={trip.price_points} />
          ) : null}
          <FareTag price={trip.price} tier={trip.deal_tier} size="md" />
        </div>
        {belowPct != null ? (
          <span className="tnum font-mono text-xs font-medium text-steal">
            {belowPct}% below typical
          </span>
        ) : null}
      </div>
    </a>
  );
}

/** Gray-block placeholder matching TripRow's footprint while trips load. */
export function TripRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-4 rounded-card border border-line bg-card px-4 py-3 shadow-card"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/5 animate-pulse rounded bg-line" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-line" />
      </div>
      <div className="h-[1.625rem] w-11 shrink-0 animate-pulse rounded-tag bg-line" />
    </div>
  );
}
