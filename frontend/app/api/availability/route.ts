// ─── /api/availability — user date windows (session-gated) ──────────────────
// GET  → AvailabilityResponse {windows} for the session user, sorted asc.
// PUT  → replace-all: validate, reject inverted/overlapping windows, rewrite.
// Spec: docs/DESIGN_V1.md sections D + A.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  AvailabilityResponseSchema,
  DateWindowSchema,
  type DateWindow,
} from "@/types/api";

const PutBodySchema = z.object({
  windows: z.array(DateWindowSchema),
});

// GET /api/availability
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const docs = await db
    .collection("availability")
    .find({ user_id: session.user.id })
    .sort({ start_date: 1 })
    .toArray();

  const windows: DateWindow[] = docs.map((d) => ({
    start_date: d.start_date as string,
    end_date: d.end_date as string,
    ...(d.label != null ? { label: d.label as string } : {}),
  }));

  return NextResponse.json(AvailabilityResponseSchema.parse({ windows }));
}

// PUT /api/availability — replace-all
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  const windows = parsed.data.windows;

  // Reject inverted windows (end before start).
  for (const w of windows) {
    if (w.end_date < w.start_date) {
      return NextResponse.json(
        {
          error: `Window end (${w.end_date}) is before start (${w.start_date})`,
        },
        { status: 400 },
      );
    }
  }

  // Reject overlapping windows. Sort by start, then check adjacency.
  const sorted = [...windows].sort((a, b) =>
    a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0,
  );
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_date <= sorted[i - 1].end_date) {
      return NextResponse.json(
        { error: "Availability windows must not overlap" },
        { status: 400 },
      );
    }
  }

  const userId = session.user.id;
  const db = await getDb();
  await db.collection("availability").deleteMany({ user_id: userId });
  if (sorted.length > 0) {
    await db.collection("availability").insertMany(
      sorted.map((w) => ({
        user_id: userId,
        start_date: w.start_date,
        end_date: w.end_date,
        ...(w.label != null ? { label: w.label } : {}),
      })),
    );
  }

  return NextResponse.json(
    AvailabilityResponseSchema.parse({ windows: sorted }),
  );
}
