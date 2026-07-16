// ─── Groups (travel crews) — server-only helpers ─────────────────────────────
// One `groups` doc per crew, with an EMBEDDED `members` array (not separate
// membership docs) — every read (list, detail, trip-matching) needs the full
// member list and groups are capped small (MAX_GROUP_MEMBERS), so there is no
// fan-out cost to justify a join collection.
//   { _id, name, created_by, created_at, members: [{ user_id, role,
//     joined_at }], invite: { token, created_by, created_at } }
// The invite is a single multi-use token embedded on the group doc, not a
// separate invites collection: rotating an invite is just overwriting
// `invite.token`, there's no expiry to track, and it's stored PLAIN (not
// hashed) because members re-copy the current link straight from the group's
// settings UI rather than treating it as a one-time secret.
// User ids are STRINGS (users._id.toString(), same convention as
// friendships/session.user.id) except where a query must defend against the
// availability collection's legacy string/ObjectId dual-key documents.

import { ObjectId, type ClientSession } from "mongodb";
import { randomBytes } from "crypto";
import clientPromise, { getDb } from "@/lib/mongodb";
import {
  GroupsResponseSchema,
  GroupDetailResponseSchema,
  type GroupsResponse,
  type GroupDetailResponse,
  type GroupSummary,
  type GroupMemberEntry,
} from "@/types/api";

export const GROUPS_COLLECTION = "groups";

export interface GroupMember {
  user_id: string;
  role: "owner" | "member";
  joined_at: Date;
}

export interface GroupDoc {
  _id: ObjectId;
  name: string;
  created_by: string;
  created_at: Date;
  members: GroupMember[];
  invite: { token: string; created_by: string; created_at: Date };
}

export const MAX_GROUP_MEMBERS = 12;
export const MAX_GROUPS_PER_USER = 20;
export const MAX_GROUP_NAME = 40;

