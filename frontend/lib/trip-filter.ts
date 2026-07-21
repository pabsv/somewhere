// ─── The `flights` Mongo filter — pure, no IO ────────────────────────────────
// Extracted from lib/queries.ts so it can be exercised under `tsx --test`
// (queries.ts imports next/cache + lib/mongodb, which cannot run there). Same
// reason avail-core / stretch-core exist.
//
// Only the `Filter` TYPE comes from mongodb, so nothing here is loaded at
// runtime by a test.

import type { Filter } from "mongodb";
import type { FlightDoc } from "@/types/api";
import {
  HARD_PRICE_CEILING,
  GROUND_COMPETITIVE_CODES,
  GROUND_COMPETITIVE_MAX_PRICE,
} from "@/lib/score";

/**
 * Mongo clause: drop "ground-competitive" destinations (all Germany, Lux,
 * Paris, Lille) whose round-trip price is above GROUND_COMPETITIVE_MAX_PRICE —
 * a train or Flixbus beats them there, so an expensive flight is only clutter
 * on the discovery boards (Explore + Calendar). `$nor` with a single clause =
 * "NOT (ground-competitive AND over the cap)", so it composes with an existing
 * `price` key without touching it. City drill-in pages are exempt (a deliberate
 * visit shows the full picture).
 */
export const GROUND_COMPETITIVE_NOR: Filter<FlightDoc>["$nor"] = [
  {
    destination: { $in: [...GROUND_COMPETITIVE_CODES] },
    price: { $gt: GROUND_COMPETITIVE_MAX_PRICE },
  },
];

/** An outbound-date sub-range: one calendar month, clamped to the query range. */
export interface OutboundChunk {
  /** YYYY-MM-DD, inclusive */
  start: string;
  /** YYYY-MM-DD, inclusive */
  end: string;
}

/**
 * Split an outbound-date range into one chunk per calendar month, clamped to
 * the range at both ends.
 *
 * Used to partition the calendar's bar query into per-month cache entries: one
 * entry for a 10-month range is ~2.1MB, which silently exceeds Next's 2MB
 * per-entry data-cache limit and is therefore never stored at all. Per month it
 * is ~200KB, and stays that size as the fare pool grows (the range is fixed at
 * 10 months) rather than creeping back over the limit.
 *
 * The union of the chunks is exactly the original range, so the set of matched
 * trips is unchanged — a trip belongs to exactly one chunk, the one containing
 * its outbound date.
 *
 * Returns [] when `to` is before `from`.
 */
export function outboundMonthChunks(
  from: string,
  to: string,
): OutboundChunk[] {
  if (to < from) return [];

  const chunks: OutboundChunk[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7)); // 1-based

  for (;;) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const monthStart = `${year}-${pad(month)}-01`;
    if (monthStart > to) break;
    // Day 0 of the NEXT month is the last day of this one (UTC, so no DST slip).
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEnd = `${year}-${pad(month)}-${pad(lastDay)}`;

    chunks.push({
      start: monthStart < from ? from : monthStart,
      end: monthEnd > to ? to : monthEnd,
    });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return chunks;
}

export interface TripFilterParams {
  origins: string[];
  /** inclusive start of the date range (YYYY-MM-DD) — trips whose
   *  [outbound_date, return_date] interval OVERLAPS [start, end] match */
  start: string;
  /** inclusive end of the date range (YYYY-MM-DD); omit for none */
  end?: string | null;
  /** max price in EUR; omit for no cap */
  maxPrice?: number | null;
  /** true → both legs must be non-stop */
  direct?: boolean;
  /** min trip length in days (duration_days >=) */
  minNights?: number | null;
  /** max trip length in days (duration_days <=) */
  maxNights?: number | null;
  /**
   * Uppercase destination IATA codes the user (or a group) has starred. These
   * get a looser price cap so a wanted city isn't curated out of the board by a
   * default the user never chose. Omit / empty → the filter is byte-identical
   * to the pre-favourites one, which is what keeps every other caller provably
   * unchanged.
   */
  favourites?: readonly string[] | null;
  /** €-cap applied to the favourite branch. Required when `favourites` is set. */
  favMaxPrice?: number | null;
  /** today's date (YYYY-MM-DD) — injected so this stays pure/testable. */
  today: string;
}

interface NarrowingOptions {
  maxPrice?: number | null;
  direct?: boolean;
  minNights?: number | null;
  maxNights?: number | null;
  /** false → this branch ignores the rail-competitive cap. */
  groundCap: boolean;
}

