// ─── /api/saved-cities — user's starred destinations (session-gated) ────────
// GET → the session user's saved IATA codes + grouped country selections.
// PUT → replace-all: sanitize (uppercase + dedupe + cap), persist on the
//        users doc under `saved_cities` / `saved_countries`. Cities remain the
//        focus points used by Explore + Calendar; countries only preserve the
//        editable grouping intent in this picker.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { SavedCitiesResponseSchema } from "@/types/api";

// Cap to keep the array bounded; codes are short IATA strings.
const MAX_SAVED = 500;

const PutBodySchema = z.object({
  cities: z.array(z.string()),
  countries: z.array(z.string()).optional().default([]),
});

/** Uppercase, trim, drop blanks/over-long, dedupe (stable), cap length. */
function sanitize(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of codes) {
    const code = raw.trim().toUpperCase();
    if (!code || code.length > 8) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length >= MAX_SAVED) break;
  }
  return out;
}

// GET /api/saved-cities
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
      { projection: { saved_cities: 1, saved_countries: 1 } },
    );

  const stored = Array.isArray(user?.saved_cities)
    ? (user!.saved_cities as unknown[]).filter(
        (c): c is string => typeof c === "string",
      )
    : [];
  const storedCountries = Array.isArray(user?.saved_countries)
    ? (user!.saved_countries as unknown[]).filter(
        (c): c is string => typeof c === "string",
      )
    : [];

  return NextResponse.json(
    SavedCitiesResponseSchema.parse({
      cities: sanitize(stored),
      countries: sanitize(storedCountries),
    }),
  );
}

// PUT /api/saved-cities — replace-all
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

  const cities = sanitize(parsed.data.cities);
  const countries = sanitize(parsed.data.countries);

  const db = await getDb();
  await db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { saved_cities: cities, saved_countries: countries } },
    );

  return NextResponse.json(
    SavedCitiesResponseSchema.parse({ cities, countries }),
  );
}
