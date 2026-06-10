"use client";

import Link from "next/link";
import FareTag from "@/components/ui/FareTag";
import type { CitySummary } from "@/types/api";
import { countryName } from "./countries";

interface CityCardProps {
  city: CitySummary;
  /** Current `?from=` query, forwarded so the city page keeps the origin filter. */
  query?: string;
}

/**
 * One destination in the Explore grid. City name (display), country + IATA tag
 * (mono yellow), the best fare as a tier-colored FareTag, a "% below typical"
 * line in steal-green when the best fare beats the route baseline, and the trip
 * count. The whole card links to /city/[code], preserving the origin filter.
 */
export default function CityCard({ city, query }: CityCardProps) {
  const { best } = city;
  const belowPct =
    best.delta_pct != null && best.delta_pct < 0
      ? Math.round(-best.delta_pct)
      : null;

  const href = query ? `/city/${city.code}?${query}` : `/city/${city.code}`;

  return (
    <Link
      href={href}
      className="group block animate-row-in rounded-card border border-line bg-card p-4 shadow-card transition-transform duration-150 ease-out-quart hover:-translate-y-px"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold leading-tight text-ink">
            {city.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="truncate text-sm text-ink-muted">
              {countryName(city.country)}
            </span>
            <span className="tnum shrink-0 rounded-tag bg-brand px-1.5 py-px font-mono text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
              {city.code}
            </span>
          </div>
        </div>
        <FareTag price={best.price} tier={best.deal_tier} size="md" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {belowPct != null ? (
            <p className="tnum truncate font-mono text-xs font-medium text-steal">
              {belowPct}% below typical
            </p>
          ) : (
            <p className="truncate font-mono text-xs text-ink-muted/70">
              from {best.origin}
            </p>
          )}
        </div>
        <span className="tnum shrink-0 whitespace-nowrap font-mono text-xs text-ink-muted">
          {city.trip_count} {city.trip_count === 1 ? "trip" : "trips"}
        </span>
      </div>
    </Link>
  );
}

/** Gray-block placeholder matching CityCard's footprint while cities load. */
export function CityCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-card border border-line bg-card p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-5 w-2/3 animate-pulse rounded bg-line" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-line" />
        </div>
        <div className="h-[1.625rem] w-11 animate-pulse rounded-tag bg-line" />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="h-3 w-20 animate-pulse rounded bg-line" />
        <div className="h-3 w-12 animate-pulse rounded bg-line" />
      </div>
    </div>
  );
}
