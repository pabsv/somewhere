// ─── /api/join/[token] — public invite landing + join ────────────────────────
// GET is the ONLY public (non-session-gated) groups route: resolves an invite
// token to a minimal preview so an unauthenticated visitor can see what
// they're about to join. POST is session-gated and actually adds the caller
// to the group; re-clicking your OWN group's invite link is a success
// (already_member: true), not an error.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  GROUPS_COLLECTION,
  GroupCapReachedError,
  MAX_GROUP_MEMBERS,
  MAX_GROUPS_PER_USER,
  resolveInviteToken,
  withUserGroupLock,
  type GroupDoc,
} from "@/lib/groups";
import { JoinInfoResponseSchema, JoinResultSchema } from "@/types/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const group = await resolveInviteToken(token);
    if (!group) {
      return NextResponse.json(
        { error: "This invite link is no longer valid" },
        { status: 404 },
      );
    }

    let inviter_name = "";
    if (ObjectId.isValid(group.invite.created_by)) {
      const db = await getDb();
      const inviter = await db
        .collection("users")
        .findOne(
          { _id: new ObjectId(group.invite.created_by) },
          { projection: { name: 1 } },
        );
      if (inviter && typeof inviter.name === "string") {
        inviter_name = inviter.name;
      }
    }

    return NextResponse.json(
      JoinInfoResponseSchema.parse({
        group_name: group.name,
        member_count: group.members.length,
        inviter_name,
      }),
    );
  } catch (err) {
    console.error(`[GET /api/join/${token}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to load invite" },
      { status: 500 },
    );
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;

  const { token } = await params;

  try {
    const group = await resolveInviteToken(token);
    if (!group) {
      return NextResponse.json(
        { error: "This invite link is no longer valid" },
        { status: 404 },
      );
    }

    // Re-clicking your OWN group's invite link is a success, not an error.
    if (group.members.some((m) => m.user_id === myId)) {
      return NextResponse.json(
        JoinResultSchema.parse({
          group_id: group._id.toString(),
          already_member: true,
        }),
      );
    }

    const db = await getDb();
    const groups = db.collection<GroupDoc>(GROUPS_COLLECTION);

    // The per-group $push guard below (dedupe + MAX_GROUP_MEMBERS cap) is a
    // single atomic update, safe against concurrent joins of THIS group. My
    // own MAX_GROUPS_PER_USER cap is different: it's checked via a count over
    // OTHER group documents too, so it's wrapped in withUserGroupLock (see
    // lib/groups.ts) to stay safe against concurrent joins via two different
    // invite links.
    let pushMatched = false;
    try {
      await withUserGroupLock(myId, async (dbSession) => {
        const myGroupCount = await groups.countDocuments(
          { "members.user_id": myId },
          { session: dbSession },
        );
        if (myGroupCount >= MAX_GROUPS_PER_USER) {
          throw new GroupCapReachedError();
        }

        const result = await groups.updateOne(
          {
            _id: group._id,
            "members.user_id": { $ne: myId },
            [`members.${MAX_GROUP_MEMBERS - 1}`]: { $exists: false },
          },
          {
            $push: {
              members: { user_id: myId, role: "member", joined_at: new Date() },
            },
          },
          { session: dbSession },
        );
        pushMatched = result.matchedCount > 0;
      });
    } catch (err) {
      if (err instanceof GroupCapReachedError) {
        return NextResponse.json(
          { error: "You're in too many groups already" },
          { status: 409 },
        );
      }
      throw err;
    }

    if (!pushMatched) {
      // Ambiguous without a re-check: either the cap filter failed (group is
      // genuinely full) or a concurrent request already added me (the
      // already-member race). Only the latter is a success.
      const nowMember = await groups.findOne(
        { _id: group._id, "members.user_id": myId },
        { projection: { _id: 1 } },
      );
      if (nowMember) {
        return NextResponse.json(
          JoinResultSchema.parse({
            group_id: group._id.toString(),
            already_member: true,
          }),
        );
      }
      return NextResponse.json(
        { error: "This group is full" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      JoinResultSchema.parse({
        group_id: group._id.toString(),
        already_member: false,
      }),
    );
  } catch (err) {
    console.error(`[POST /api/join/${token}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to join group" },
      { status: 500 },
    );
  }
}
