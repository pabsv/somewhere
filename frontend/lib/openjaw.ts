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
import { GROUND_PAIRS, getGroundLinks } from "@/data/groundpairs.gen";
import { combineGrids, type CombineOptions } from "@/lib/openjaw-core";
import {
  OnewayFareDocSchema,
  type CityOpenJaw,
  type CityTwin,
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

/** Calendar sweep: global cap on combos across all destinations. */
const MAX_CALENDAR_COMBOS = 40;
/** Calendar sweep: later back-leg dates attached per combo ("stay longer"). */
const MAX_OJ_EXTENSIONS = 4;
/** Calendar sweep: per (destination, outbound-month) cap — mirrors the
 *  round-trip calendar's BARS_PER_DEST_PER_MONTH curation. */
const CAL_PER_DEST_PER_MONTH = 2;

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
 * Cheapest stored ROUND-TRIP price per exact (destination, outbound_date,
 * return_date) across the selected origins, keyed "dest|out|ret". Pass `dest`
 * (one code or a list) to scope the query; omit for all destinations
 * (calendar sweep — one query instead of one per destination).
 * This is the "is open-jaw actually a win?" baseline.
 */
async function loadRoundtripBaseline(
  origins: string[],
  dest?: string | string[],
): Promise<Map<string, number>> {
  const db = await getDb();
  const docs = await db
    .collection<FlightDoc>("flights")
    .find(
      {
        ...buildTripFilter({ origins, start: todayStr() }),
        ...(dest
          ? { destination: Array.isArray(dest) ? { $in: dest } : dest }
          : {}),
      },
      {
        projection: {
          _id: 0,
          destination: 1,
          outbound_date: 1,
          return_date: 1,
          price: 1,
        },
      },
    )
    .toArray();

  const best = new Map<string, number>();
  for (const d of docs) {
    if (typeof d.price !== "number") continue;
    const k = `${d.destination}|${d.outbound_date}|${d.return_date}`;
    const cur = best.get(k);
    if (cur === undefined || d.price < cur) best.set(k, d.price);
  }
  return best;
}

// ─── Grid indexing (shared by all sweeps) ────────────────────────────────────

interface DestGrids {
  /** home origin → O→dest grid doc */
  out: Map<string, OnewayFareDoc>;
  /** home origin → dest→O grid doc */
  back: Map<string, OnewayFareDoc>;
}

/**
 * Index a mixed grid list by destination and direction. `origins` is the home
 * set — a doc whose destination is a home origin is a BACK grid for the city
 * on its `origin` side; anything else is an OUT grid for its `destination`.
 */
function indexGridsByDest(
  grids: OnewayFareDoc[],
  origins: string[],
): Map<string, DestGrids> {
  const home = new Set(origins);
  const byDest = new Map<string, DestGrids>();
  const entry = (dest: string): DestGrids => {
    let e = byDest.get(dest);
    if (!e) {
      e = { out: new Map(), back: new Map() };
      byDest.set(dest, e);
    }
    return e;
  };
  for (const g of grids) {
    if (home.has(g.origin) && !home.has(g.destination)) {
      entry(g.destination).out.set(g.origin, g);
    } else if (home.has(g.destination) && !home.has(g.origin)) {
      entry(g.origin).back.set(g.destination, g);
    }
    // home↔home or dest↔dest legs (shouldn't exist in the pool) are ignored.
  }
  return byDest;
}

/** Older of two grid timestamps — "prices as of" honesty on a combo. */
function olderScrapedAt(a: OnewayFareDoc, b: OnewayFareDoc): string {
  return a.scraped_at < b.scraped_at ? a.scraped_at : b.scraped_at;
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
    loadRoundtripBaseline(origins, dest),
  ]);

  // Index grids by direction. leg_key is unique, so last write wins is moot.
  const { out: outGrids, back: backGrids } =
    indexGridsByDest(grids, origins).get(dest) ?? {
      out: new Map<string, OnewayFareDoc>(),
      back: new Map<string, OnewayFareDoc>(),
    };

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
      const scrapedAt = olderScrapedAt(outDoc, backDoc);

      for (const c of combineGrids(outDoc.prices, backDoc.prices, combineOpts)) {
        if (
          opts.avail &&
          !fitsAnyWindow(c.outDate, c.backDate, opts.avail.windows)
        )
          continue;

        const rt =
          roundtrips.get(`${dest}|${c.outDate}|${c.backDate}`) ?? null;
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

// ─── Phase 4 — destination-side multi-city (twin cities) ─────────────────────

/**
 * Destination-side multi-city trips touching one city: fly into one city of a
 * curated ground pair, travel overland, fly home from the other. For each
 * ground pair containing `dest`, BOTH orientations are emitted — dest as the
 * fly-in city and dest as the fly-out city — so `/city/BCN` sees "BCN in,
 * MAD out" and "MAD in, BCN out" alike. `destination` on the trip is always
 * the FLY-IN city; the fly-out city is `back.origin`, and `ground` names the
 * overland hop. Same home origin both ways is allowed and expected here (the
 * default, in fact) — a twin-city trip can never be replaced by one return
 * ticket, so there is no same-origin suppression. `nights` spans the whole
 * trip (both cities). vs_roundtrip compares against the best stored round
 * trip to the FLY-IN city for the same dates — an informational baseline.
 * Never invents dest↔dest flight legs (no such grids exist; the ground hop
 * covers that gap). Capped at MAX_COMBOS cheapest-first.
 */
export async function getMultiCityTrips(
  dest: string,
  origins: string[],
  opts: OpenJawOptions,
): Promise<OpenJawTrip[]> {
  const links = getGroundLinks(dest);
  if (!getDestination(dest) || origins.length === 0 || links.length === 0)
    return [];

  const cities = [dest, ...links.map((l) => l.other)];
  const [grids, roundtrips] = await Promise.all([
    loadFareGrids({
      $or: [
        { origin: { $in: origins }, destination: { $in: cities } },
        { origin: { $in: cities }, destination: { $in: origins } },
      ],
    }),
    loadRoundtripBaseline(origins, cities),
  ]);
  const byDest = indexGridsByDest(grids, origins);

  const combineOpts: CombineOptions = {
    minNights: opts.minNights,
    maxNights: opts.maxNights,
    maxPrice: opts.maxPrice,
  };

  const byKey = new Map<string, OpenJawTrip>();

  const addCombos = (inCity: string, outCity: string, hours: number) => {
    const meta = getDestination(inCity);
    if (!meta) return;
    const inGrids = byDest.get(inCity)?.out; // home origin → inCity
    const outGrids = byDest.get(outCity)?.back; // outCity → home origin
    if (!inGrids?.size || !outGrids?.size) return;

    for (const [o1, outDoc] of inGrids) {
      for (const [o2, backDoc] of outGrids) {
        const scrapedAt = olderScrapedAt(outDoc, backDoc);
        for (const c of combineGrids(
          outDoc.prices,
          backDoc.prices,
          combineOpts,
        )) {
          if (
            opts.avail &&
            !fitsAnyWindow(c.outDate, c.backDate, opts.avail.windows)
          )
            continue;

          const rt =
            roundtrips.get(`${inCity}|${c.outDate}|${c.backDate}`) ?? null;

          const key = `${o1}-${inCity}-${c.outDate}|${outCity}-${o2}-${c.backDate}`;
          const existing = byKey.get(key);
          if (existing && existing.total_price <= c.total) continue;

          byKey.set(key, {
            key,
            destination: inCity,
            city: meta.name,
            out: {
              origin: o1,
              destination: inCity,
              date: c.outDate,
              price: c.outPrice,
            },
            back: {
              origin: outCity,
              destination: o2,
              date: c.backDate,
              price: c.backPrice,
            },
            total_price: c.total,
            nights: c.nights,
            same_origin: o1 === o2,
            vs_roundtrip: rt === null ? null : rt - c.total,
            scraped_at: scrapedAt,
            ground: { from: inCity, to: outCity, hours },
          });
        }
      }
    }
  };

  for (const { other, hours } of links) {
    addCombos(dest, other, hours); // fly into dest, home from the twin
    addCombos(other, dest, hours); // fly into the twin, home from dest
  }

  return [...byKey.values()]
    .sort((a, b) => a.total_price - b.total_price || a.nights - b.nights)
    .slice(0, MAX_COMBOS);
}

// ─── Phase 3a — Explore: best combo per destination ──────────────────────────

/** Load EVERY grid touching the selected home origins (both directions). */
function loadAllGrids(origins: string[]): Promise<OnewayFareDoc[]> {
  return loadFareGrids({
    $or: [
      { origin: { $in: origins } },
      { destination: { $in: origins } },
    ],
  });
}

/**
 * Explore sweep (Phases 3 + 5): cheapest origin-side open-jaw combo AND
 * cheapest twin-city combo per destination, from ONE grid load. No round-trip
 * comparison here: the caller compares against CitySummary.min_price (the
 * cheapest stored round trip) and attaches each map entry only when it wins.
 * Availability (when given) filters date-level. Twin combos are keyed by
 * their FLY-IN city (the card the hint lands on).
 */
export async function getExploreOpenJaw(
  origins: string[],
  opts: OpenJawOptions,
): Promise<{
  openjaw: Map<string, CityOpenJaw>;
  twin: Map<string, CityTwin>;
}> {
  const openjaw = new Map<string, CityOpenJaw>();
  const twin = new Map<string, CityTwin>();
  if (origins.length === 0) return { openjaw, twin };

  const byDest = indexGridsByDest(await loadAllGrids(origins), origins);

  const combineOpts: CombineOptions = {
    minNights: opts.minNights,
    maxNights: opts.maxNights,
    maxPrice: opts.maxPrice,
  };

  bestOpenJawInto(openjaw, byDest, combineOpts, opts);
  bestTwinInto(twin, byDest, combineOpts, opts);
  return { openjaw, twin };
}

/** Origin-side half of the Explore sweep — cheapest combo per destination. */
function bestOpenJawInto(
  best: Map<string, CityOpenJaw>,
  byDest: Map<string, DestGrids>,
  combineOpts: CombineOptions,
  opts: OpenJawOptions,
): void {
  for (const [dest, { out, back }] of byDest) {
    if (!getDestination(dest)) continue;
    let cheapest: CityOpenJaw | null = null;
    for (const [o1, outDoc] of out) {
      for (const [o2, backDoc] of back) {
        for (const c of combineGrids(
          outDoc.prices,
          backDoc.prices,
          combineOpts,
        )) {
          if (cheapest && c.total >= cheapest.total_price) continue;
          if (
            opts.avail &&
            !fitsAnyWindow(c.outDate, c.backDate, opts.avail.windows)
          )
            continue;
          cheapest = {
            total_price: c.total,
            out_origin: o1,
            back_origin: o2,
            out_date: c.outDate,
            back_date: c.backDate,
            nights: c.nights,
            same_origin: o1 === o2,
          };
        }
      }
    }
    if (cheapest) best.set(dest, cheapest);
  }
}

/**
 * Twin-city half of the Explore sweep (Phase 5) — cheapest twin combo per
 * FLY-IN city across all ground pairs and both orientations. `other` on the
 * result is the fly-out city; `hours` the overland hop, display-only.
 */
function bestTwinInto(
  best: Map<string, CityTwin>,
  byDest: Map<string, DestGrids>,
  combineOpts: CombineOptions,
  opts: OpenJawOptions,
): void {
  for (const { a, b, hours } of GROUND_PAIRS) {
    for (const [inCity, outCity] of [
      [a, b],
      [b, a],
    ] as const) {
      if (!getDestination(inCity)) continue;
      const inGrids = byDest.get(inCity)?.out; // home origin → fly-in city
      const outGrids = byDest.get(outCity)?.back; // fly-out city → home origin
      if (!inGrids?.size || !outGrids?.size) continue;

      for (const [o1, outDoc] of inGrids) {
        for (const [o2, backDoc] of outGrids) {
          for (const c of combineGrids(
            outDoc.prices,
            backDoc.prices,
            combineOpts,
          )) {
            const cur = best.get(inCity);
            if (cur && c.total >= cur.total_price) continue;
            if (
              opts.avail &&
              !fitsAnyWindow(c.outDate, c.backDate, opts.avail.windows)
            )
              continue;
            best.set(inCity, {
              total_price: c.total,
              other: outCity,
              hours,
              out_origin: o1,
              back_origin: o2,
              out_date: c.outDate,
              back_date: c.backDate,
              nights: c.nights,
            });
          }
        }
      }
    }
  }
}

// ─── Phase 3b — Calendar: winning combos across all destinations ─────────────

export interface CalendarOpenJawOptions extends OpenJawOptions {
  /** inclusive range bounds — overlap semantics, like buildTripFilter */
  start?: string | null;
  end?: string | null;
}

/**
 * Open-jaw combos worth a calendar bar, across ALL destinations for the
 * selected origins — origin-side combos plus twin-city combos (Phase 5).
 * Curated hard so the calendar doesn't flood:
 *   - origin-side: only combos that WIN — beat the stored round trip for the
 *     same destination + exact dates (vs_roundtrip > 0), or fill a date hole
 *     the round-trip data doesn't cover (vs_roundtrip null);
 *   - twin-city: strict wins only (vs_roundtrip > 0 against the fly-in city);
 *   - best per (destination, out_date, back_date);
 *   - max CAL_PER_DEST_PER_MONTH per destination per outbound month;
 *   - global cap MAX_CALENDAR_COMBOS, cheapest-first.
 * Range uses overlap semantics (return >= start, outbound <= end).
 */
export async function getOpenJawCalendarTrips(
  origins: string[],
  opts: CalendarOpenJawOptions,
): Promise<OpenJawTrip[]> {
  if (origins.length === 0) return [];

  const [grids, roundtrips] = await Promise.all([
    loadAllGrids(origins),
    loadRoundtripBaseline(origins),
  ]);
  const byDest = indexGridsByDest(grids, origins);

  const combineOpts: CombineOptions = {
    minNights: opts.minNights,
    maxNights: opts.maxNights,
    maxPrice: opts.maxPrice,
  };

  const byKey = new Map<string, OpenJawTrip>();
  // Back grid per emitted trip (object identity) — after curation the winners
  // get "stay longer" extensions from their own back grid (Phase 6).
  const backGridOf = new Map<OpenJawTrip, Record<string, number>>();
  for (const [dest, { out, back }] of byDest) {
    const meta = getDestination(dest);
    if (!meta) continue;
    for (const [o1, outDoc] of out) {
      for (const [o2, backDoc] of back) {
        const sameOrigin = o1 === o2;
        const scrapedAt = olderScrapedAt(outDoc, backDoc);
        for (const c of combineGrids(
          outDoc.prices,
          backDoc.prices,
          combineOpts,
        )) {
          if (opts.start && c.backDate < opts.start) continue;
          if (opts.end && c.outDate > opts.end) continue;
          if (
            opts.avail &&
            !fitsAnyWindow(c.outDate, c.backDate, opts.avail.windows)
          )
            continue;

          const rt =
            roundtrips.get(`${dest}|${c.outDate}|${c.backDate}`) ?? null;
          const vsRoundtrip = rt === null ? null : rt - c.total;
          // Calendar shows only wins: cheaper than the round trip, or dates
          // the round-trip data doesn't cover at all.
          if (vsRoundtrip !== null && vsRoundtrip <= 0) continue;

          // Best per (dest, out_date, back_date) — one bar per span.
          const key = `${dest}|${c.outDate}|${c.backDate}`;
          const existing = byKey.get(key);
          if (existing && existing.total_price <= c.total) continue;

          const trip: OpenJawTrip = {
            key: `${o1}-${dest}-${c.outDate}|${dest}-${o2}-${c.backDate}`,
            destination: dest,
            city: meta.name,
            out: {
              origin: o1,
              destination: dest,
              date: c.outDate,
              price: c.outPrice,
            },
            back: {
              origin: dest,
              destination: o2,
              date: c.backDate,
              price: c.backPrice,
            },
            total_price: c.total,
            nights: c.nights,
            same_origin: sameOrigin,
            vs_roundtrip: vsRoundtrip,
            scraped_at: scrapedAt,
          };
          byKey.set(key, trip);
          backGridOf.set(trip, backDoc.prices);
        }
      }
    }
  }

  // Twin-city pass (Phase 5): fly into one city of a ground pair, home from
  // the other. Stricter win rule than origin-side — only combos that BEAT a
  // stored round trip to the fly-in city (vs_roundtrip > 0) earn a bar. A
  // missing round trip is NOT a win here: twin trips have no round-trip
  // equivalent, so "fills a hole" would flood the calendar with every pair.
  for (const { a, b, hours } of GROUND_PAIRS) {
    for (const [inCity, outCity] of [
      [a, b],
      [b, a],
    ] as const) {
      const meta = getDestination(inCity);
      if (!meta) continue;
      const inGrids = byDest.get(inCity)?.out;
      const outGrids = byDest.get(outCity)?.back;
      if (!inGrids?.size || !outGrids?.size) continue;

      for (const [o1, outDoc] of inGrids) {
        for (const [o2, backDoc] of outGrids) {
          const scrapedAt = olderScrapedAt(outDoc, backDoc);
          for (const c of combineGrids(
            outDoc.prices,
            backDoc.prices,
            combineOpts,
          )) {
            if (opts.start && c.backDate < opts.start) continue;
            if (opts.end && c.outDate > opts.end) continue;
            if (
              opts.avail &&
              !fitsAnyWindow(c.outDate, c.backDate, opts.avail.windows)
            )
              continue;

            const rt =
              roundtrips.get(`${inCity}|${c.outDate}|${c.backDate}`) ?? null;
            const vsRoundtrip = rt === null ? null : rt - c.total;
            if (vsRoundtrip === null || vsRoundtrip <= 0) continue;

            // Best per (city pair, dates) — namespaced apart from the
            // origin-side keys so a twin never shadows a plain combo.
            const key = `${inCity}+${outCity}|${c.outDate}|${c.backDate}`;
            const existing = byKey.get(key);
            if (existing && existing.total_price <= c.total) continue;

            const trip: OpenJawTrip = {
              key: `${o1}-${inCity}-${c.outDate}|${outCity}-${o2}-${c.backDate}`,
              destination: inCity,
              city: meta.name,
              out: {
                origin: o1,
                destination: inCity,
                date: c.outDate,
                price: c.outPrice,
              },
              back: {
                origin: outCity,
                destination: o2,
                date: c.backDate,
                price: c.backPrice,
              },
              total_price: c.total,
              nights: c.nights,
              same_origin: o1 === o2,
              vs_roundtrip: vsRoundtrip,
              scraped_at: scrapedAt,
              ground: { from: inCity, to: outCity, hours },
            };
            byKey.set(key, trip);
            backGridOf.set(trip, backDoc.prices);
          }
        }
      }
    }
  }

  // Curation: cheapest-first, ≤2 per (dest, outbound month), global cap.
  const sorted = [...byKey.values()].sort(
    (a, b) => a.total_price - b.total_price || a.nights - b.nights,
  );
  const perDestMonth = new Map<string, number>();
  const picked: OpenJawTrip[] = [];
  for (const t of sorted) {
    if (picked.length >= MAX_CALENDAR_COMBOS) break;
    const k = `${t.destination}|${t.out.date.slice(0, 7)}`;
    const n = perDestMonth.get(k) ?? 0;
    if (n >= CAL_PER_DEST_PER_MONTH) continue;
    perDestMonth.set(k, n + 1);
    picked.push(t);
  }

  // "Stay longer" (Phase 6): the next few LATER dates from each winner's own
  // back grid — same data, zero extra queries. Unfiltered by nights/price
  // caps (mirrors /api/trips/extensions returning all variants); the client
  // clamps to availability windows. Empty = field absent (sparse is normal).
  for (const t of picked) {
    const grid = backGridOf.get(t);
    if (!grid) continue;
    const later = Object.keys(grid)
      .filter((d) => d > t.back.date)
      .sort()
      .slice(0, MAX_OJ_EXTENSIONS)
      .map((d) => ({
        date: d,
        back_price: grid[d],
        total: t.out.price + grid[d],
      }));
    if (later.length > 0) t.extensions = later;
  }

  return picked;
}
