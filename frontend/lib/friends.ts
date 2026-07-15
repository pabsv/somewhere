// ─── Friendships — server-only helpers ───────────────────────────────────────
// One `friendships` doc per relationship (pending or accepted):
//   { requester_id, recipient_id, pair_key, status, created_at, responded_at }
// User ids are stored as STRINGS (users._id.toString(), same as
// session.user.id) — deliberately single-typed, unlike the availability
// collection's string/ObjectId dual-key legacy. `pair_key` is the sorted id
// pair, unique-indexed (see database/setup_indexes.py) so at most one live
// relationship exists per pair in either direction. Decline / cancel /
// unfriend delete the doc, so re-requesting is always possible.

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { FriendsResponseSchema, type FriendsResponse } from "@/types/api";

export const FRIENDSHIPS_COLLECTION = "friendships";

export interface FriendshipDoc {
  _id: ObjectId;
  requester_id: string;
  recipient_id: string;
  pair_key: string;
  status: "pending" | "accepted";
  created_at: Date;
  responded_at: Date | null;
}

/** Direction-independent key for a user pair. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

/**
 * Ids of all accepted friends of `userId`. Hook for future availability
 * matching (fan lib/queries.ts loadUserAvailability over these).
 */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const db = await getDb();
  const docs = await db
    .collection<FriendshipDoc>(FRIENDSHIPS_COLLECTION)
    .find(
      {
        status: "accepted",
        $or: [{ requester_id: userId }, { recipient_id: userId }],
      },
      { projection: { requester_id: 1, recipient_id: 1 } },
    )
    .toArray();

  return docs.map((d) =>
    d.requester_id === userId ? d.recipient_id : d.requester_id,
  );
}

/**
 * Full friends state for `userId`, shared by every /api/friends route so all
 * responses have one shape. Two plain queries instead of a $lookup: friendship
 * ids are strings while users._id is ObjectId, and a $toObjectId pipeline
 * would throw on any malformed id. Rows whose user doc no longer exists
 * (deleted account) are dropped.
 */
export async function loadFriendsState(
  userId: string,
): Promise<FriendsResponse> {
  const db = await getDb();

  const friendships = await db
    .collection<FriendshipDoc>(FRIENDSHIPS_COLLECTION)
    .find({ $or: [{ requester_id: userId }, { recipient_id: userId }] })
    .sort({ created_at: -1 })
    .toArray();

  const otherIds = friendships
    .map((d) => (d.requester_id === userId ? d.recipient_id : d.requester_id))
    .filter((id) => ObjectId.isValid(id));

  // Only name + email — never password_hash / google_id.
  const users = await db
    .collection("users")
    .find(
      { _id: { $in: otherIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1, email: 1 } },
    )
    .toArray();
  const byId = new Map(users.map((u) => [u._id.toString(), u]));

  const friends: FriendsResponse["friends"] = [];
  const incoming: FriendsResponse["incoming"] = [];
  const outgoing: FriendsResponse["outgoing"] = [];

  for (const doc of friendships) {
    const otherId =
      doc.requester_id === userId ? doc.recipient_id : doc.requester_id;
    const user = byId.get(otherId);
    if (!user) continue; // orphan row — counterpart account deleted

    const entry = {
      friendship_id: doc._id.toString(),
      user_id: otherId,
      name: typeof user.name === "string" ? user.name : "",
      email: typeof user.email === "string" ? user.email : "",
      created_at:
        doc.created_at instanceof Date
          ? doc.created_at.toISOString()
          : String(doc.created_at),
    };

    if (doc.status === "accepted") friends.push(entry);
    else if (doc.recipient_id === userId) incoming.push(entry);
    else outgoing.push(entry);
  }

  return FriendsResponseSchema.parse({ friends, incoming, outgoing });
}
