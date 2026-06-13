// ─── GET /api/cities — Explore city grid ─────────────────────────────────────
// Public. ?from=EIN,AMS&window=all → { cities: CitySummary[], updated_at }.
// Best trip per destination across the selected origins, scored against route
// baselines, joined with generated city metadata. Cached 2 min per origin set
// (short TTL keeps the grid close to the latest scrape; fares are still
// last-seen snapshots — the UI disclaims that prices may rise at checkout).
// Spec: docs/DESIGN_V1.md section D.

import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/auth";
import { CitiesResponseSchema } from "@/types/api";
import {
  getCitiesData,
  loadUserAvailability,
  parseOrigins,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const REVALIDATE_SECONDS = 120; // 2 min

/**
 * Cache the (expensive) aggregation + scoring keyed by the sorted origin set.
 * `updated_at` is intentionally NOT cached — it stamps the response at read
 * time so clients can see freshness even on a cache hit.
 */
function citiesForOrigins(originsKey: string) {
  return unstable_cache(
    async () => getCitiesData(originsKey.split(",")),
    ["cities", originsKey],
    { revalidate: REVALIDATE_SECONDS, tags: ["cities", `cities:${originsKey}`] },
  )();
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const origins = parseOrigins(sp.get("from"));
    const originsKey = [...origins].sort().join(",");

    // avail=1 → per-user availability filter; bypass the shared cache.
    const wantAvail = sp.get("avail") === "1" || sp.get("avail") === "true";
    let cities;
    if (wantAvail) {
      const session = await auth();
      const userId = (session?.user as { id?: string } | undefined)?.id;
      const avail = userId ? await loadUserAvailability(userId) : null;
      cities =
        avail && avail.windows.length > 0
          ? await getCitiesData(originsKey.split(","), avail)
          : await citiesForOrigins(originsKey);
    } else {
      cities = await citiesForOrigins(originsKey);
    }

    const body = CitiesResponseSchema.parse({
      cities,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/cities] failed:", err);
    return NextResponse.json(
      { error: "Failed to load cities" },
      { status: 500 },
    );
  }
}
