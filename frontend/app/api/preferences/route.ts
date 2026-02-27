import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

function getUserId(req: NextRequest): string | null {
  return req.headers.get("x-user-id");
}

// GET /api/preferences
export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Missing X-User-ID" }, { status: 401 });

  try {
    const db = await getDb();
    const oid = new ObjectId(userId);

    const user = await db.collection("users").findOne({ _id: oid });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const now = new Date();
    const availDocs = await db.collection("availability")
      .find({ user_id: oid, is_active: true, end_date: { $gte: now } })
      .sort({ start_date: 1 })
      .toArray();

    const destDocs = await db.collection("destination_preferences")
      .find({ user_id: oid, is_active: true })
      .toArray();

    return NextResponse.json({
      home_airport: user.airports?.home ?? "",
      nearby_airports: user.airports?.nearby ?? [],
      destinations: destDocs.map((d) => d.destination_code),
      availability: availDocs.map((w) => ({
        start: w.start_date.toISOString().slice(0, 10),
        end: w.end_date.toISOString().slice(0, 10),
        label: w.label || null,
      })),
      max_price: user.notifications?.max_price_alert ?? 75,
      direct_only: user.search_preferences?.direct_only ?? false,
    });
  } catch {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 401 });
  }
}

// PUT /api/preferences
export async function PUT(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Missing X-User-ID" }, { status: 401 });

  try {
    const db = await getDb();
    const oid = new ObjectId(userId);
    const prefs = await req.json();
    const now = new Date();

    // Update user document
    await db.collection("users").updateOne(
      { _id: oid },
      {
        $set: {
          "airports.home": prefs.home_airport,
          "airports.nearby": prefs.nearby_airports,
          "search_preferences.direct_only": prefs.direct_only,
          "notifications.max_price_alert": prefs.max_price,
          updated_at: now,
        },
      }
    );

    // Replace availability windows
    await db.collection("availability").deleteMany({ user_id: oid });
    if (prefs.availability?.length > 0) {
      await db.collection("availability").insertMany(
        prefs.availability.map((w: { start: string; end: string; label?: string }) => ({
          user_id: oid,
          start_date: new Date(w.start),
          end_date: new Date(w.end),
          label: w.label ?? "",
          is_active: true,
          created_at: now,
          updated_at: now,
        }))
      );
    }

    // Replace destination preferences
    await db.collection("destination_preferences").deleteMany({ user_id: oid });
    if (prefs.destinations?.length > 0) {
      await db.collection("destination_preferences").insertMany(
        prefs.destinations.map((code: string) => ({
          user_id: oid,
          destination_code: code.toUpperCase(),
          destination_name: "",
          priority: 2,
          max_price: null,
          is_active: true,
          created_at: now,
          updated_at: now,
        }))
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 401 });
  }
}
