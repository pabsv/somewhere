// ─── /api/admin/wipe — clear the flights collection (admin only) ────────────
// Accepts only {collection:"flights"} — anything else is a 400. Re-populated
// by the scraper on the next cycle. Spec: docs/DESIGN_V1.md D+E.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { WipeResponseSchema } from "@/types/api";

const WipeBodySchema = z.object({
  collection: z.literal("flights"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = WipeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Only { collection: "flights" } is permitted' },
      { status: 400 },
    );
  }

  const db = await getDb();
  const r = await db.collection("flights").deleteMany({});

  return NextResponse.json(
    WipeResponseSchema.parse({
      collection: "flights",
      deleted: r.deletedCount,
    }),
  );
}
