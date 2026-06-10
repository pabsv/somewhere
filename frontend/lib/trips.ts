// ─── FlightDoc → Trip transform — server-side ────────────────────────────────
// The ONLY place raw Mongo flight docs become client-facing Trips.
// Pure given its inputs (baselines are fetched by the caller via
// lib/baselines.ts); meant to be called from API route handlers.
// Spec: docs/DESIGN_V1.md section D.

import type { FlightDoc, Trip } from "@/types/api";
import type { RouteBaseline } from "@/lib/baselines";
import { scoreTrip } from "@/lib/score";
import { getDestination } from "@/data/destinations.gen";

/**
 * Transform a validated flight doc into a scored Trip.
 * - city name joined from generated destination data (falls back to the code)
 * - score/delta/tier from lib/score.ts against the route's p50 baseline
 * - is_direct = zero stops on BOTH legs
 * - nights = duration_days (night count and trip span are the same unit here)
 */
export function toTrip(
  doc: FlightDoc,
  baselines: Map<string, RouteBaseline>,
): Trip {
  const routeKey = `${doc.origin}-${doc.destination}`;
  const baseline = baselines.get(routeKey)?.p50 ?? null;
  const { score, delta_pct, deal_tier } = scoreTrip(doc.price, baseline);

  return {
    key: doc.flight_key,
    origin: doc.origin,
    destination: doc.destination,
    city: getDestination(doc.destination)?.name ?? doc.destination,
    outbound_date: doc.outbound_date,
    return_date: doc.return_date,
    duration_days: doc.duration_days,
    price: doc.price,
    currency: doc.currency,
    airlines: doc.airlines,
    is_direct: doc.outbound_stops === 0 && doc.return_stops === 0,
    score,
    delta_pct,
    deal_tier,
    outbound: {
      dep: doc.outbound_departure,
      arr: doc.outbound_arrival,
      duration: doc.outbound_duration,
      stops: doc.outbound_stops,
    },
    ret: {
      dep: doc.return_departure,
      arr: doc.return_arrival,
      duration: doc.return_duration,
      stops: doc.return_stops,
    },
    price_points: doc.price_points,
    search_link: doc.search_link,
    last_seen_at: doc.last_seen_at,
  };
}

/**
 * Keep the cheapest trip per `destination|outbound_date|return_date`.
 * Stable: preserves first-seen order of the surviving trips.
 */
export function dedupeTrips(trips: Trip[]): Trip[] {
  const best = new Map<string, Trip>();
  for (const trip of trips) {
    const key = `${trip.destination}|${trip.outbound_date}|${trip.return_date}`;
    const current = best.get(key);
    if (!current || trip.price < current.price) best.set(key, trip);
  }
  return [...best.values()];
}

/** Defensive cap on the days a single trip may contribute to density. */
const MAX_SPAN_DAYS = 120;

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Count how many trips SPAN each day (inclusive of both outbound and return
 * dates). Local-safe date math: bare YYYY-MM-DD strings are split into
 * components — never passed to `new Date(string)`.
 *
 * Accepts anything with outbound/return dates so it can run over the
 * unfiltered match (spec: "the heat never lies"), not just curated Trips.
 */
export function buildDensity(
  trips: Array<Pick<Trip, "outbound_date" | "return_date">>,
): Record<string, number> {
  const density: Record<string, number> = {};

  for (const trip of trips) {
    const [y, m, d] = trip.outbound_date.split("-").map(Number);
    const cursor = new Date(y, m - 1, d);

    for (let i = 0; i <= MAX_SPAN_DAYS; i++) {
      const day = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
      if (day > trip.return_date) break;
      density[day] = (density[day] ?? 0) + 1;
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return density;
}
