// ─── GET /api/trips — Calendar payload ───────────────────────────────────────
// Public (avail=1 needs a session). Query:
//   ?from&start&end&maxPrice&minNights&maxNights&direct&tier&avail
// → { trips: Trip[] (curated bars), density: Record<date,count>, truncated }.
//
// density is computed over the UNFILTERED match (origins + date range only) so
// the heat never lies; price/tier/nights/direct narrow the BARS only. avail=1
// restricts to the signed-in user's free windows + trip-length prefs.
// Spec: docs/DESIGN_V1.md sections D + G.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { TripsResponseSchema } from "@/types/api";
import {
  getTripsData,
  monthsAhead,
  parseOrigins,
  todayStr,
  type TripsSession,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** Query schema — every field optional with sensible defaults applied below. */
const QuerySchema = z.object({
  start: DateStr.optional(),
  end: DateStr.optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minNights: z.coerce.number().int().nonnegative().optional(),
  maxNights: z.coerce.number().int().nonnegative().optional(),
  direct: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
  tier: z.enum(["steal", "deal", "fair"]).optional(),
  avail: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const origins = parseOrigins(sp.get("from"));

    // Pull only the keys our schema knows about (avoid passing `from` etc.).
    const parsed = QuerySchema.safeParse({
      start: sp.get("start") ?? undefined,
      end: sp.get("end") ?? undefined,
      maxPrice: sp.get("maxPrice") ?? undefined,
      minNights: sp.get("minNights") ?? undefined,
      maxNights: sp.get("maxNights") ?? undefined,
      direct: sp.get("direct") ?? undefined,
      tier: sp.get("tier") ?? undefined,
      avail: sp.get("avail") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", detail: z.prettifyError(parsed.error) },
        { status: 400 },
      );
    }

    const q = parsed.data;
    const start = q.start ?? todayStr();
    const end = q.end ?? monthsAhead(6);

    // Resolve session only when the caller asked for availability filtering.
    let session: TripsSession | null = null;
    if (q.avail) {
      session = (await auth()) as TripsSession | null;
    }

    const data = await getTripsData(
      {
        origins,
        start,
        end,
        maxPrice: q.maxPrice ?? null,
        minNights: q.minNights ?? null,
        maxNights: q.maxNights ?? null,
        direct: q.direct ?? false,
        tier: q.tier ?? null,
        avail: q.avail ?? false,
      },
      session,
    );

    const body = TripsResponseSchema.parse(data);
    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/trips] failed:", err);
    return NextResponse.json(
      { error: "Failed to load trips" },
      { status: 500 },
    );
  }
}
