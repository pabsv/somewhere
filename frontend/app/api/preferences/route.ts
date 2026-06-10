// ─── /api/preferences — user search preferences (session-gated) ─────────────
// GET → preferences subdoc merged over defaults (all origins, 2–10 nights…).
// PUT → validate, enforce min<=max nights, persist on the users doc.
// Preferences narrow results, never gate them. Spec: docs/DESIGN_V1.md D + A.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { PreferencesSchema, type Preferences } from "@/types/api";
import { ORIGINS } from "@/data/airports.gen";

const DEFAULTS: Preferences = {
  origins: ORIGINS.map((o) => o.code),
  trip_min_nights: 2,
  trip_max_nights: 10,
  direct_only: false,
  max_price: null,
};

// GET /api/preferences
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const user = await db
    .collection("users")
    .findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { preferences: 1 } },
    );

  const prefs: Preferences = {
    ...DEFAULTS,
    ...(user?.preferences ?? {}),
  };

  return NextResponse.json(PreferencesSchema.parse(prefs));
}

// PUT /api/preferences
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

  const parsed = PreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  const prefs = parsed.data;
  if (prefs.trip_min_nights > prefs.trip_max_nights) {
    return NextResponse.json(
      { error: "trip_min_nights must not exceed trip_max_nights" },
      { status: 400 },
    );
  }

  const db = await getDb();
  await db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { preferences: prefs } },
    );

  return NextResponse.json(PreferencesSchema.parse(prefs));
}
