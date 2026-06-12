// ─── /api/availability — user date windows (session-gated) ──────────────────
// GET  → AvailabilityResponse {windows} for the session user, sorted asc.
// PUT  → replace-all: validate, reject inverted/overlapping windows, rewrite.
// Spec: docs/DESIGN_V1.md sections D + A.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
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
  // Legacy docs store user_id as ObjectId and dates as Date; current PUT
  // writes session-id strings and YYYY-MM-DD strings. Read both.
  const ids: unknown[] = [session.user.id];
  try {
    ids.push(new ObjectId(session.user.id));
  } catch {
    // non-ObjectId session id — string match only
  }
  const docs = await db
    .collection("availability")
    .find({ user_id: { $in: ids } })
    .sort({ start_date: 1 })
    .toArray();

  const toDateStr = (v: unknown): string | null => {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "string") {
      const m = v.match(/^\d{4}-\d{2}-\d{2}/);
      return m ? m[0] : null;
    }
    return null;
  };

  const windows: DateWindow[] = [];
  for (const d of docs) {
    const start = toDateStr(d.start_date);
    const end = toDateStr(d.end_date);
    if (start && end)
      windows.push({
        start_date: start,
        end_date: end,
        ...(d.label != null ? { label: d.label as string } : {}),
      });
  }

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
  // Replace-all must also clear legacy docs keyed by ObjectId.
  const delIds: unknown[] = [userId];
  try {
    delIds.push(new ObjectId(userId));
  } catch {
    // non-ObjectId session id — string match only
  }
  await db
    .collection("availability")
    .deleteMany({ user_id: { $in: delIds } });
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
