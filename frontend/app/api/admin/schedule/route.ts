import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  const docs = await db.collection("schedule_state")
    .find({}, { projection: { _id: 0 } })
    .sort({ origin: 1 })
    .toArray();

  // Serialize datetime fields to ISO strings with Z suffix (same as Python repo)
  const states = docs.map((doc) => {
    const out: Record<string, unknown> = { ...doc };
    for (const key of ["last_run_at", "finished_at", "next_run_at"]) {
      if (out[key] instanceof Date) {
        out[key] = (out[key] as Date).toISOString().replace(/(\.\d+)?Z?$/, "") + "Z";
      }
    }
    return out;
  });

  return NextResponse.json({ states });
}
