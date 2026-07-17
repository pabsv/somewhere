// ─── /api/onboarding — first-run wizard completion state ─────────────────────
// GET → DB-truth pending flag for the /welcome gate (source of truth, since the
// JWT can go stale between completing the wizard and the next token refresh).
// POST → mark onboarding done (finish or skip — same effect either way).

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";

// GET /api/onboarding
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
      { projection: { onboarding_pending: 1 } },
    );

  return NextResponse.json({ pending: !!user?.onboarding_pending });
}

// POST /api/onboarding — complete (finish or skip)
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  await db.collection("users").updateOne(
    { _id: new ObjectId(session.user.id) },
    {
      $set: { onboarded_at: new Date() },
      $unset: { onboarding_pending: "" },
    },
  );

  return NextResponse.json({ ok: true });
}
