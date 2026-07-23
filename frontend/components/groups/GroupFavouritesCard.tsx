"use client";

// ─── GroupFavouritesCard — the crew's shared favourite destinations ──────────
// Same search UX as Settings/onboarding (FavouriteSearch: multi-select, the
// menu stays open, picks show a ✓), with one structural difference: there is
// no provider here. The personal card writes through useSavedCities because
// unrelated trees read that set; a group's list is read only inside
// /groups/[id], which already owns one authoritative GroupDetailResponse.
//
// The list renders from optimistic local state (adopted from the prop when no
// save is in flight) so rapid multi-select toggles compose instead of racing
// the replace-all PUT, and a pick is visible immediately — the parent's echo
// lands later. Saves are chained through one promise queue so out-of-order
// PUTs can't resurrect a removed city.
//
// Any member can add or remove: a group favourite is a property of the crew,
// the same posture as rotating the shared invite link.

import { useEffect, useRef, useState } from "react";
import FavouriteSearch from "@/components/settings/FavouriteSearch";
import {
  DESTINATIONS,
  getDestination,
  type Destination,
} from "@/data/destinations.gen";
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
  const [list, setList] = useState<string[]>(favourites);
  const [error, setError] = useState<string | null>(null);
  const { saved: myFavourites } = useSavedCities();

  const listRef = useRef(list);
  const pendingRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  // Adopt external changes (another member's edit surfacing via a refetch)
  // only when nothing of ours is still in flight — otherwise the stale echo
  // of save N would clobber the optimistic state of save N+1.
  useEffect(() => {
    if (pendingRef.current === 0) {
      listRef.current = favourites;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setList(favourites);
    }
  }, [favourites]);

  function mutate(next: string[]) {
    listRef.current = next;
    setList(next);
    setError(null);
    pendingRef.current += 1;
    queueRef.current = queueRef.current
      .then(() => putGroupFavourites(groupId, listRef.current))
      .then((detail) => onChange(detail))
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Couldn't save. Try again.",
        );
      })
      .finally(() => {
        pendingRef.current -= 1;
      });
  }

  const saved = new Set(list);

  function toggleCity(city: Destination) {
    const code = city.code.toUpperCase();
    mutate(
      saved.has(code)
        ? list.filter((c) => c !== code)
        : [...list, code],
    );
  }

  function toggleCountry(
    _country: string,
    cities: readonly string[],
    active: boolean,
  ) {
    const next = new Set(list);
    for (const code of cities) {
      if (active) next.add(code);
      else next.delete(code);
    }
    mutate([...next]);
  }

  const pills = list
    .map((code) => ({ code, name: getDestination(code)?.name ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Nothing to import if every personal favourite is already on the list.
  const importable = [...myFavourites].filter((c) => !saved.has(c));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Everyone in the group sees these highlighted on the board, and they get a
        bigger share of it. Any member can add or remove.
      </p>

      <div className="max-w-md">
        <FavouriteSearch
          cities={DESTINATIONS}
          saved={saved}
          onCityToggle={toggleCity}
          onCountryToggle={toggleCountry}
        />
      </div>

      {pills.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {pills.map((p) => (
            <li key={p.code}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-1.5 pl-3 pr-1.5 text-sm text-ink">
                {p.name}
                <button
                  type="button"
                  onClick={() => mutate(list.filter((c) => c !== p.code))}
                  aria-label={`Remove ${p.name} from the group's favourites`}
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
          No group favourites yet — search for a city or country above.
        </p>
      )}

      {importable.length > 0 && (
        <button
          type="button"
          onClick={() => mutate([...list, ...importable])}
          className="rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink-muted"
        >
          Add my {importable.length} favourite
          {importable.length === 1 ? "" : "s"}
        </button>
      )}

      {error && <p className="text-sm text-alert">{error}</p>}
    </div>
  );
}
