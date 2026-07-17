// ─── GET /api/openjaw — origin-side open-jaw combos for one destination ──────
// Public (avail=1 needs a session, like /api/trips). Query:
//   ?dest=BCN (required) &from=EIN,AMS &min_nights=2 &max_nights=10
//   &max_price=... &avail=1
// → { trips: OpenJawTrip[] } — cheapest-first, capped server-side.
//
// Prices come from the `oneway_fares` grids (date-level only — no times or
// stops), so avail=1 filters by DATE windows and skips edge-hour rules, and
// direct_only can never be honored here. Spec: docs/MULTICITY_PLAN.md Phase 1.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { OpenJawResponseSchema } from "@/types/api";
import { getOpenJawTrips } from "@/lib/openjaw";
import {
  loadUserAvailability,
  parseOrigins,
  type UserAvailability,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  dest: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "expected a 3-letter IATA code")
    .transform((v) => v.toUpperCase()),
  min_nights: z.coerce.number().int().nonnegative().optional(),
  max_nights: z.coerce.number().int().nonnegative().optional(),
  max_price: z.coerce.number().positive().optional(),
  avail: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const origins = parseOrigins(sp.get("from"));

    const parsed = QuerySchema.safeParse({
      dest: sp.get("dest") ?? undefined,
      min_nights: sp.get("min_nights") ?? undefined,
      max_nights: sp.get("max_nights") ?? undefined,
      avail: sp.get("avail") ?? undefined,
      max_price: sp.get("max_price") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", detail: z.prettifyError(parsed.error) },
        { status: 400 },
      );
    }

    const q = parsed.data;
    const minNights = q.min_nights ?? 2;
    const maxNights = q.max_nights ?? 10;
    if (minNights > maxNights) {
      return NextResponse.json(
        { error: "Invalid query", detail: "min_nights > max_nights" },
        { status: 400 },
      );
    }

    // Resolve availability only when asked (mirrors /api/trips). Zero windows
    // → nothing to constrain to; ignore rather than blanking the result.
    let avail: UserAvailability | null = null;
    if (q.avail) {
      const session = await auth();
      if (session?.user?.id) {
        avail = await loadUserAvailability(session.user.id);
        if (avail && avail.windows.length === 0) avail = null;
      }
    }

    const trips = await getOpenJawTrips(q.dest, origins, {
      minNights,
      maxNights,
      maxPrice: q.max_price ?? null,
      avail,
    });

    const body = OpenJawResponseSchema.parse({ trips });
    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/openjaw] failed:", err);
    return NextResponse.json(
      { error: "Failed to load open-jaw trips" },
      { status: 500 },
    );
  }
}
