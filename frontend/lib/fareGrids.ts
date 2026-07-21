// ─── One-way fare grids — the `oneway_fares` read path ───────────────────────
// One doc per directed leg (`leg_key` = "EIN-BCN") holding
// `prices: {YYYY-MM-DD: cheapest one-way €}`, replaced wholesale each scrape
// (21d TTL). Written by the Python pool scheduler as a free by-product of the
// Phase-1 one-way sweeps the round-trip pair ranking already runs — see
// FlightService.save_oneway_grids.
//
// Sole consumer today: getTripStretchData (lib/queries.ts), which loads the
// ORIG→DEST and DEST→ORIG grids of ONE route to price the `~` estimate rows of
// the round-trip stretch bubble. Kept in its own module (rather than inside
// queries.ts) so the grid read stays a named, testable seam.

import type { Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { OnewayFareDocSchema, type OnewayFareDoc } from "@/types/api";

/**
 * Fetch `oneway_fares` docs matching a filter, projected to the fields callers
 * need. Docs failing the schema are skipped with a warning (one bad doc can't
 * 500 the route) — mirrors scoreFlights' convention.
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
        `[fareGrids] skipping invalid oneway_fares doc [leg_key=${String(
          (r as Record<string, unknown>).leg_key ?? "<missing>",
        )}]`,
      );
  }
  return docs;
}
