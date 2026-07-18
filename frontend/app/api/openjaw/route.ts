// ─── GET /api/openjaw — open-jaw combos (origin-side) ────────────────────────
// Public (avail=1 needs a session, like /api/trips). Two modes:
//   city mode:      ?dest=BCN &from=EIN,AMS &min_nights &max_nights &max_price
//                   &avail=1 → combos for one destination (City page, Phase 2)
//   calendar mode:  no dest; adds &start=YYYY-MM-DD &end=YYYY-MM-DD → curated
//                   WINNING combos across all destinations (Calendar, Phase 3)
// → { trips: OpenJawTrip[] } — cheapest-first, capped server-side.
//
// Prices come from the `oneway_fares` grids (date-level only — no times or
// stops), so avail=1 filters by DATE windows and skips edge-hour rules, and
// direct_only can never be honored here. Spec: docs/MULTICITY_PLAN.md Phase 1+3.

import { NextResponse, type NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { OpenJawResponseSchema } from "@/types/api";
import {
  getOpenJawTrips,
  getOpenJawCalendarTrips,
  type CalendarOpenJawOptions,
} from "@/lib/openjaw";
import {
  loadUserAvailability,
  parseOrigins,
  type UserAvailability,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

// The calendar sweep loads every grid for the origin set (~MBs) — cache it
// like /api/cities. City mode stays uncached (one destination = cheap).
const REVALIDATE_SECONDS = 120;

const DateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const QuerySchema = z.object({
  dest: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "expected a 3-letter IATA code")
    .transform((v) => v.toUpperCase())
    .optional(),
  min_nights: z.coerce.number().int().nonnegative().optional(),
  max_nights: z.coerce.number().int().nonnegative().optional(),
  max_price: z.coerce.number().positive().optional(),
  start: DateParam.optional(),
  end: DateParam.optional(),
  avail: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

/** Cached calendar sweep, keyed by everything that shapes the result. */
function calendarSweep(origins: string[], opts: CalendarOpenJawOptions) {
  const key = [
    [...origins].sort().join(","),
    opts.minNights,
    opts.maxNights,
    opts.maxPrice ?? "",
    opts.start ?? "",
    opts.end ?? "",
  ].join("|");
  return unstable_cache(
    async () => getOpenJawCalendarTrips(origins, opts),
    ["openjaw-cal", key],
    { revalidate: REVALIDATE_SECONDS, tags: ["openjaw"] },
  )();
}

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
      start: sp.get("start") ?? undefined,
      end: sp.get("end") ?? undefined,
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

    const baseOpts = {
      minNights,
      maxNights,
      maxPrice: q.max_price ?? null,
      avail,
    };

    let trips;
    if (q.dest) {
      trips = await getOpenJawTrips(q.dest, origins, baseOpts);
    } else {
      const calOpts: CalendarOpenJawOptions = {
        ...baseOpts,
        start: q.start ?? null,
        end: q.end ?? null,
      };
      // Per-user availability results can't share the public cache.
      trips = avail
        ? await getOpenJawCalendarTrips(origins, calOpts)
        : await calendarSweep(origins, calOpts);
    }

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
