import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function DELETE() {
  const db = await getDb();

  const [flights, history, stats] = await Promise.all([
    db.collection("flights").deleteMany({}),
    db.collection("price_history").deleteMany({}),
    db.collection("route_stats").deleteMany({}),
  ]);

  return NextResponse.json({
    deleted: {
      flights: flights.deletedCount,
      price_history: history.deletedCount,
      route_stats: stats.deletedCount,
    },
  });
}
