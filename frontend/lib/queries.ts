// ─── Shared server query layer — server-only ────────────────────────────────
// The single place that turns query params + Mongo flight docs into scored
// Trips / CitySummaries for the public data APIs (cities, cities/[code], trips).
// Imports lib/mongodb (getDb), lib/baselines (getBaselines), lib/score
// (scoreTrip) and lib/trips (toTrip, dedupeTrips, buildDensity) — never invent
// scoring or transforms here, reuse the frozen foundation helpers.
// Server-only: imports lib/mongodb — never import from a client component.
// Spec: docs/DESIGN_V1.md sections C + D.

import type { Collection, Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getBaselines, type RouteBaseline } from "@/lib/baselines";
import {
  parseFlightDoc,
  type CityBest,
  type CitySummary,
  type FlightDoc,
  type GroupTrip,
  type Trip,
} from "@/types/api";
import { toTrip, dedupeTrips, buildDensity } from "@/lib/trips";
import { HARD_PRICE_CEILING } from "@/lib/score";
import { ORIGINS } from "@/data/airports.gen";
import { getDestination } from "@/data/destinations.gen";

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_ORIGIN_CODES = ORIGINS.map((o) => o.code);

/** Curation: per destination, per outbound-month, keep at most this many bars. */
const BARS_PER_DEST_PER_MONTH = 2;
/** Curation: global cap on bars per outbound-month. */
const BARS_PER_MONTH = 40;

/** The `flights` collection typed as FlightDoc so filters/projections check. */
async function flightsCollection(): Promise<Collection<FlightDoc>> {
  const db = await getDb();
  return db.collection<FlightDoc>("flights");
}

/** Bare YYYY-MM-DD for "today" in the server's local TZ. */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** YYYY-MM-DD `months` ahead of today (default window end). */
export function monthsAhead(months: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + months, now.getDate());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ─── Origins parsing ─────────────────────────────────────────────────────────

/**
 * Parse a `from=EIN,AMS` param into a deduped, upper-cased list of origin
 * codes. Empty / missing → ALL active origins. Unknown codes are dropped; if
 * nothing valid remains, falls back to all origins (never returns []).
 */
export function parseOrigins(fromParam: string | null | undefined): string[] {
  if (!fromParam) return [...ALL_ORIGIN_CODES];

  const valid = new Set(ALL_ORIGIN_CODES);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of fromParam.split(",")) {
    const code = raw.trim().toUpperCase();
    if (code && valid.has(code) && !seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out.length > 0 ? out : [...ALL_ORIGIN_CODES];
}

// ─── Trip filter builder ─────────────────────────────────────────────────────

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
}

/**
 * Build a Mongo filter on the `flights` collection. Dates compare
 * lexicographically (YYYY-MM-DD strings sort chronologically).
 */
export function buildTripFilter(params: TripFilterParams): Filter<FlightDoc> {
  const { origins, start, end, maxPrice, direct, minNights, maxNights } =
    params;

  const filter: Filter<FlightDoc> = {
    origin: { $in: origins },
  };

  // Overlap semantics: a trip matches when its [outbound_date, return_date]
  // interval intersects [start, end] — not only when it departs inside the
  // range. Outbound is still floored at today: a trip that already departed
  // can't be booked, so it never shows even when it overlaps the range.
  const outbound: Record<string, string> = { $gte: todayStr() };
  if (end) outbound.$lte = end;
  filter.outbound_date = outbound;
  filter.return_date = { $gte: start };

  // Hard ceiling always applies — routing-artifact fares (€2000+ multi-leg
  // tickets Google returns when a route has no real option) are never shown.
  const effectiveMax =
    typeof maxPrice === "number" && Number.isFinite(maxPrice)
      ? Math.min(maxPrice, HARD_PRICE_CEILING)
      : HARD_PRICE_CEILING;
  filter.price = { $lte: effectiveMax };

  if (direct) {
    filter.outbound_stops = 0;
    filter.return_stops = 0;
  }

  const dur: Record<string, number> = {};
  if (typeof minNights === "number" && Number.isFinite(minNights)) {
    dur.$gte = minNights;
  }
  if (typeof maxNights === "number" && Number.isFinite(maxNights)) {
    dur.$lte = maxNights;
  }
  if (Object.keys(dur).length > 0) filter.duration_days = dur;

  return filter;
}

