"use client";

// ─── Which favourites apply here ─────────────────────────────────────────────
// Calendar bars (TripBar, StretchOverlay, TripRail) draw the gold
// contour for "this one is yours". On /calendar "yours" means the viewer's own
// starred cities; on a group calendar it means the CREW's shared list, which is
// deliberately the same for every member — a board people point at on a call
// only works when everyone sees the same gold bars.
//
// Those bar components are shared between both surfaces, so they can't just
// call useSavedCities(): that would ring the viewer's personal stars on the
// group page. Instead they read this scope, which falls back to the personal
// set when nobody has overridden it — so /calendar needs no wiring at all and
// the group pages wrap their subtree once.

import { createContext, useContext } from "react";
import { useSavedCities } from "@/lib/saved-cities";

const FavouriteScopeContext = createContext<ReadonlySet<string> | null>(null);

/**
 * Override the favourite set for a subtree (the group calendar / board).
 * Pass a stable Set — callers should memoize it, since it feeds every bar.
 */
export function FavouriteScopeProvider({
  value,
  children,
}: {
  value: ReadonlySet<string>;
  children: React.ReactNode;
}) {
  return (
    <FavouriteScopeContext.Provider value={value}>
      {children}
    </FavouriteScopeContext.Provider>
  );
}

/**
 * The favourite set that applies where this component renders: the nearest
 * scope override, else the signed-in user's own starred cities (empty when
 * signed out, so bars simply carry no contour).
 */
export function useFavouriteSet(): ReadonlySet<string> {
  const scoped = useContext(FavouriteScopeContext);
  const { saved } = useSavedCities();
  return scoped ?? saved;
}
