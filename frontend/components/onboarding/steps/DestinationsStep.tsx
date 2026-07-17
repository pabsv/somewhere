"use client";

// Favourite destinations step — reuses the Settings FavouritesCard wholesale
// (SearchCombobox over the full catalog + removable pills, state shared via
// useSavedCities), plus a quick-add chip row of popular (tier A) cities so
// starring takes one tap without typing.

import Chip from "@/components/ui/Chip";
import CountryFlag from "@/components/ui/CountryFlag";
import FavouritesCard from "@/components/settings/FavouritesCard";
import { DESTINATIONS } from "@/data/destinations.gen";
import { useSavedCities } from "@/lib/saved-cities";

const POPULAR = DESTINATIONS.filter((d) => d.tier === "A").sort((a, b) =>
  a.name.localeCompare(b.name),
);

export default function DestinationsStep() {
  const { isSaved, toggle } = useSavedCities();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">
          Star the places you&rsquo;d drop everything for.
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Favourites get pinned to the top of the board and count on a
          merely-good fare, not just a steal.
        </p>
      </div>

      <FavouritesCard />

      <div>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          Popular
        </h3>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
          {POPULAR.map((d) => (
            <Chip
              key={d.code}
              size="sm"
              selected={isSaved(d.code)}
              onClick={() => toggle(d.code)}
              title={`${d.name} (${d.code})`}
            >
              <CountryFlag code={d.country} />
              {d.name}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
