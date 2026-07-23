"use client";

// Favourite destinations step — the same searchable grouped picker used in
// Settings, with state shared through useSavedCities.

import FavouritesCard from "@/components/settings/FavouritesCard";

export default function DestinationsStep() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          Choose your favourite cities or countries
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          We&rsquo;ll prioritise deals to these places, including worthwhile
          fares that are slightly pricier.
        </p>
      </div>

      <FavouritesCard />
    </div>
  );
}
