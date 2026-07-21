// ─── Calendar bar curation — pure, no IO ─────────────────────────────────────
// Extracted from lib/queries.ts so it can run under `tsx --test`: this is the
// highest-blast-radius logic in the read path (it decides what every user sees
// on every month) and it was previously module-private and untested.
//
// Two caps, both a variety guard — without them a single cheap route fills a
// month with near-identical date variants:
//   1. per (outbound-month, destination) → keep the N cheapest
//   2. then per outbound-month → keep the global M cheapest
// Sorting throughout: price asc, tie → higher score.
//
// Favourites get a larger margin at BOTH steps. See FAV_* below.

import type { Trip } from "@/types/api";

/** Curation: per destination, per outbound-month, keep at most this many bars. */
export const BARS_PER_DEST_PER_MONTH = 2;
/** Curation: global cap on bars per outbound-month. */
export const BARS_PER_MONTH = 40;

/**
 * Per-destination-per-month cap for a FAVOURITE city. The whole point of
 * starring a place is wanting to see when you could actually go there, and 2
 * bars out of a possible 15 answers that badly.
 */
export const FAV_BARS_PER_DEST_PER_MONTH = 6;

/**
 * Slots per month that favourites claim before the global cheapest-first cut,
 * so a €150 starred city isn't buried behind 40 cheaper strangers.
 *
 * Deliberately a RESERVE, not an exemption: 30 starred cities × 6 bars would
 * blow the month wide open, and the lane packer would just dump the excess into
 * "+N more" — making the relaxation invisible AND expensive. A reserve also
 * degrades gracefully, since unused favourite slots go back to the general pool.
 */
export const FAV_BARS_PER_MONTH_RESERVED = 12;

/** The four caps as one bag, so a caller can curate a second set differently. */
export interface CurateCaps {
  perDestMonth: number;
  perMonth: number;
  favPerDestMonth: number;
  favReserved: number;
}

/** The board's own caps — what `curateBars` uses when none are passed. */
export const DEFAULT_CURATE_CAPS: CurateCaps = {
  perDestMonth: BARS_PER_DEST_PER_MONTH,
  perMonth: BARS_PER_MONTH,
  favPerDestMonth: FAV_BARS_PER_DEST_PER_MONTH,
  favReserved: FAV_BARS_PER_MONTH_RESERVED,
};

/**
 * Caps for the ±2-day availability exceptions, curated as their OWN set so
 * they can never take a slot from a trip that actually fits the free dates.
 * A deliberate garnish: one bar per destination per month keeps the variety
 * high and the volume low. Tune ±2 volume here and nowhere else.
 */
export const NEAR_AVAIL_CURATE_CAPS: CurateCaps = {
  perDestMonth: 1,
  perMonth: 12,
  favPerDestMonth: 2,
  favReserved: 4,
};

/** "2026-06-21" → "2026-06" (outbound-month key for curation). */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** The board's ordering everywhere: cheapest first, better score breaks ties. */
export const byPrice = (a: Trip, b: Trip) =>
  a.price - b.price || b.score - a.score;

/**
 * Curate calendar bars.
 *
 * `favourites` is a set of uppercase destination IATA codes. Empty (the
 * default) makes this function behaviourally identical to the pre-favourites
 * version — the property `curate-core.test.ts` pins down, since every
 * signed-out and no-favourites request depends on it.
 *
 * `caps` defaults to the board's own caps, so every existing call site is
 * unchanged; pass NEAR_AVAIL_CURATE_CAPS to curate the ±2-day set separately.
 */
export function curateBars(
  trips: Trip[],
  favourites: ReadonlySet<string> = new Set(),
  caps: CurateCaps = DEFAULT_CURATE_CAPS,
): Trip[] {
  const isFav = (t: Trip) => favourites.has(t.destination);

  // Step 1: cap per (month, destination) — favourites get a wider slice.
  const perDestMonth = new Map<string, Trip[]>();
  for (const t of trips) {
    const k = `${monthKey(t.outbound_date)}|${t.destination}`;
    const arr = perDestMonth.get(k);
    if (arr) arr.push(t);
    else perDestMonth.set(k, [t]);
  }

  const afterDestCap: Trip[] = [];
  for (const arr of perDestMonth.values()) {
    arr.sort(byPrice);
    // Every trip in a bucket shares a destination, so the first one decides.
    const cap = isFav(arr[0]) ? caps.favPerDestMonth : caps.perDestMonth;
    for (const t of arr.slice(0, cap)) afterDestCap.push(t);
  }

  // Step 2: cap per month globally, with a reserve for favourites.
  const perMonth = new Map<string, Trip[]>();
  for (const t of afterDestCap) {
    const k = monthKey(t.outbound_date);
    const arr = perMonth.get(k);
    if (arr) arr.push(t);
    else perMonth.set(k, [t]);
  }

  const out: Trip[] = [];
  for (const arr of perMonth.values()) {
    arr.sort(byPrice);

    // Cheapest favourites claim the reserve first...
    const reserved: Trip[] = [];
    if (favourites.size > 0) {
      for (const t of arr) {
        if (reserved.length >= caps.favReserved) break;
        if (isFav(t)) reserved.push(t);
      }
    }

    // ...then everything else competes cheapest-first for what's left. Note
    // this can include further favourites once the reserve is full — they are
    // not excluded from the general pool, only guaranteed a floor.
    const taken = new Set(reserved.map((t) => t.key));
    const rest = arr.filter((t) => !taken.has(t.key));
    out.push(
      ...reserved,
      ...rest.slice(0, Math.max(0, caps.perMonth - reserved.length)),
    );
  }

  out.sort(byPrice);
  return out;
}
