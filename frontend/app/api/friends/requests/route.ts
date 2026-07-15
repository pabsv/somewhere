// ─── POST /api/friends/requests — send a friend request by email ─────────────
// Body { email }. Looks up the target user (emails are stored lowercased),
// creates a pending friendship, or auto-accepts if the target already
// requested me. Responds with the full friends state.
// 404 on unknown email reveals whether an account exists — acceptable
// tradeoff for a small personal app; the alternative (silent success) makes
// typos undebuggable.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  FRIENDSHIPS_COLLECTION,
  loadFriendsState,
  pairKey,
  type FriendshipDoc,
} from "@/lib/friends";

const PostBodySchema = z.object({
  email: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    const db = await getDb();

    const target = await db
      .collection("users")
      .findOne({ email }, { projection: { _id: 1 } });
    if (!target) {
      return NextResponse.json(
        { error: "No user with that email" },
        { status: 404 },
      );
    }

    const targetId = target._id.toString();
    if (targetId === myId) {
      return NextResponse.json(
        { error: "You can't add yourself" },
        { status: 400 },
      );
    }

    const friendships = db.collection<FriendshipDoc>(FRIENDSHIPS_COLLECTION);
    const key = pairKey(myId, targetId);
    const existing = await friendships.findOne({ pair_key: key });

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Already friends" }, { status: 409 });
      }
      if (existing.requester_id === myId) {
        return NextResponse.json(
          { error: "Request already sent" },
          { status: 409 },
        );
      }
      // They already requested me — both want it, auto-accept.
      await friendships.updateOne(
        { _id: existing._id, status: "pending" },
        { $set: { status: "accepted", responded_at: new Date() } },
      );
      return NextResponse.json(await loadFriendsState(myId));
    }

    try {
      await friendships.insertOne({
        requester_id: myId,
        recipient_id: targetId,
        pair_key: key,
        status: "pending",
        created_at: new Date(),
        responded_at: null,
      } as FriendshipDoc);
    } catch (err) {
      // Race: concurrent request for the same pair hit the unique pair_key index.
      if (
        err &&
        typeof err === "object" &&
        (err as { code?: number }).code === 11000
      ) {
        return NextResponse.json(
          { error: "Request already exists" },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json(await loadFriendsState(myId), { status: 201 });
  } catch (err) {
    console.error("[POST /api/friends/requests] failed:", err);
    return NextResponse.json(
      { error: "Failed to send request" },
      { status: 500 },
    );
  }
}
