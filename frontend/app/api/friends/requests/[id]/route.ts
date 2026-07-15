// ─── PATCH /api/friends/requests/[id] — respond to an incoming request ───────
// Body { action: "accept" | "decline" }. Only the RECIPIENT of a pending
// request may respond; accept flips status, decline deletes the doc (so the
// requester can re-send later). Missing / not-pending / not-mine all return
// the same 404 to avoid leaking which check failed. Responds with the full
// friends state.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  FRIENDSHIPS_COLLECTION,
  loadFriendsState,
  type FriendshipDoc,
} from "@/lib/friends";

const PatchBodySchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const friendships = db.collection<FriendshipDoc>(FRIENDSHIPS_COLLECTION);

    const filter = {
      _id: new ObjectId(id),
      status: "pending" as const,
      recipient_id: myId,
    };

    const result =
      parsed.data.action === "accept"
        ? await friendships.updateOne(filter, {
            $set: { status: "accepted", responded_at: new Date() },
          })
        : await friendships.deleteOne(filter);

    const touched =
      "modifiedCount" in result ? result.modifiedCount : result.deletedCount;
    if (touched === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(await loadFriendsState(myId));
  } catch (err) {
    console.error(`[PATCH /api/friends/requests/${id}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to respond to request" },
      { status: 500 },
    );
  }
}
