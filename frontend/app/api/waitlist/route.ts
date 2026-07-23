// ─── POST /api/waitlist — join the expansion waitlist ────────────────────────
// Unauthenticated (landing-page form). Body { name, email, airport, website? }.
// `website` is a honeypot: real users never fill it, bots do — filled means
// silent 200 with nothing stored. Duplicate email answers 200 { already: true }
// rather than 409 so re-signups read as success to the visitor.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { clientIp, rateLimit } from "@/lib/rateLimit";

const WAITLIST_COLLECTION = "waitlist";

const PostBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  airport: z.string().trim().min(1, "Tell us your airport or city").max(100),
  website: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`waitlist:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many requests — try again in a few minutes" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    // Honeypot tripped — pretend success, store nothing.
    return NextResponse.json({ ok: true });
  }

  const { name, email, airport } = parsed.data;

  try {
    const db = await getDb();
    await db.collection(WAITLIST_COLLECTION).insertOne({
      name,
      email,
      airport,
      created_at: new Date(),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      return NextResponse.json({ ok: true, already: true });
    }
    console.error("[POST /api/waitlist] failed:", err);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
