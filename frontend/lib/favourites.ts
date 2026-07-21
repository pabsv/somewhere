// ─── Favourite matching — the one place the "is this bar mine?" rule lives ────
// A favourite is a starred destination IATA code (users.saved_cities, or a
// group's shared list — see lib/favourite-scope.tsx for which set applies).
//
// One rule, one home: TripBar, StretchOverlay, TripRail, AgendaMonth, the group
// calendar and app/calendar/page.tsx all ask here rather than each re-deriving
// it. (This module also used to hold the twin-city "either city counts" rule;
// that went with the multi-city rollback — see docs/MULTICITY_PLAN.md.)
//
// Pure + Mongo-free so it runs under `npx tsx --test`.

/**
 * The minimum shape needed to decide. Structural rather than `CalTrip` so a
 * `Trip`, a `GroupTrip` and a raw fixture all fit.
 */
export interface FavouriteMatchable {
  destination: string;
}

/**
 * The favourited city this trip matched, or null when it matched none.
 *
 * Returns the *code* rather than a boolean on purpose: price bands are
 * reach-scaled per destination (lib/score.ts `reachMultiplier`), so callers
 * promoting a favourite's tier must promote against that city's own reach.
 * Callers that only need a yes/no should use `isFavouriteTrip`.
 */
export function favouriteDest(
  trip: FavouriteMatchable,
  saved: ReadonlySet<string>,
): string | null {
  return saved.has(trip.destination) ? trip.destination : null;
}

/** True when the trip's city is favourited. */
export function isFavouriteTrip(
  trip: FavouriteMatchable,
  saved: ReadonlySet<string>,
): boolean {
  return favouriteDest(trip, saved) !== null;
}
