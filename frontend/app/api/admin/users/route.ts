import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  const docs = await db.collection("users").find({}).toArray();

  const users = docs.map((u) => ({
    id: u._id.toString(),
    name: u.name ?? "",
    email: u.email ?? "",
    is_active: u.is_active ?? true,
    created_at: u.created_at instanceof Date ? u.created_at.toISOString() : null,
    airports: {
      home: u.airports?.home ?? "",
      nearby: u.airports?.nearby ?? [],
    },
  }));

  return NextResponse.json({ users, total: users.length });
}
