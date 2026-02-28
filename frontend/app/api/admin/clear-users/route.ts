import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function DELETE() {
  const db = await getDb();

  const [users, availability, destinations] = await Promise.all([
    db.collection("users").deleteMany({}),
    db.collection("availability").deleteMany({}),
    db.collection("destination_preferences").deleteMany({}),
  ]);

  return NextResponse.json({
    deleted: {
      users: users.deletedCount,
      availability: availability.deletedCount,
      destination_preferences: destinations.deletedCount,
    },
  });
}
