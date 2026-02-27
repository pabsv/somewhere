import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const { name, email } = await req.json();

  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const db = await getDb();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  let user = await db.collection("users").findOne({ email: cleanEmail });

  if (user) {
    if (user.name !== cleanName) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { name: cleanName, updated_at: new Date() } }
      );
      user.name = cleanName;
    }
  } else {
    const now = new Date();
    const result = await db.collection("users").insertOne({
      email: cleanEmail,
      name: cleanName,
      password_hash: "",
      airports: { home: "", nearby: [] },
      notifications: { daily_digest: true, instant_alerts: true, max_price_alert: 75 },
      search_preferences: { direct_only: false },
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    user = await db.collection("users").findOne({ _id: result.insertedId });
  }

  return NextResponse.json({
    user_id: user!._id.toString(),
    name: user!.name,
    email: user!.email,
  });
}
