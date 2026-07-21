"use client";

import Link from "next/link";
import FareTag from "@/components/ui/FareTag";
import StarButton from "@/components/ui/StarButton";
import { useSavedCities } from "@/lib/saved-cities";
import { promoteFavouriteTier } from "@/lib/score";
import type { CitySummary } from "@/types/api";
import { countryName } from "./countries";

interface CityCardProps {
  city: CitySummary;
  /** Current `?from=` query, forwarded so the city page keeps the origin filter. */
  query?: string;
  /** false = user opted out of open-jaw (Preferences.allow_open_jaw). */
  showOpenJaw?: boolean;
}

/**
 * One destination in the Explore grid. City name (display), country + IATA tag
 * (mono yellow), the cheapest fare as a price-band-colored FareTag, the origin,
 * and the trip count. The whole card links to /city/[code], preserving the
 * origin filter.
 */
export default function CityCard({
  city,
  query,
  showOpenJaw = true,
}: CityCardProps) {
  const { best } = city;
  // Open-jaw / twin-city hints: only present when the combo beats the cheapest
  // stored round trip (the API attaches them under exactly that condition).
  const openjaw = showOpenJaw ? (city.openjaw ?? null) : null;
  const twin = showOpenJaw ? (city.twin ?? null) : null;
  const { signedIn, isSaved, toggle } = useSavedCities();
  const favourited = isSaved(city.code);
  // Favourites get relaxed tier coloring (a "deal" reads as a "steal", etc.).
  const displayTier = favourited
    ? promoteFavouriteTier(best.deal_tier, best.score, best.price, city.code)
    : best.deal_tier;

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
        <div className="flex shrink-0 items-start gap-1">
          {signedIn && (
            <StarButton
              active={favourited}
              onToggle={() => toggle(city.code)}
              label={city.name}
              size="sm"
              className="-mt-1 -mr-1"
            />
          )}
          <FareTag price={best.price} tier={displayTier} size="md" />
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-ink-muted/70">
            from {best.origin}
          </p>
          {openjaw && (
            <p
              className="tnum mt-0.5 truncate font-mono text-xs font-medium text-steal"
              title={`Two one-way tickets: ${openjaw.out_origin} → ${city.code} + ${city.code} → ${openjaw.back_origin} — cheaper than any stored round trip`}
            >
              ⇄ mix &amp; match €{Math.round(openjaw.total_price)}
              {!openjaw.same_origin && (
                <span className="text-ink-muted">
                  {" "}
                  {openjaw.out_origin} out · {openjaw.back_origin} back
                </span>
              )}
            </p>
          )}
          {twin && (
            <p
              className="tnum mt-0.5 truncate font-mono text-xs font-medium text-steal"
              title={`Twin city: fly into ${city.code}, ~${twin.hours}h overland, fly home from ${twin.other} — the whole two-city trip beats any stored round trip here`}
            >
              +{twin.other} twin city €{Math.round(twin.total_price)}
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