// ─── Doc → scored Trip ───────────────────────────────────────────────────────

/**
 * Validate + score a batch of raw Mongo docs into Trips. Skips docs that fail
 * the FlightDoc schema (logs the offending key) so one bad doc can't 500 a
 * public route. Reuses lib/trips.toTrip (which applies lib/score) verbatim.
 */
export function scoreFlights(
  docs: unknown[],
  baselines: Map<string, RouteBaseline>,
): Trip[] {
  const trips: Trip[] = [];
  for (const raw of docs) {
    let doc: FlightDoc;
    try {
      doc = parseFlightDoc(raw);
    } catch (err) {
      console.warn("[queries] skipping invalid flight doc:", err);
      continue;
    }
    trips.push(toTrip(doc, baselines));
  }
  return trips;
}

// ─── Month helper ────────────────────────────────────────────────────────────

/** "2026-06-21" → "2026-06" (outbound-month key for curation). */
function monthKey(date: string): string {
  return date.slice(0, 7);
}

// ─── /api/cities aggregation + scoring ───────────────────────────────────────

/**
 * Build the Explore city grid for a set of origins.
 *
 * Aggregation: future flights from the selected origins, sorted cheapest-first,
 * grouped by (destination, origin) → cheapest doc per route + a count. In TS we
 * score every candidate against its route baseline, pick the BEST candidate per
 * destination by score (tie → lower price), and join generated city metadata.
 * Unknown destination codes are skipped. Cities are returned sorted by best
 * score descending (tie → lower min_price).
 */
export async function getCitiesData(
  origins: string[],
  avail?: UserAvailability | null,
): Promise<CitySummary[]> {
  const flights = await flightsCollection();
  const today = todayStr();

  const match: Record<string, unknown> = {
    origin: { $in: origins },
    outbound_date: { $gte: today },
    price: { $lte: HARD_PRICE_CEILING },
  };
  if (avail) {
    const nights: Record<string, number> = {};
    if (avail.minNights !== null) nights.$gte = avail.minNights;
    if (avail.maxNights !== null) nights.$lte = avail.maxNights;
    if (Object.keys(nights).length > 0) match.duration_days = nights;
  }

  // One cheapest doc per (destination, origin) + a count of future flights.
  // With an availability constraint the per-day calendar rules can't be
  // expressed in a $match, so we group in TS over the filtered docs instead
  // (docs/AVAILABILITY_V2.md).
  let grouped: unknown[];
  if (avail) {
    const docs = (await flights.find(match).toArray()).filter((d) =>
      fitsAnyWindow(
        String(d.outbound_date),
        String(d.return_date),
        avail.windows,
        hourOf(d.outbound_departure),
        hourOf(d.return_arrival),
      ),
    );
    docs.sort((a, b) => Number(a.price) - Number(b.price));
    const byRoute = new Map<string, { doc: unknown; count: number }>();
    for (const d of docs) {
      const k = `${d.destination}|${d.origin}`;
      const g = byRoute.get(k);
      if (g) g.count += 1;
      else byRoute.set(k, { doc: d, count: 1 });
    }
    grouped = [...byRoute.values()];
  } else {
    grouped = await flights
      .aggregate(
        [
          { $match: match },
          { $sort: { price: 1 } },
          {
            $group: {
              _id: { destination: "$destination", origin: "$origin" },
              doc: { $first: "$$ROOT" },
              count: { $sum: 1 },
            },
          },
        ],
        { allowDiskUse: true },
      )
      .toArray();
  }

  if (grouped.length === 0) return [];

  const baselines = await getBaselines();

  // Accumulate per destination: best-scored candidate, cheapest price seen,
  // total trip count across origins.
  interface Accum {
    best: Trip;
    minPrice: number;
    tripCount: number;
  }
  const byDest = new Map<string, Accum>();

  for (const g of grouped) {
    const group = g as { doc: unknown; count: number };
    let candidate: Trip;
    try {
      candidate = toTrip(parseFlightDoc(group.doc), baselines);
    } catch (err) {
      console.warn("[queries] cities: skipping invalid candidate:", err);
      continue;
    }

    const dest = candidate.destination;
    const acc = byDest.get(dest);
    if (!acc) {
      byDest.set(dest, {
        best: candidate,
        minPrice: candidate.price,
        tripCount: group.count,
      });
      continue;
    }

    acc.tripCount += group.count;
    if (candidate.price < acc.minPrice) acc.minPrice = candidate.price;

    // Best = highest score; tie-break on lower price.
    const better =
      candidate.score > acc.best.score ||
      (candidate.score === acc.best.score && candidate.price < acc.best.price);
    if (better) acc.best = candidate;
  }

  const cities: CitySummary[] = [];
  for (const [code, acc] of byDest) {
    const meta = getDestination(code);
    if (!meta) continue; // skip codes without metadata

    const t = acc.best;
    const baseline = baselines.get(`${t.origin}-${code}`)?.p50 ?? null;

    const best: CityBest = {
      origin: t.origin,
      price: t.price,
      outbound_date: t.outbound_date,
      return_date: t.return_date,
      duration_days: t.duration_days,
      nights: t.duration_days,
      score: t.score,
      delta_pct: t.delta_pct,
      deal_tier: t.deal_tier,
      airlines: t.airlines,
      is_direct: t.is_direct,
      search_link: t.search_link,
    };

    cities.push({
      code: meta.code,
      name: meta.name,
      country: meta.country,
      region: meta.region,
      tier: meta.tier,
      min_price: acc.minPrice,
      trip_count: acc.tripCount,
      baseline,
      best,
    });
  }

  cities.sort(
    (a, b) => b.best.score - a.best.score || a.min_price - b.min_price,
  );

  return cities;
}

