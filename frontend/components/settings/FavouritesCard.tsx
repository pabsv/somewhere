"use client";

// ─── FavouritesCard — manage favourite destinations from Settings ────────────
// A typeahead (reusing the Explore SearchCombobox over the full DESTINATIONS
// catalog, so cities with no current fares are addable) plus removable pills for
// the current favourites. Shares state with the stars on Explore/City via
// useSavedCities, so changes here sync everywhere live.

import { useState } from "react";
import SearchCombobox, {
  type SearchSelection,
} from "@/components/explore/SearchCombobox";
import { DESTINATIONS, getDestination } from "@/data/destinations.gen";
import { useSavedCities } from "@/lib/saved-cities";

export default function FavouritesCard() {
  const { saved, isSaved, toggle, ready, signedIn } = useSavedCities();
  const [selection, setSelection] = useState<SearchSelection | null>(null);

  function handleSelect(sel: SearchSelection | null) {
    // Only city picks add a favourite; text stays for typing; country/region
    // have nothing to act on here, so they're ignored.
    if (sel?.kind === "city") {
      if (!isSaved(sel.value)) toggle(sel.value);
      setSelection(null);
      return;
    }
    if (!sel || sel.kind === "text") setSelection(sel);
  }

  const pills = [...saved]
    .map((code) => ({ code, name: getDestination(code)?.name ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!ready) {
    return (
      <div aria-hidden="true" className="space-y-3">
        <div className="h-9 w-full max-w-md animate-pulse rounded-(--radius-tag) bg-line" />
        <div className="h-8 w-64 animate-pulse rounded-(--radius-tag) bg-line" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-ink-muted">
        Sign in to pick favourite destinations.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <SearchCombobox
          cities={DESTINATIONS}
          selection={selection}
          onSelect={handleSelect}
          placeholder="Add a destination…"
        />
      </div>

      {pills.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {pills.map((p) => (
            <li key={p.code}>
              <span className="inline-flex items-center gap-1.5 rounded-(--radius-tag) border border-line bg-card py-1 pl-3 pr-1.5 text-sm text-ink">
                {p.name}
                <button
                  type="button"
                  onClick={() => toggle(p.code)}
                  aria-label={`Remove ${p.name} from favourites`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-line/60 hover:text-ink"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted/80">
          No favourites yet — add one above, or tap the star on any city.
        </p>
      )}
    </div>
  );
}
