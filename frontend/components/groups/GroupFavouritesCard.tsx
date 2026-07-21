"use client";

// ─── GroupFavouritesCard — the crew's shared favourite destinations ──────────
// Mirrors components/settings/FavouritesCard, with one structural difference:
// there is no context here. The personal card writes through useSavedCities
// because unrelated trees read that set; a group's list is read only inside
// /groups/[id], which already owns one authoritative GroupDetailResponse — so
// this takes the list as a prop and hands the server's echo straight back up.
//
// Any member can add or remove: a group favourite is a property of the crew,
// the same posture as rotating the shared invite link.

import { useState } from "react";
import SearchCombobox, {
  type SearchSelection,
} from "@/components/explore/SearchCombobox";
import { DESTINATIONS, getDestination } from "@/data/destinations.gen";
import { putGroupFavourites, ApiError } from "@/lib/client";
import { useSavedCities } from "@/lib/saved-cities";
import type { GroupDetailResponse } from "@/types/api";

interface GroupFavouritesCardProps {
  groupId: string;
  /** the crew's current favourites (uppercase IATA) */
  favourites: string[];
  /** the server's full echo — the caller replaces its detail state with this */
  onChange: (detail: GroupDetailResponse) => void;
}

export default function GroupFavouritesCard({
  groupId,
  favourites,
  onChange,
}: GroupFavouritesCardProps) {
  const [selection, setSelection] = useState<SearchSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { saved: myFavourites } = useSavedCities();

  async function save(cities: string[]) {
    setSaving(true);
    setError(null);
    try {
      onChange(await putGroupFavourites(groupId, cities));
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save. Try again.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  function handleSelect(sel: SearchSelection | null) {
    // Only city picks add; text stays for typing; country/region have nothing
    // to act on here (same rule as the personal card).
    if (sel?.kind === "city") {
      const code = sel.value.toUpperCase();
      if (!favourites.includes(code)) void save([...favourites, code]);
      setSelection(null);
      return;
    }
    if (!sel || sel.kind === "text") setSelection(sel);
  }

  const pills = favourites
    .map((code) => ({ code, name: getDestination(code)?.name ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Nothing to import if every personal favourite is already on the list.
  const importable = [...myFavourites].filter((c) => !favourites.includes(c));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Everyone in the group sees these highlighted on the board, and they get a
        bigger share of it. Any member can add or remove.
      </p>

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
              <span className="inline-flex items-center gap-1.5 rounded-(--radius-tag) border border-fav bg-card py-1 pl-3 pr-1.5 text-sm text-ink">
                {p.name}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void save(favourites.filter((c) => c !== p.code))
                  }
                  aria-label={`Remove ${p.name} from the group's favourites`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-line/60 hover:text-ink disabled:opacity-50"
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
          No group favourites yet — add one above.
        </p>
      )}

      {importable.length > 0 && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void save([...favourites, ...importable])}
          className="rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink-muted disabled:opacity-50"
        >
          Add my {importable.length} favourite
          {importable.length === 1 ? "" : "s"}
        </button>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}
    </div>
  );
}