// ─── /api/cities/[code] ──────────────────────────────────────────────────────

export interface CityData {
  city: CitySummary;
  baseline: number | null;
  trips: Trip[];
}

/**
 * City detail: all upcoming trips to one destination from the selected origins,
 * scored + deduped + sorted by score desc. `baseline` is the baseline of the
 * best origin route (the route of the top-scored trip); falls back to the min
 * baseline across selected origins when no trip exists. Also builds the
 * CitySummary header for the city. Returns null when the code is unknown.
 */
export async function getCityData(
  code: string,
  origins: string[],
): Promise<CityData | null> {
  const meta = getDestination(code);
  if (!meta) return null;

  const flights = await flightsCollection();
  const today = todayStr();

  const docs = await flights
    .find({
      destination: code,
      origin: { $in: origins },
      outbound_date: { $gte: today },
      price: { $lte: HARD_PRICE_CEILING },
    })
    .toArray();

  const baselines = await getBaselines();

  const scored = scoreFlights(docs, baselines);
  const trips = dedupeTrips(scored).sort(
    (a, b) => b.score - a.score || a.price - b.price,
  );

  // Baseline of the best origin route, else the min p50 across selected origins.
  let baseline: number | null = null;
  if (trips.length > 0) {
    baseline = baselines.get(`${trips[0].origin}-${code}`)?.p50 ?? null;
  }
  if (baseline === null) {
    for (const o of origins) {
      const p = baselines.get(`${o}-${code}`)?.p50;
      if (typeof p === "number" && (baseline === null || p < baseline)) {
        baseline = p;
      }
    }
  }

  // Build the CitySummary header from the surviving trips.
  let city: CitySummary;
  if (trips.length > 0) {
    const best = trips[0]; // already sorted best-first
    let minPrice = Infinity;
    for (const t of trips) if (t.price < minPrice) minPrice = t.price;

    city = {
      code: meta.code,
      name: meta.name,
      country: meta.country,
      region: meta.region,
      tier: meta.tier,
      min_price: minPrice,
      trip_count: trips.length,
      baseline,
      best: {
        origin: best.origin,
        price: best.price,
        outbound_date: best.outbound_date,
        return_date: best.return_date,
        duration_days: best.duration_days,
        nights: best.duration_days,
        score: best.score,
        delta_pct: best.delta_pct,
        deal_tier: best.deal_tier,
        airlines: best.airlines,
        is_direct: best.is_direct,
        search_link: best.search_link,
      },
    };
  } else {
    // No trips: a header with an empty/placeholder best so the page can render.
    city = {
      code: meta.code,
      name: meta.name,
      country: meta.country,
      region: meta.region,
      tier: meta.tier,
      min_price: 0,
      trip_count: 0,
      baseline,
      best: {
        origin: origins[0] ?? "",
        price: 0,
        outbound_date: today,
        return_date: today,
        duration_days: 0,
        nights: 0,
        score: 0,
        delta_pct: null,
        deal_tier: "fair",
        airlines: [],
        is_direct: false,
        search_link: null,
      },
    };
  }

  return { city, baseline, trips };
}

