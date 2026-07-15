// ─── DELETE /api/friends/[id] — unfriend or cancel an outgoing request ───────
// id = friendship _id. Covers two cases with one filter:
//   accepted + I'm either party  → unfriend
//   pending  + I'm the requester → cancel my outgoing request
// A pending RECIPIENT can't delete — they decline via PATCH /requests/[id].
// Responds with the full friends state.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  FRIENDSHIPS_COLLECTION,
  loadFriendsState,
  type FriendshipDoc,
} from "@/lib/friends";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid friendship id" },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const result = await db
      .collection<FriendshipDoc>(FRIENDSHIPS_COLLECTION)
      .deleteOne({
        _id: new ObjectId(id),
        $or: [
          {
            status: "accepted",
            $or: [{ requester_id: myId }, { recipient_id: myId }],
          },
          { status: "pending", requester_id: myId },
        ],
      });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(await loadFriendsState(myId));
  } catch (err) {
    console.error(`[DELETE /api/friends/${id}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 },
    );
  }
}
