// ─── Route baselines — server-only ───────────────────────────────────────────
// Reads scrape_targets once and exposes route_key → { p50, min } for read-time
// scoring (lib/score.ts). Spec: docs/DESIGN_V1.md section C.
//
// Caching: React cache() dedupes within a single request render; a
// module-level memo holds the Map across requests for 10 minutes
// (unstable_cache can't serialize a Map, so a plain memo is used instead).
// Server-only: imports lib/mongodb.ts — never import from client components.

import { cache } from "react";
import { getDb } from "@/lib/mongodb";

export interface RouteBaseline {
  /** EWMA of per-run median price (price_p50_ewma) — null while route is cold */
  p50: number | null;
  /** Cheapest price ever seen on the route (min_price_seen) */
  min: number | null;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes

let memo: { at: number; data: Map<string, RouteBaseline> } | null = null;

function asNumberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchBaselines(): Promise<Map<string, RouteBaseline>> {
  const now = Date.now();
  if (memo && now - memo.at < TTL_MS) return memo.data;

  const db = await getDb();
  const docs = await db
    .collection("scrape_targets")
    .find(
      {},
      {
        projection: {
          _id: 0,
          route_key: 1,
          origin: 1,
          destination: 1,
          price_p50_ewma: 1,
          min_price_seen: 1,
        },
      },
    )
    .toArray();

  const data = new Map<string, RouteBaseline>();
  for (const d of docs) {
    const routeKey =
      typeof d.route_key === "string"
        ? d.route_key
        : `${d.origin}-${d.destination}`;
    data.set(routeKey, {
      p50: asNumberOrNull(d.price_p50_ewma),
      min: asNumberOrNull(d.min_price_seen),
    });
  }

  memo = { at: now, data };
  return data;
}

/**
 * route_key ("EIN-BCN") → baseline. Request-deduped via React cache(),
 * cross-request cached 10 min via module memo.
 */
export const getBaselines = cache(fetchBaselines);