// ─── /api/trips ──────────────────────────────────────────────────────────────

export interface TripsQuery {
  origins: string[];
  start: string;
  end: string;
  maxPrice?: number | null;
  minNights?: number | null;
  maxNights?: number | null;
  direct?: boolean;
  /** restrict BARS (not density) to this deal tier */
  tier?: "steal" | "deal" | "fair" | null;
  /** when true and a session is present, restrict to the user's free windows */
  avail?: boolean;
}

/** Minimal session shape — only what trips filtering needs. */
export interface TripsSession {
  user?: { id?: string | null } | null;
}

export interface TripsData {
  trips: Trip[];
  density: Record<string, number>;
  truncated: boolean;
}

/** A user availability window, normalized to YYYY-MM-DD strings. */
interface AvailWindow {
  start: string;
  end: string;
  /** Hour (5–23) the user gets free on `start`; null = all day. */
  startTime: number | null;
  /** Hour (1–23) the user must be back by on `end`; null = all day. */
  endTime: number | null;
}

/**
 * Extract the hour (0–23) from a flight leg timestamp string
 * ("2026-08-14T17:35:00", "2026-08-14 17:35" or "17:35"). Null when unknown —
 * unknown hours are never filtered out.
 */
export function hourOf(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const m = v.match(/(?:[T ])(\d{2}):\d{2}/) ?? v.match(/^(\d{1,2}):\d{2}/);
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? h : null;
}

/** Normalize a Mongo date field (BSON Date or string) → YYYY-MM-DD, or null. */
function toDateStr(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") {
    // Accept "2026-06-21" or "2026-06-21T00:00:00..." — keep the date part.
    const m = v.match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  }
  return null;
}

/**
 * Load a signed-in user's availability windows + trip-length prefs.
 * Returns null when the user can't be resolved (treated as "no avail filter").
 */
export interface UserAvailability {
  windows: AvailWindow[];
  minNights: number | null;
  maxNights: number | null;
}

export async function loadUserAvailability(
  userId: string,
): Promise<UserAvailability | null> {
  let oid: import("mongodb").ObjectId;
  try {
    const { ObjectId } = await import("mongodb");
    oid = new ObjectId(userId);
  } catch {
    return null;
  }

  const db = await getDb();

  const [user, availDocs] = await Promise.all([
    db.collection("users").findOne({ _id: oid }),
    // availability docs store user_id as a session-id STRING (current PUT
    // route) or a legacy ObjectId — match both.
    db
      .collection("availability")
      .find({ user_id: { $in: [userId, oid] } })
      .toArray(),
  ]);

  const prefs = (user?.preferences ?? {}) as Record<string, unknown>;
  const minNights =
    typeof prefs.trip_min_nights === "number" ? prefs.trip_min_nights : null;
  const maxNights =
    typeof prefs.trip_max_nights === "number" ? prefs.trip_max_nights : null;

  const windows: AvailWindow[] = [];
  for (const w of availDocs) {
    const start = toDateStr(w.start_date);
    const end = toDateStr(w.end_date);
    if (start && end)
      windows.push({
        start,
        end,
        startTime: typeof w.start_time === "number" ? w.start_time : null,
        endTime: typeof w.end_time === "number" ? w.end_time : null,
      });
  }

  return { windows, minNights, maxNights };
}

