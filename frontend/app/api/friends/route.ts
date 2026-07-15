// ─── GET /api/friends — full friends state (session-gated) ───────────────────
// → { friends, incoming, outgoing }: accepted friendships plus both pending
// directions, each row = the other user + the friendship id.
// Mutations live under /api/friends/requests and /api/friends/[id].

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadFriendsState } from "@/lib/friends";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await loadFriendsState(session.user.id));
  } catch (err) {
    console.error("[GET /api/friends] failed:", err);
    return NextResponse.json(
      { error: "Failed to load friends" },
      { status: 500 },
    );
  }
}
