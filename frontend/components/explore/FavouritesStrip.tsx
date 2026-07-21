"use client";

// ─── FavouritesStrip — "Your favourites" row on Explore ──────────────────────
// The relaxed surface for favourited cities: shows each favourite's cheapest
// current fare regardless of tier (the hero board is steal-only), with the tier
// coloring promoted via promoteFavouriteTier. Favourites with no scraped fares
// still appear as a muted "no fares yet" chip so the user sees the full set.
// Hidden when signed out or nothing is starred.
//
// Fetches its OWN unfiltered cheapest-per-city set rather than reusing the grid's
// cities: the grid may be narrowed to "only my free dates", but a favourite's
// price is worth showing regardless of whether it lands on a free day (the user
// clicks through to the city page to apply their own filters).

import { useEffect, useState } from "react";
import Link from "next/link";
import FareTag from "@/components/ui/FareTag";
import { useSavedCities } from "@/lib/saved-cities";
import { useOrigins } from "@/lib/useOrigins";
import { getCities } from "@/lib/client";
import { promoteFavouriteTier } from "@/lib/score";
import { getDestination } from "@/data/destinations.gen";
import type { CitySummary } from "@/types/api";

interface FavouritesStripProps {
  /** Current `?from=` query, forwarded so city links keep the origin filter. */
  query?: string;
}

export default function FavouritesStrip({ query }: FavouritesStripProps) {
  const { saved, signedIn } = useSavedCities();
  const { origins } = useOrigins();

  const [cities, setCities] = useState<CitySummary[] | null>(null);

  const active = signedIn && saved.size > 0;
  const originsKey = origins.join(",");

  // Load unfiltered cheapest-per-city once the user has favourites. Keyed on
  // origins only — the favourite set changing doesn't need a refetch (prices
  // are the same; we just index into what we have).
  useEffect(() => {
    if (!active) {
      setCities(null);
      return;
    }
    let cancelled = false;
    getCities({ from: origins })
      .then((res) => {
        if (!cancelled) setCities(res.cities);
      })
      .catch(() => {
        if (!cancelled) setCities(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, originsKey]);

  if (!active) return null;

  const byCode = new Map((cities ?? []).map((c) => [c.code, c]));

  // Favourites with a current fare first (cheapest → priciest), no-fare last.
  const items = [...saved]
    .map((code) => ({ code, city: byCode.get(code) ?? null }))
    .sort((a, b) => {
      if (a.city && b.city) return a.city.best.price - b.city.best.price;
      return a.city ? -1 : b.city ? 1 : 0;
    });

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Your favourites
        </h2>
        <Link
          href="/settings"
          className="text-xs text-ink-muted transition-colors hover:text-ink"
        >
          Manage
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map(({ code, city }) => {
          const href = query ? `/city/${code}?${query}` : `/city/${code}`;
          const name = city?.name ?? getDestination(code)?.name ?? code;

          return (
            <Link
              key={code}
              href={href}
              className="group flex shrink-0 items-center gap-2 rounded-tag border border-line bg-card px-3 py-1.5 shadow-card transition-transform duration-150 ease-out-quart hover:-translate-y-px"
            >
              <span className="whitespace-nowrap text-sm font-medium text-ink">
                {name}
              </span>
              {city ? (
                <FareTag
                  price={city.best.price}
                  tier={promoteFavouriteTier(
                    city.best.deal_tier,
                    city.best.score,
                    city.best.price,
                    city.code,
                  )}
                  size="sm"
                />
              ) : (
                <span className="whitespace-nowrap font-mono text-[11px] text-ink-muted/70">
                  no fares yet
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
