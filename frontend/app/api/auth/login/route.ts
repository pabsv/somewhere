import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const { name, email } = await req.json();

  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const db = await getDb();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const now = new Date();

  // Ensure unique index exists (idempotent — no-op if already present)
  await db.collection("users").createIndex({ email: 1 }, { unique: true });

  // Atomic upsert: find by email, create only if missing
  const result = await db.collection("users").findOneAndUpdate(
    { email: cleanEmail },
    {
      $setOnInsert: {
        email: cleanEmail,
        name: cleanName,
        password_hash: "",
        airports: { home: "", nearby: [] },
        notifications: { daily_digest: true, instant_alerts: true, max_price_alert: 75 },
        search_preferences: { direct_only: false },
        is_active: true,
        created_at: now,
      },
      $set: { updated_at: now },
    },
    { upsert: true, returnDocument: "after" }
  );

  const user = result!;

  return NextResponse.json({
    user_id: user._id.toString(),
    name: user.name,
    email: user.email,
  });
}
