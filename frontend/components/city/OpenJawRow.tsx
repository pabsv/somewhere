// ─── OpenJawRow — one open-jaw combo on the City detail (open-jaw Phase 2) ────
// Two legs, two SEPARATE tickets: out O1→dest and back dest→O2, each with its
// own Google Flights one-way link (the confirmation path — grid prices are
// last-scrape estimates). Total = sum of one-ways = real bookable price.
// vs_roundtrip badge shows the "actually a win?" signal when a round trip is
// stored for the same dates. Twin-city combos (Phase 5) carry a `ground` hop —
// rendered between the legs with both city names linked to their city pages.
// Spec: docs/MULTICITY_PLAN.md Phases 2 + 5.

import Link from "next/link";
import type { OpenJawTrip } from "@/types/api";
import Badge from "@/components/ui/Badge";
import { getDestination } from "@/data/destinations.gen";
import {
  formatDateShort,
  formatPrice,
  nightsLabel,
} from "@/lib/format";
import { buildGoogleFlightsOneWayUrl } from "@/lib/searchUrl";

interface OpenJawRowProps {
  trip: OpenJawTrip;
}

function LegLink({
  origin,
  destination,
  date,
  price,
}: {
  origin: string;
  destination: string;
  date: string;
  price: number;
}) {
  return (
    <a
      href={buildGoogleFlightsOneWayUrl(origin, destination, date)}
      target="_blank"
      rel="noopener noreferrer"
      className="group/leg flex items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-line/40"
      title={`Book one-way ${origin} → ${destination} on Google Flights`}
    >
      <span className="tnum shrink-0 font-mono text-sm font-medium uppercase tracking-wide text-ink">
        {origin}
        <span className="px-1 text-ink-muted">→</span>
        {destination}
      </span>
      <span className="tnum font-mono text-sm text-ink-muted">
        {formatDateShort(date)}
      </span>
      <span className="tnum font-mono text-sm text-ink">
        {formatPrice(price)}
      </span>
      <span
        aria-hidden="true"
        className="text-xs text-ink-muted/50 opacity-0 transition-opacity group-hover/leg:opacity-100"
      >
        ↗
      </span>
    </a>
  );
}

/** City name linked to its /city page — the twin-city cross-link. */
function CityLink({ code }: { code: string }) {
  const name = getDestination(code)?.name ?? code;
  return (
    <Link
      href={`/city/${code}`}
      className="font-medium text-ink underline decoration-line underline-offset-2 transition-colors hover:decoration-ink"
    >
      {name}
    </Link>
  );
}

export default function OpenJawRow({ trip }: OpenJawRowProps) {
  const win =
    trip.vs_roundtrip != null && trip.vs_roundtrip > 0
      ? Math.round(trip.vs_roundtrip)
      : null;
  const ground = trip.ground ?? null;

  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-card sm:gap-4">
      {/* Two legs, each its own booking link */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5">
          <LegLink
            origin={trip.out.origin}
            destination={trip.out.destination}
            date={trip.out.date}
            price={trip.out.price}
          />
          {ground && (
            <p className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-ink-muted">
              <span aria-hidden="true" className="font-mono">
                ⇢
              </span>
              <CityLink code={ground.from} />
              <span aria-hidden="true">→</span>
              <CityLink code={ground.to} />
              <span className="tnum font-mono">
                · ~{ground.hours}h overland
              </span>
            </p>
          )}
          <LegLink
            origin={trip.back.origin}
            destination={trip.back.destination}
            date={trip.back.date}
            price={trip.back.price}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1 text-xs text-ink-muted">
          <span className="tnum font-mono">{nightsLabel(trip.nights)}</span>
          <span aria-hidden="true" className="text-ink-muted/50">
            ·
          </span>
          <Badge variant="neutral">
            {ground
              ? "twin city"
              : trip.same_origin
                ? "2 singles"
                : "2 tickets"}
          </Badge>
        </div>
      </div>

      {/* Total + round-trip comparison */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="tnum font-mono text-base font-semibold text-ink">
          {formatPrice(trip.total_price)}
        </span>
        {win != null ? (
          <span className="tnum font-mono text-xs font-medium text-steal">
            €{win} under round trip
          </span>
        ) : trip.vs_roundtrip === null ? (
          <span className="text-xs text-ink-muted/70">
            no round trip these dates
          </span>
        ) : null}
      </div>
    </div>
  );
}
