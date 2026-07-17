// ─── GET /api/trips/extensions — "stay longer" variants for one trip ─────────
// Public. Query: ?from=EIN&to=BCN&outbound=YYYY-MM-DD (all required).
// → { variants: TripVariant[] } — every stored return_date for that exact
// origin + destination + outbound_date, sorted by return_date asc. The
// calendar hover filters these client-side to the user's availability window.

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ExtensionsResponseSchema } from "@/types/api";
import { getTripExtensionsData } from "@/lib/queries";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  from: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "expected a 3-letter IATA code")
    .transform((v) => v.toUpperCase()),
  to: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "expected a 3-letter IATA code")
    .transform((v) => v.toUpperCase()),
  outbound: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
});

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const parsed = QuerySchema.safeParse({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      outbound: sp.get("outbound") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", detail: z.prettifyError(parsed.error) },
        { status: 400 },
      );
    }

    const q = parsed.data;
    const data = await getTripExtensionsData(q.from, q.to, q.outbound);

    const body = ExtensionsResponseSchema.parse(data);
    return NextResponse.json(body);
  } catch (err) {
    console.error("[GET /api/trips/extensions] failed:", err);
    return NextResponse.json(
      { error: "Failed to load trip extensions" },
      { status: 500 },
    );
  }
}