/**
 * True if [outbound,return] fits ENTIRELY inside at least one window,
 * respecting the window's edge times: on the first day the outbound must
 * depart at/after startTime, on the last day the return must arrive at/before
 * endTime. Legs with unparseable times are never filtered out.
 */
export function fitsAnyWindow(
  outbound: string,
  ret: string,
  windows: AvailWindow[],
  depHour: number | null = null,
  arrHour: number | null = null,
): boolean {
  for (const w of windows) {
    if (outbound < w.start || ret > w.end) continue;
    if (
      w.startTime !== null &&
      outbound === w.start &&
      depHour !== null &&
      depHour < w.startTime
    )
      continue;
    if (
      w.endTime !== null &&
      ret === w.end &&
      arrHour !== null &&
      arrHour > w.endTime
    )
      continue;
    return true;
  }
  return false;
}

/**
 * Build the Calendar payload.
 *
 *  - density is computed over the UNFILTERED match (origins + date range ONLY;
 *    price / tier / nights / direct are ignored) so the heat never lies.
 *  - bars come from the FILTERED match, deduped by
 *    destination|outbound|return keeping the cheapest, then curated:
 *    per destination per outbound-month keep the top 2 by score, then the
 *    global top 40 bars per outbound-month. tier filter applies to BARS only.
 *  - avail=1 + a resolvable session → keep only trips that fit entirely inside
 *    one of the user's availability windows AND whose nights are within the
 *    user's trip-length prefs. Applied to BOTH bars and density (the user is
 *    explicitly asking to see only their free dates).
 *  - truncated = some bars were dropped by curation.
 */
export async function getTripsData(
  params: TripsQuery,
  session: TripsSession | null,
): Promise<TripsData> {
  const flights = await flightsCollection();
  const baselines = await getBaselines();

  // ── Density base: origins + date range only ──────────────────────────────
  const densityFilter = buildTripFilter({
    origins: params.origins,
    start: params.start,
    end: params.end,
  });

  const densityProjection = {
    _id: 0,
    outbound_date: 1,
    return_date: 1,
    // fields needed only when avail filtering is active:
    duration_days: 1,
    outbound_departure: 1,
    return_arrival: 1,
  };

  const densityDocs = await flights
    .find(densityFilter, { projection: densityProjection })
    .toArray();

  // ── Bars base: full filter ────────────────────────────────────────────────
  const barsFilter = buildTripFilter({
    origins: params.origins,
    start: params.start,
    end: params.end,
    maxPrice: params.maxPrice,
    direct: params.direct,
    minNights: params.minNights,
    maxNights: params.maxNights,
  });

  const barDocs = await flights.find(barsFilter).toArray();

  // ── Resolve availability (avail=1 + session) ──────────────────────────────
  let avail: UserAvailability | null = null;
  if (params.avail && session?.user?.id) {
    avail = await loadUserAvailability(session.user.id);
    // No windows at all → nothing to constrain to; ignore avail (don't blank
    // the calendar).
    if (avail && avail.windows.length === 0) avail = null;
  }

  const passesAvail = (
    outbound: string,
    ret: string,
    nights: number,
    depHour: number | null = null,
    arrHour: number | null = null,
  ): boolean => {
    if (!avail) return true;
    if (!fitsAnyWindow(outbound, ret, avail.windows, depHour, arrHour))
      return false;
    if (avail.minNights !== null && nights < avail.minNights) return false;
    if (avail.maxNights !== null && nights > avail.maxNights) return false;
    return true;
  };

  // ── Density (heat) ────────────────────────────────────────────────────────
  const densityInput = densityDocs
    .map((d) => ({
      outbound_date: String(d.outbound_date),
      return_date: String(d.return_date),
      duration_days: typeof d.duration_days === "number" ? d.duration_days : 0,
      dep_hour: hourOf(d.outbound_departure),
      arr_hour: hourOf(d.return_arrival),
    }))
    .filter((d) =>
      passesAvail(
        d.outbound_date,
        d.return_date,
        d.duration_days,
        d.dep_hour,
        d.arr_hour,
      ),
    );
  const density = buildDensity(densityInput);

  // ── Bars: score → dedupe → avail filter → tier filter → curate ────────────
  let bars = dedupeTrips(scoreFlights(barDocs, baselines));

  if (avail) {
    bars = bars.filter((t) =>
      passesAvail(
        t.outbound_date,
        t.return_date,
        t.duration_days,
        hourOf(t.outbound.dep),
        hourOf(t.ret.arr),
      ),
    );
  }

  if (params.tier) {
    bars = bars.filter((t) => t.deal_tier === params.tier);
  }

  const beforeCuration = bars.length;
  const curated = curateBars(bars);
  const truncated = curated.length < beforeCuration;

  return { trips: curated, density, truncated };
}

