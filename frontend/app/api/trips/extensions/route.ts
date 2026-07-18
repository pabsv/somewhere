// ─── GET /api/trips/extensions — trip-stretch variants for one trip ──────────
// Public. Query: ?from=EIN&to=BCN&outbound=YYYY-MM-DD&return=YYYY-MM-DD
// (all required) + optional win_start/win_end (the availability window the
// client wants the stretch clamped to — both or neither).
// → { variants: StretchVariant[] } — leave-earlier / return-later /
// full-window candidates, hybrid-priced (exact stored round trips win, one-way
// grid sums fill gaps as `estimated`).

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ExtensionsResponseSchema } from "@/types/api";
import { getTripStretchData } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const QuerySchema = z
  .object({
    from: z
      .string()
      .regex(/^[A-Za-z]{3}$/, "expected a 3-letter IATA code")
      .transform((v) => v.toUpperCase()),
    to: z
      .string()
      .regex(/^[A-Za-z]{3}$/, "expected a 3-letter IATA code")
      .transform((v) => v.toUpperCase()),
    outbound: DateParam,
    return: DateParam,
    win_start: DateParam.optional(),
    win_end: DateParam.optional(),
  })
  .refine(
    (q) =>
      q.win_start == null || q.win_end == null || q.win_start <= q.win_end,
    { message: "win_start must be <= win_end" },
  );

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const parsed = QuerySchema.safeParse({
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      outbound: sp.get("outbound") ?? undefined,
      return: sp.get("return") ?? undefined,
      win_start: sp.get("win_start") ?? undefined,
      win_end: sp.get("win_end") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", detail: z.prettifyError(parsed.error) },
        { status: 400 },
      );
    }

    const q = parsed.data;
    // a lone win bound is meaningless — use the pair only when complete
    const hasWin = q.win_start != null && q.win_end != null;
    const data = await getTripStretchData(
      q.from,
      q.to,
      q.outbound,
      q.return,
      hasWin ? q.win_start : undefined,
      hasWin ? q.win_end : undefined,
    );

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
