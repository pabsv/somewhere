import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing X-User-ID" }, { status: 401 });

  try {
    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

    return NextResponse.json({
      user_id: user._id.toString(),
      name: user.name,
      email: user.email,
    });
  } catch {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 401 });
  }
}
