// ─── GET /api/cities — Explore city grid ─────────────────────────────────────
// Public. ?from=EIN,AMS&window=all → { cities: CitySummary[], updated_at }.
// Best trip per destination across the selected origins, scored against route
// baselines, joined with generated city metadata. Cached 15 min per origin set.
// Spec: docs/DESIGN_V1.md section D.

import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { CitiesResponseSchema } from "@/types/api";
import { getCitiesData, parseOrigins } from "@/lib/queries";

export const dynamic = "force-dynamic";

const REVALIDATE_SECONDS = 900; // 15 min

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
    const origins = parseOrigins(req.nextUrl.searchParams.get("from"));
    const originsKey = [...origins].sort().join(",");

    const cities = await citiesForOrigins(originsKey);

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