/**
 * Curation for calendar bars (variety guard):
 *   1. per destination per outbound-month → keep top 2 by score
 *   2. then per outbound-month → keep global top 40 by score
 * Sorting throughout: score desc, tie → lower price.
 */
function curateBars(trips: Trip[]): Trip[] {
  const byScore = (a: Trip, b: Trip) =>
    b.score - a.score || a.price - b.price;

  // Step 1: cap per (month, destination).
  const perDestMonth = new Map<string, Trip[]>();
  for (const t of trips) {
    const k = `${monthKey(t.outbound_date)}|${t.destination}`;
    const arr = perDestMonth.get(k);
    if (arr) arr.push(t);
    else perDestMonth.set(k, [t]);
  }

  const afterDestCap: Trip[] = [];
  for (const arr of perDestMonth.values()) {
    arr.sort(byScore);
    for (const t of arr.slice(0, BARS_PER_DEST_PER_MONTH)) afterDestCap.push(t);
  }

  // Step 2: cap per month globally.
  const perMonth = new Map<string, Trip[]>();
  for (const t of afterDestCap) {
    const k = monthKey(t.outbound_date);
    const arr = perMonth.get(k);
    if (arr) arr.push(t);
    else perMonth.set(k, [t]);
  }

  const out: Trip[] = [];
  for (const arr of perMonth.values()) {
    arr.sort(byScore);
    for (const t of arr.slice(0, BARS_PER_MONTH)) out.push(t);
  }

  out.sort(byScore);
  return out;
}

// ─── /api/groups/[id]/trips — group trip matching ───────────────────────────

export interface GroupTripsData {
  trips: GroupTrip[];
  shared_windows: { start: string; end: string }[];
  known_count: number;
  unknown_count: number;
  truncated: boolean;
}

/** Curation for group trip bars: per destination keep at most this many. */
const GROUP_TRIPS_PER_DEST = 2;
/** Curation: global cap across all destinations. */
const GROUP_TRIPS_GLOBAL_CAP = 60;

/** Rank order for group trips: full-group match first, then most free members,
 *  then best score, then cheapest. */
function groupTripRankCompare(a: GroupTrip, b: GroupTrip): number {
  if (a.full_group !== b.full_group) return a.full_group ? -1 : 1;
  if (a.free_count !== b.free_count) return b.free_count - a.free_count;
  if (a.score !== b.score) return b.score - a.score;
  return a.price - b.price;
}

/**
 * Curation (variety guard, no month-bucketing — unlike curateBars):
 *   1. per destination → keep top GROUP_TRIPS_PER_DEST by rank
 *   2. then globally → keep top GROUP_TRIPS_GLOBAL_CAP by rank
 */
function curateGroupTrips(trips: GroupTrip[]): {
  curated: GroupTrip[];
  truncated: boolean;
} {
  const perDest = new Map<string, GroupTrip[]>();
  for (const t of trips) {
    const arr = perDest.get(t.destination);
    if (arr) arr.push(t);
    else perDest.set(t.destination, [t]);
  }

  const afterDestCap: GroupTrip[] = [];
  for (const arr of perDest.values()) {
    arr.sort(groupTripRankCompare);
    for (const t of arr.slice(0, GROUP_TRIPS_PER_DEST)) afterDestCap.push(t);
  }

  afterDestCap.sort(groupTripRankCompare);
  const curated = afterDestCap.slice(0, GROUP_TRIPS_GLOBAL_CAP);
  const truncated = curated.length < trips.length;

  return { curated, truncated };
}

