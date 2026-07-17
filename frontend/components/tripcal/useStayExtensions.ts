"use client";

// ─── useStayExtensions — "stay longer" suggestions for a hovered trip ────────
// Fetches every stored return-date variant for the trip's exact
// origin + destination + outbound_date (GET /api/trips/extensions), then keeps
// only LATER returns that fit: the availability window containing the trip
// (when clampToWindows), else return_date + FALLBACK_EXTRA_DAYS.
// Debounced 200ms so sweeping across bars never storms the API; results are
// cached per route+outbound for the session (cache hits render instantly).

import { useEffect, useState } from "react";
import type { DateWindow, Trip, TripVariant } from "@/types/api";
import { getTripExtensions } from "@/lib/client";
import { addDays } from "./calendarMath";

export interface StayExtension extends TripVariant {
  /** price difference vs the hovered trip (positive = costs more) */
  deltaPrice: number;
  /** nights added vs the hovered trip (always >= 1 after filtering) */
  extraNights: number;
}

/** Cap on suggested extra days when the trip isn't inside a window. */
const FALLBACK_EXTRA_DAYS = 3;
/** Max suggestion rows shown (tooltip space is tight). */
const MAX_SUGGESTIONS = 3;
/** Hover debounce before hitting the API. */
const DEBOUNCE_MS = 200;

/** Session-lived variant cache, keyed `origin|destination|outbound_date`. */
const cache = new Map<string, TripVariant[]>();

/**
 * Pure filter/shape step (exported for tests): later-return variants clamped
 * to the containing availability window (or the +3d fallback), first
 * MAX_SUGGESTIONS, with deltas vs the hovered trip.
 */
export function pickExtensions(
  trip: Trip,
  variants: TripVariant[],
  windows: DateWindow[],
  clampToWindows: boolean,
): StayExtension[] {
  const containing = clampToWindows
    ? windows.find(
        (w) =>
          w.start_date <= trip.outbound_date && trip.return_date <= w.end_date,
      )
    : undefined;
  const maxReturn = containing
    ? containing.end_date
    : addDays(trip.return_date, FALLBACK_EXTRA_DAYS);

  return variants
    .filter((v) => v.return_date > trip.return_date && v.return_date <= maxReturn)
    .slice(0, MAX_SUGGESTIONS)
    .map((v) => ({
      ...v,
      deltaPrice: v.price - trip.price,
      extraNights: v.duration_days - trip.duration_days,
    }));
}

export function useStayExtensions(
  trip: Trip | null,
  windows: DateWindow[],
  clampToWindows: boolean,
): { extensions: StayExtension[]; loading: boolean } {
  const key = trip
    ? `${trip.origin}|${trip.destination}|${trip.outbound_date}`
    : null;

  // Variants are stored with the key they belong to so a stale fetch for a
  // previously hovered bar can never render under the current one.
  const [loaded, setLoaded] = useState<{
    key: string;
    variants: TripVariant[];
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
    // key fully derives from the trip fields the fetch uses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!trip || !key || loaded?.key !== key) {
    return { extensions: [], loading: trip != null };
  }
  return {
    extensions: pickExtensions(trip, loaded.variants, windows, clampToWindows),
    loading: false,
  };
}
