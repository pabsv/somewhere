// ─── Open-jaw combo engine — server-only ─────────────────────────────────────
// Combines the `oneway_fares` grids (Phase 0, written by the Python pool
// scheduler) into origin-side open-jaw trips: out O1→dest, back dest→O2.
// A combo's price = sum of two one-way fares = the real bookable price (two
// separate tickets). Grids are date→price ONLY (no times/stops/airline), so
// availability filtering here is date-level; edge-hour rules can't apply.
// Server-only: imports lib/mongodb — never import from a client component.
// Spec: docs/MULTICITY_PLAN.md Phase 1.

import type { Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getDestination } from "@/data/destinations.gen";
import { combineGrids, type CombineOptions } from "@/lib/openjaw-core";
import {
  OnewayFareDocSchema,
  type FlightDoc,
  type OnewayFareDoc,
  type OpenJawTrip,
} from "@/types/api";
import {
  buildTripFilter,
  fitsAnyWindow,
  todayStr,
  type UserAvailability,
} from "@/lib/queries";

export { combineGrids, nightsBetween } from "@/lib/openjaw-core";
export type { CombineOptions, GridCombo } from "@/lib/openjaw-core";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max combos returned per request, cheapest-first. */
const MAX_COMBOS = 50;

// ─── Grid loading ────────────────────────────────────────────────────────────

/**
 * Fetch `oneway_fares` docs matching a filter, projected to the fields the
 * engine needs. Docs failing the schema are skipped with a warning (one bad
 * doc can't 500 the route) — mirrors scoreFlights' convention.
 */
export async function loadFareGrids(
  filter: Filter<Record<string, unknown>>,
): Promise<OnewayFareDoc[]> {
  const db = await getDb();
  const raw = await db
    .collection("oneway_fares")
    .find(filter, {
      projection: {
        _id: 0,
        leg_key: 1,
        origin: 1,
        destination: 1,
        currency: 1,
        prices: 1,
        scraped_at: 1,
      },
    })
    .toArray();

  const docs: OnewayFareDoc[] = [];
  for (const r of raw) {
    const parsed = OnewayFareDocSchema.safeParse(r);
    if (parsed.success) docs.push(parsed.data);
    else
      console.warn(
        `[openjaw] skipping invalid oneway_fares doc [leg_key=${String(
          (r as Record<string, unknown>).leg_key ?? "<missing>",
        )}]`,
      );
  }
  return docs;
}

// ─── Round-trip comparison baseline ──────────────────────────────────────────

/**
 * Cheapest stored ROUND-TRIP price per exact (outbound_date, return_date)
 * for one destination across the selected origins. Keyed "out|ret".
 * This is the "is open-jaw actually a win?" baseline.
 */
async function loadRoundtripBaseline(
  dest: string,
  origins: string[],
): Promise<Map<string, number>> {
  const db = await getDb();
  const docs = await db
    .collection<FlightDoc>("flights")
    .find(
      {
        ...buildTripFilter({ origins, start: todayStr() }),
        destination: dest,
      },
      { projection: { _id: 0, outbound_date: 1, return_date: 1, price: 1 } },
    )
    .toArray();

  const best = new Map<string, number>();
  for (const d of docs) {
    if (typeof d.price !== "number") continue;
    const k = `${d.outbound_date}|${d.return_date}`;
    const cur = best.get(k);
    if (cur === undefined || d.price < cur) best.set(k, d.price);
  }
  return best;
}

// ─── Public entry point ──────────────────────────────────────────────────────

export interface OpenJawOptions {
  minNights: number;
  maxNights: number;
  maxPrice?: number | null;
  /** date-level availability filter (edge hours can't apply — no time data) */
  avail?: UserAvailability | null;
}

/**
 * Best origin-side open-jaw options to one destination.
 *
 * For each ordered origin pair (O1, O2): combine the O1→dest grid with the
 * dest→O2 grid. Different-origin pairs are always emitted; same-origin pairs
 * (two singles instead of a return ticket) only when they beat — or fill a
 * date hole in — the stored round-trip data. Deduped to the best combo per
 * (out.origin, back.origin, out.date, back.date), capped at MAX_COMBOS
 * cheapest-first. Missing/sparse grids are tolerated silently.
 */
export async function getOpenJawTrips(
  dest: string,
  origins: string[],
  opts: OpenJawOptions,
): Promise<OpenJawTrip[]> {
  const meta = getDestination(dest);
  if (!meta || origins.length === 0) return [];

  const [grids, roundtrips] = await Promise.all([
    loadFareGrids({
      $or: [
        { origin: { $in: origins }, destination: dest },
        { origin: dest, destination: { $in: origins } },
      ],
    }),
    loadRoundtripBaseline(dest, origins),
  ]);

  // Index grids by direction. leg_key is unique, so last write wins is moot.
  const outGrids = new Map<string, OnewayFareDoc>(); // origin → O→dest grid
  const backGrids = new Map<string, OnewayFareDoc>(); // origin → dest→O grid
  for (const g of grids) {
    if (g.destination === dest) outGrids.set(g.origin, g);
    else backGrids.set(g.destination, g);
  }

  const combineOpts: CombineOptions = {
    minNights: opts.minNights,
    maxNights: opts.maxNights,
    maxPrice: opts.maxPrice,
  };

  const byKey = new Map<string, OpenJawTrip>();
  for (const o1 of origins) {
    const outDoc = outGrids.get(o1);
    if (!outDoc) continue;
    for (const o2 of origins) {
      const backDoc = backGrids.get(o2);
      if (!backDoc) continue;
      const sameOrigin = o1 === o2;

      const scrapedAt =
        outDoc.scraped_at < backDoc.scraped_at
          ? outDoc.scraped_at
          : backDoc.scraped_at;

      for (const c of combineGrids(outDoc.prices, backDoc.prices, combineOpts)) {
        if (
          opts.avail &&
          !fitsAnyWindow(c.outDate, c.backDate, opts.avail.windows)
        )
          continue;

        const rt = roundtrips.get(`${c.outDate}|${c.backDate}`) ?? null;
        const vsRoundtrip = rt === null ? null : rt - c.total;

        // Same-origin pairs only earn a slot when the two singles beat the
        // stored round trip, or no round trip exists for those dates at all.
        if (sameOrigin && vsRoundtrip !== null && vsRoundtrip <= 0) continue;

        const key = `${o1}-${dest}-${c.outDate}|${dest}-${o2}-${c.backDate}`;
        const existing = byKey.get(key);
        if (existing && existing.total_price <= c.total) continue;

        byKey.set(key, {
          key,
          destination: dest,
          city: meta.name,
          out: { origin: o1, destination: dest, date: c.outDate, price: c.outPrice },
          back: { origin: dest, destination: o2, date: c.backDate, price: c.backPrice },
          total_price: c.total,
          nights: c.nights,
          same_origin: sameOrigin,
          vs_roundtrip: vsRoundtrip,
          scraped_at: scrapedAt,
        });
      }
    }
  }

  return [...byKey.values()]
    .sort((a, b) => a.total_price - b.total_price || a.nights - b.nights)
    .slice(0, MAX_COMBOS);
}