/**
 * A merged, disjoint, sorted-by-start date-string run. startTime/endTime
 * mirror AvailWindow's edge-hour semantics but only apply when this run's
 * `start`/`end` is a genuine availability-window boundary — null (from a
 * merge tie or a clip to the scan window) means "no constraint from this
 * side" rather than "free all day", so callers must treat null as the more
 * permissive value on whichever side it appears.
 */
interface DateRun {
  start: string;
  end: string;
  startTime: number | null;
  endTime: number | null;
}

/**
 * Merge (possibly overlapping/adjacent) availability windows for ONE member
 * into disjoint sorted runs. Sort on start, combine when the next window
 * starts at/before the current run's end. Carries each run's edge hours
 * through from whichever window currently owns that edge (the earliest
 * window for `start`, the furthest-reaching one for `end`) so a later
 * cross-member intersection can still tell whether free HOURS actually
 * overlap on the boundary days, not just the dates.
 */
function mergeWindowsToRuns(windows: AvailWindow[]): DateRun[] {
  if (windows.length === 0) return [];
  const sorted = [...windows].sort((a, b) =>
    a.start < b.start ? -1 : a.start > b.start ? 1 : 0,
  );

  const merged: DateRun[] = [];
  for (const w of sorted) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end) {
      if (w.end > last.end) {
        last.end = w.end;
        last.endTime = w.endTime;
      }
    } else {
      merged.push({
        start: w.start,
        end: w.end,
        startTime: w.startTime,
        endTime: w.endTime,
      });
    }
  }
  return merged;
}

/** null = no constraint from that side (most permissive). AND-combine two
 * "free from" hour constraints — the group can only start once BOTH sides
 * are free, so the later of the two applicable hours wins. */