/** Clamp a requested cap to the routing-artifact ceiling; absent → the ceiling. */
function effectiveCap(maxPrice?: number | null): number {
  return typeof maxPrice === "number" && Number.isFinite(maxPrice)
    ? Math.min(maxPrice, HARD_PRICE_CEILING)
    : HARD_PRICE_CEILING;
}

/**
 * The relaxable half of the filter: price cap, direct, trip length, ground cap.
 * Kept separate from the "spine" (origin + dates) because only this half may
 * appear inside an `$or` branch — see buildTripFilter.
 */
function narrowingClause(o: NarrowingOptions): Filter<FlightDoc> {
  const c: Filter<FlightDoc> = {};
  c.price = { $lte: effectiveCap(o.maxPrice) };

  if (o.direct) {
    c.outbound_stops = 0;
    c.return_stops = 0;
  }

  const dur: Record<string, number> = {};
  if (typeof o.minNights === "number" && Number.isFinite(o.minNights)) {
    dur.$gte = o.minNights;
  }
  if (typeof o.maxNights === "number" && Number.isFinite(o.maxNights)) {
    dur.$lte = o.maxNights;
  }
  if (Object.keys(dur).length > 0) c.duration_days = dur;

  if (o.groundCap) c.$nor = GROUND_COMPETITIVE_NOR;

  return c;
}

/**
 * Build a Mongo filter on the `flights` collection. Dates compare
 * lexicographically (YYYY-MM-DD strings sort chronologically).
 *
 * Shape: a never-relaxed SPINE (origin + date overlap) ANDed with a NARROWING
 * clause. With favourites present the narrowing clause is wrapped in an `$or`
 * so starred destinations get their own, looser rules:
 *
 *   spine AND ( normalRules OR (destination ∈ favourites AND relaxedRules) )
 *
 * Three things that are easy to get wrong here:
 *
 *   - `$nor` MUST move inside the branch. Left at top level it ANDs onto the
 *     favourite branch too and the whole relaxation becomes a silent no-op.
 *   - Union, not partition — deliberately NO `$nin` on the normal branch. A doc
 *     matching both branches is still returned once, and the union is exactly
 *     the predicate above. `$nin` would only add a scan condition. (It would be
 *     needed only if a favourite rule were ever NARROWER than normal.)
 *   - The top-level `price` ceiling and a branch's `price` cap AND together, so
 *     the lower one wins and HARD_PRICE_CEILING can never be relaxed away. It
 *     is hoisted so the query planner keeps a price bound whichever branch
 *     matches.
 *
 * Index note: the spine keeps `origin` + `outbound_date` bounded OUTSIDE the
 * `$or`, so the plan stays an IXSCAN on `origin_outbound_price` with a residual
 * filter (or an index-OR with `destination_outbound_price`).
 */
export function buildTripFilter(params: TripFilterParams): Filter<FlightDoc> {
  const filter: Filter<FlightDoc> = {
    origin: { $in: params.origins },
  };

  // Overlap semantics: a trip matches when its [outbound_date, return_date]
  // interval intersects [start, end] — not only when it departs inside the
  // range. Outbound is still floored at today: a trip that already departed
  // can't be booked, so it never shows even when it overlaps the range.
  const outbound: Record<string, string> = { $gte: params.today };
  if (params.end) outbound.$lte = params.end;
  filter.outbound_date = outbound;
  filter.return_date = { $gte: params.start };

  const normal = narrowingClause({
    maxPrice: params.maxPrice,
    direct: params.direct,
    minNights: params.minNights,
    maxNights: params.maxNights,
    groundCap: true,
  });

  const favs = (params.favourites ?? []).filter(Boolean);
  if (favs.length === 0) {
    // Byte-identical to the pre-favourites filter: same keys, same order.
    Object.assign(filter, normal);
    return filter;
  }

  filter.price = { $lte: HARD_PRICE_CEILING };
  filter.$or = [
    normal,
    {
      destination: { $in: [...favs] },
      ...narrowingClause({
        // A favourite gets the looser of its own allowance and whatever the
        // user explicitly asked for — never a TIGHTER cap than a stranger gets.
        maxPrice: Math.max(
          effectiveCap(params.maxPrice),
          effectiveCap(params.favMaxPrice),
        ),
        // "Direct only" and the nights sliders are explicit user assertions,
        // so they still apply. Only the app's own defaults are relaxed.
        direct: params.direct,
        minNights: params.minNights,
        maxNights: params.maxNights,
        // Deliberately still true: bypassing the rail-competitive cap for
        // favourites is a separate, declined decision (see the plan's
        // non-goals). Flipping this one flag is the whole change if it lands.
        groundCap: true,
      }),
    },
  ];

  return filter;
}
