// ─── GET /api/cities/[code] — City detail ────────────────────────────────────
// Public. ?from=EIN,AMS → { city, baseline, trips: Trip[] }.
// All upcoming trips to one destination from the selected origins, scored,
// deduped, sorted by score desc. 404 for unknown destination codes.
// Spec: docs/DESIGN_V1.md section D.

import { NextResponse, type NextRequest } from "next/server";
import { CityDetailResponseSchema } from "@/types/api";
import { getCityData, parseOrigins } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  try {
    const origins = parseOrigins(req.nextUrl.searchParams.get("from"));

    const data = await getCityData(code, origins);
    if (!data) {
      return NextResponse.json(
        { error: `Unknown destination: ${code}` },
        { status: 404 },
      );
    }

    const body = CityDetailResponseSchema.parse(data);
    return NextResponse.json(body);
  } catch (err) {
    console.error(`[GET /api/cities/${code}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to load city" },
      { status: 500 },
    );
  }
}