function intersectStartTime(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/** AND-combine two "back by" hour constraints — the group must ALL be back
 * by the earlier of the two applicable deadlines. */
function intersectEndTime(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/**
 * Intersect two disjoint sorted run-lists via a two-pointer sweep. Two runs
 * overlap when a.start <= b.end && b.start <= a.end; their intersection is
 * [max(a.start,b.start), min(a.end,b.end)]. An edge hour constraint only
 * carries into the intersection when that side's date is the ACTUAL boundary
 * of the run it came from — e.g. if the intersection's start is later than
 * a's own start, a was already free well before that day, so a's startTime
 * doesn't apply. When the intersection collapses to a single day, both
 * sides' constraints land on that same day, so a real contradiction (nobody
 * free before the other's cutoff) means there's no true overlap and the run
 * is dropped rather than falsely reported as shared.
 */
function intersectRuns(a: DateRun[], b: DateRun[]): DateRun[] {
  const out: DateRun[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const start = a[i].start > b[j].start ? a[i].start : b[j].start;
    const end = a[i].end < b[j].end ? a[i].end : b[j].end;
    if (start <= end) {
      const startTime = intersectStartTime(
        start === a[i].start ? a[i].startTime : null,
        start === b[j].start ? b[j].startTime : null,
      );
      const endTime = intersectEndTime(
        end === a[i].end ? a[i].endTime : null,
        end === b[j].end ? b[j].endTime : null,
      );
      const sameDayContradiction =
        start === end &&
        startTime !== null &&
        endTime !== null &&
        startTime >= endTime;
      if (!sameDayContradiction) out.push({ start, end, startTime, endTime });
    }
    if (a[i].end < b[j].end) i++;
    else j++;
  }
  return out;
}

/** Clip runs to [lo, hi], dropping any that fall entirely outside it. A
 * clamped edge is no longer a genuine availability boundary (lo/hi are just
 * the scan window), so its hour constraint is dropped along with it. */
function clipRuns(runs: DateRun[], lo: string, hi: string): DateRun[] {
  const out: DateRun[] = [];
  for (const r of runs) {
    const clampedStart = r.start < lo;
    const clampedEnd = r.end > hi;
    const start = clampedStart ? lo : r.start;
    const end = clampedEnd ? hi : r.end;
    if (start <= end) {
      out.push({
        start,
        end,
        startTime: clampedStart ? null : r.startTime,
        endTime: clampedEnd ? null : r.endTime,
      });
    }
  }
  return out;
}

/**
 * Merge each known member's windows into disjoint runs, then intersect those
 * run-lists pairwise across all members, clipped to [lo, hi].
 */
function intersectAllMemberWindows(
  perMemberWindows: AvailWindow[][],
  lo: string,
  hi: string,
): DateRun[] {
  if (perMemberWindows.length === 0) return [];
  let runs = mergeWindowsToRuns(perMemberWindows[0]);
  for (let i = 1; i < perMemberWindows.length && runs.length > 0; i++) {
    runs = intersectRuns(runs, mergeWindowsToRuns(perMemberWindows[i]));
  }
  return clipRuns(runs, lo, hi);
}

/**
 * Group trip matching: fan loadUserAvailability over every member, then rank
 * upcoming trips by how many KNOWN members (>=1 availability window) fit
 * them. Members with zero windows are "unknown" — excluded from the
 * denominator and from shared_windows, and never block a full-group match.
 * Reuses buildTripFilter/scoreFlights/dedupeTrips verbatim — no changes to
 * getTripsData/getCitiesData, Explore and Calendar are untouched.
 *
 * Cost: one indexed flights.find() bounded exactly like getTripsData's bars
 * query, plus O(trips * members * windows) in memory — trivially bounded at
 * <=12 members.
 */
export async function getGroupTripsData(
  memberIds: string[],
  origins: string[],
): Promise<GroupTripsData> {
  const avails = await Promise.all(memberIds.map((id) => loadUserAvailability(id)));
  const known: { id: string; avail: UserAvailability }[] = [];
  for (let i = 0; i < memberIds.length; i++) {
    const a = avails[i];
    if (a && a.windows.length > 0) known.push({ id: memberIds[i], avail: a });
  }
  const unknownCount = memberIds.length - known.length;

  const flights = await flightsCollection();
  const baselines = await getBaselines();
  const start = todayStr();
  const end = monthsAhead(6);
  const filter = buildTripFilter({ origins, start, end });
  const docs = await flights.find(filter).toArray();
  const trips = dedupeTrips(scoreFlights(docs, baselines));

  let scored: GroupTrip[] = trips.map((t) => {
    const depH = hourOf(t.outbound.dep);
    const arrH = hourOf(t.ret.arr);
    const freeIds: string[] = [];
    for (const m of known) {
      if (
        !fitsAnyWindow(t.outbound_date, t.return_date, m.avail.windows, depH, arrH)
      )
        continue;
      if (m.avail.minNights !== null && t.duration_days < m.avail.minNights)
        continue;
      if (m.avail.maxNights !== null && t.duration_days > m.avail.maxNights)
        continue;
      freeIds.push(m.id);
    }
    return {
      ...t,
      free_count: freeIds.length,
      known_count: known.length,
      unknown_count: unknownCount,
      free_user_ids: freeIds,
      full_group: known.length >= 2 && freeIds.length === known.length,
    };
  });

  // Nobody known is free on a given trip -> not worth showing. When nobody
  // in the group has availability at all, keep everything so the page can
  // render its "add availability" banner over the full trip list.
  if (known.length > 0) {
    scored = scored.filter((t) => t.free_count > 0);
  }

  scored.sort(groupTripRankCompare);

  const { curated, truncated } = curateGroupTrips(scored);

  // Strip the internal hour fields at the boundary — they've already done
  // their job of excluding days where members' free hours don't actually
  // overlap (see intersectRuns); the public shape stays date-only.
  const sharedWindows =
    known.length >= 2
      ? intersectAllMemberWindows(
          known.map((m) => m.avail.windows),
          start,
          end,
        ).map((r) => ({ start: r.start, end: r.end }))
      : [];

  return {
    trips: curated,
    shared_windows: sharedWindows,
    known_count: known.length,
    unknown_count: unknownCount,
    truncated,
  };
}
