"use client";

// ─── useStayExtensions — trip-stretch suggestions for a hovered trip ─────────
// Fetches leave-earlier / return-later / full-window candidates for the trip
// (GET /api/trips/extensions, hybrid-priced server-side: exact stored round
// trips win, one-way grid sums fill gaps as ~estimates). When clampToWindows,
// the availability window containing the trip is resolved CLIENT-side and its
// bounds ride along on the request so the server enumerates inside it; without
// a containing window the server falls back to ±3 days.
// Debounced 200ms so sweeping across bars never storms the API; results are
// cached per route+dates+window for the session (cache hits render instantly).

import { useEffect, useState } from "react";
import type { DateWindow, StretchVariant, Trip } from "@/types/api";
import { getTripExtensions } from "@/lib/client";
import { nightsBetween } from "@/lib/format";

export interface StayStretch extends StretchVariant {
  /** price difference vs the hovered trip (positive = costs more) */
  deltaPrice: number;
  /** nights added vs the hovered trip */
  extraNights: number;
  /** days the departure moved earlier (0 for later-only variants) */
  daysEarlier: number;
  /** days the return moved later (0 for earlier-only variants) */
  daysLater: number;
}

export interface StretchSet {
  earlier: StayStretch[];
  later: StayStretch[];
  fullWindow: StayStretch | null;
}

export const EMPTY_STRETCHES: StretchSet = {
  earlier: [],
  later: [],
  fullWindow: null,
};

/** Total rows across a set — tooltip layout + "anything to show?" checks. */
export function stretchCount(s: StretchSet): number {
  return s.earlier.length + s.later.length + (s.fullWindow ? 1 : 0);
}

/**
 * Max rows per direction shown, and how far past the trip we reach when no
 * availability window contains it. Kept equal to STRETCH_MAX_DAYS /
 * NEAR_AVAIL_MAX_SPILL_DAYS — two days is the app's one answer to "how far
 * outside your free dates will you look?".
 */
const MAX_PER_SIDE = 2;
/** Hover debounce before hitting the API. */
const DEBOUNCE_MS = 200;

/** Session-lived variant cache, keyed route + dates + window bounds. */
const cache = new Map<string, StretchVariant[]>();

/** The availability window fully containing the trip, when clamping. */
function containingWindow(
  trip: Trip,
  windows: DateWindow[],
  clampToWindows: boolean,
): DateWindow | undefined {
  return clampToWindows
    ? windows.find(
        (w) =>
          w.start_date <= trip.outbound_date && trip.return_date <= w.end_date,
      )
    : undefined;
}

/** Shape one server variant into a StayStretch with deltas vs the trip. */
function toStretch(trip: Trip, v: StretchVariant): StayStretch {
  return {
    ...v,
    deltaPrice: v.price - trip.price,
    extraNights: v.nights - trip.duration_days,
    daysEarlier:
      v.out_date < trip.outbound_date
        ? nightsBetween(v.out_date, trip.outbound_date)
        : 0,
    daysLater:
      v.return_date > trip.return_date
        ? nightsBetween(trip.return_date, v.return_date)
        : 0,
  };
}

/**
 * Pure shaping step (exported for tests): split server variants by kind into
 * a StretchSet, drop anything that matches the base pair, cap rows per side.
 */
export function pickStretches(
  trip: Trip,
  variants: StretchVariant[],
): StretchSet {
  const set: StretchSet = { earlier: [], later: [], fullWindow: null };
  for (const v of variants) {
    if (
      v.out_date === trip.outbound_date &&
      v.return_date === trip.return_date
    )
      continue;
    const s = toStretch(trip, v);
    if (v.kind === "earlier" && set.earlier.length < MAX_PER_SIDE)
      set.earlier.push(s);
    else if (v.kind === "later" && set.later.length < MAX_PER_SIDE)
      set.later.push(s);
    else if (v.kind === "full") set.fullWindow = s;
  }
  return set;
}

export function useStayExtensions(
  trip: Trip | null,
  windows: DateWindow[],
  clampToWindows: boolean,
): { stretches: StretchSet; loading: boolean } {
  const win = trip ? containingWindow(trip, windows, clampToWindows) : undefined;
  // Cache key covers everything the fetch depends on — route, BOTH dates
  // (two bars can share an outbound), and the window bounds sent along.
  const key = trip
    ? `${trip.origin}|${trip.destination}|${trip.outbound_date}|${trip.return_date}|${win?.start_date ?? ""}|${win?.end_date ?? ""}`
    : null;

  // Variants are stored with the key they belong to so a stale fetch for a
  // previously hovered bar can never render under the current one.
  const [loaded, setLoaded] = useState<{
    key: string;
    variants: StretchVariant[];
  } | null>(null);

  useEffect(() => {
    if (!trip || !key) return;

    const hit = cache.get(key);
    if (hit) {
      setLoaded({ key, variants: hit });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      getTripExtensions({
        from: trip.origin,
        to: trip.destination,
        outbound: trip.outbound_date,
        return: trip.return_date,
        win_start: win?.start_date,
        win_end: win?.end_date,
      })
        .then((res) => {
          cache.set(key, res.variants);
          if (!cancelled) setLoaded({ key, variants: res.variants });
        })
        .catch(() => {
          // Suggestions are decorative — fail silent, don't cache the miss.
          if (!cancelled) setLoaded({ key, variants: [] });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // key fully derives from the trip + window fields the fetch uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!trip || !key || loaded?.key !== key) {
    return { stretches: EMPTY_STRETCHES, loading: trip != null };
  }
  return {
    stretches: pickStretches(trip, loaded.variants),
    loading: false,
  };
}
