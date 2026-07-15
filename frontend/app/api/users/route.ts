// ─── GET /api/users — people directory (session-gated) ───────────────────────
// Every registered user except the caller, name + email only (never
// password_hash / google_id). Unpaginated by design: user base is tiny and
// the Friends page filters client-side. The 500 cap is a safety valve —
// revisit with search-on-server + pagination if it's ever hit.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { UsersResponseSchema } from "@/types/api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getDb();
    const docs = await db
      .collection("users")
      .find({}, { projection: { name: 1, email: 1 } })
      .sort({ name: 1 })
      .limit(500)
      .toArray();

    const users = docs
      .filter((u) => u._id.toString() !== session.user.id)
      .map((u) => ({
        user_id: u._id.toString(),
        name: typeof u.name === "string" ? u.name : "",
        email: typeof u.email === "string" ? u.email : "",
      }));

    return NextResponse.json(UsersResponseSchema.parse({ users }));
  } catch (err) {
    console.error("[GET /api/users] failed:", err);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 },
    );
  }
}