/** Fresh multi-use invite token. Rotating an invite = overwrite, no expiry. */
export function generateInviteToken(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Thrown inside a withUserGroupLock callback to signal that MAX_GROUPS_PER_USER
 * has been reached for the locked user — callers catch this specifically to
 * return a 409, distinct from an unexpected transaction failure.
 */
export class GroupCapReachedError extends Error {
  constructor() {
    super("MAX_GROUPS_PER_USER reached");
    this.name = "GroupCapReachedError";
  }
}

const USER_GROUP_LOCKS_COLLECTION = "user_group_locks";

/**
 * Run `fn` inside a MongoDB transaction serialized per `userId` — the fix for
 * the MAX_GROUPS_PER_USER check-then-act race: every write path that can push
 * someone over the cap (create group, join via invite, added by a friend)
 * first does `groups.countDocuments(...)`, then a separate write. Two
 * concurrent requests for the SAME user (two invite links, or two friends
 * adding the same person to two different groups) can each read the same
 * stale count and both pass the check, because a plain transaction's
 * snapshot isolation only aborts on a write-write conflict on a document a
 * transaction actually wrote — it does nothing for two transactions that
 * read the same rows but write to two DIFFERENT group documents.
 *
 * Fix: every one of those write paths also writes to one shared per-user
 * "lock" document (`user_group_locks`) inside the same transaction. Two
 * concurrent transactions for the same userId then genuinely conflict on
 * that document — the loser aborts with a TransientTransactionError, which
 * `session.withTransaction` retries automatically, so the retry re-reads the
 * count fresh and correctly rejects if the winner already used up the slot.
 */
export async function withUserGroupLock<T>(
  userId: string,
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const [client, db] = await Promise.all([clientPromise, getDb()]);
  const session = client.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      await db
        .collection<{ _id: string; touched_at: Date }>(
          USER_GROUP_LOCKS_COLLECTION,
        )
        .updateOne(
          { _id: userId },
          { $set: { touched_at: new Date() } },
          { session, upsert: true },
        );
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Filter member ids down to ones with a still-existing `users` doc — mirrors
 * the orphan guard in loadGroupDetail below (member account deleted, but the
 * groups.members entry and their availability docs left behind), for callers
 * that only need the id list (e.g. trip matching) rather than full profiles.
 */
export async function filterExistingMemberIds(
  memberIds: string[],
): Promise<string[]> {
  const db = await getDb();
  const validIds = memberIds.filter((id) => ObjectId.isValid(id));
  const users = await db
    .collection("users")
    .find(
      { _id: { $in: validIds.map((id) => new ObjectId(id)) } },
      { projection: { _id: 1 } },
    )
    .toArray();
  const existing = new Set(users.map((u) => u._id.toString()));
  return memberIds.filter((id) => existing.has(id));
}

/**
 * Fetch a group ONLY if `userId` is a member. Routes must treat a null
 * result as 404, never 403 — a non-member should not learn whether the
 * group id even exists.
 */
export async function findGroupForMember(
  groupId: string,
  userId: string,
): Promise<GroupDoc | null> {
  if (!ObjectId.isValid(groupId)) return null;

  const db = await getDb();
  return db.collection<GroupDoc>(GROUPS_COLLECTION).findOne({
    _id: new ObjectId(groupId),
    "members.user_id": userId,
  });
}

/**
 * Full groups list for `userId`, shared by every /api/groups list-level
 * route so all responses have one shape. One users.find($in) across every
 * group's members to build a name lookup, instead of per-group queries.
 */
export async function loadGroupsState(userId: string): Promise<GroupsResponse> {
  const db = await getDb();

  const groups = await db
    .collection<GroupDoc>(GROUPS_COLLECTION)
    .find({ "members.user_id": userId })
    .sort({ created_at: -1 })
    .toArray();

  const memberIds = new Set<string>();
  for (const g of groups) {
    for (const m of g.members) memberIds.add(m.user_id);
  }

  const validIds = [...memberIds].filter((id) => ObjectId.isValid(id));

  // Only name — never password_hash / google_id.
  const users = await db
    .collection("users")
    .find(
      { _id: { $in: validIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1 } },
    )
    .toArray();
  const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

  const summaries: GroupSummary[] = groups.map((g) => {
    const mine = g.members.find((m) => m.user_id === userId);
    return {
      group_id: g._id.toString(),
      name: g.name,
      my_role: mine ? mine.role : "member",
      member_count: g.members.length,
      member_names: g.members
        .map((m) => nameById.get(m.user_id))
        .filter((name): name is string => typeof name === "string"),
      created_at:
        g.created_at instanceof Date
          ? g.created_at.toISOString()
          : String(g.created_at),
    };
  });

  return GroupsResponseSchema.parse({ groups: summaries });
}

/**
 * Full detail for an ALREADY-FETCHED group — the caller must have run
 * findGroupForMember first; this function does not re-check membership.
 */
export async function loadGroupDetail(
  group: GroupDoc,
  userId: string,
): Promise<GroupDetailResponse> {
  const db = await getDb();

  const memberIds = group.members.map((m) => m.user_id);
  const validIds = memberIds.filter((id) => ObjectId.isValid(id));

  // Only name + email — never password_hash / google_id.
  const users = await db
    .collection("users")
    .find(
      { _id: { $in: validIds.map((id) => new ObjectId(id)) } },
      { projection: { name: 1, email: 1 } },
    )
    .toArray();
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  // One query for every member's availability, dual-keyed the same way as
  // lib/queries.ts loadUserAvailability — legacy docs may store user_id as
  // an ObjectId instead of the current session-id string.
  const memberOids = validIds.map((id) => new ObjectId(id));
  const availDocs = await db
    .collection("availability")
    .find(
      { user_id: { $in: [...memberIds, ...memberOids] } },
      { projection: { user_id: 1 } },
    )
    .toArray();

  const hasAvailability = new Set<string>();
  for (const doc of availDocs) {
    const uid = doc.user_id;
    hasAvailability.add(uid instanceof ObjectId ? uid.toString() : String(uid));
  }

  const members: GroupMemberEntry[] = [];
  for (const m of group.members) {
    const user = userById.get(m.user_id);
    if (!user) continue; // orphan row — member account deleted

    members.push({
      user_id: m.user_id,
      name: typeof user.name === "string" ? user.name : "",
      email: typeof user.email === "string" ? user.email : "",
      role: m.role,
      joined_at:
        m.joined_at instanceof Date
          ? m.joined_at.toISOString()
          : String(m.joined_at),
      has_availability: hasAvailability.has(m.user_id),
    });
  }

  const mine = group.members.find((m) => m.user_id === userId);

  return GroupDetailResponseSchema.parse({
    group_id: group._id.toString(),
    name: group.name,
    my_role: mine ? mine.role : "member",
    created_at:
      group.created_at instanceof Date
        ? group.created_at.toISOString()
        : String(group.created_at),
    members,
    invite_token: group.invite.token,
  });
}

/** Resolve an invite token to its group, or null if it doesn't match any. */
export async function resolveInviteToken(token: string): Promise<GroupDoc | null> {
  const db = await getDb();
  return db.collection<GroupDoc>(GROUPS_COLLECTION).findOne({
    "invite.token": token,
  });
}

/**
 * Union of every member's preferred origins (deduped, upper-cased). Empty
 * union → "everything" (same convention as lib/queries.ts parseOrigins),
 * falling back to all active airport origins.
 */
export async function memberOriginsUnion(memberIds: string[]): Promise<string[]> {
  const db = await getDb();

  const validIds = memberIds.filter((id) => ObjectId.isValid(id));
  const users = await db
    .collection("users")
    .find(
      { _id: { $in: validIds.map((id) => new ObjectId(id)) } },
      { projection: { "preferences.origins": 1 } },
    )
    .toArray();

  const union = new Set<string>();
  for (const user of users) {
    const prefs = (user.preferences ?? {}) as Record<string, unknown>;
    const origins = prefs.origins;
    if (!Array.isArray(origins)) continue;
    for (const o of origins) {
      if (typeof o === "string" && o.trim()) union.add(o.trim().toUpperCase());
    }
  }

  if (union.size > 0) return [...union];

  const { ORIGINS } = await import("@/data/airports.gen");
  return ORIGINS.map((o) => o.code);
}
