// ─── POST /api/groups/[id]/members — add a friend to a group ─────────────────
// Session-gated. Body { user_id }. findGroupForMember(id, myId) -> null -> 404
// "Group not found" (I must be a member to add someone). Target must be one of
// MY accepted friends (availability stays private — you can only vouch for
// people you're already connected to). Target's own MAX_GROUPS_PER_USER is
// enforced via withUserGroupLock (see lib/groups.ts) so a concurrent add of
// the same target into a different group can't push them over the cap; the
// $push itself is a separate atomic guard (dedupe + MAX_GROUP_MEMBERS cap) so
// concurrent adds into THIS group can't overshoot either. Responds with the
// full group detail.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import { getAcceptedFriendIds } from "@/lib/friends";
import {
  GROUPS_COLLECTION,
  GroupCapReachedError,
  MAX_GROUP_MEMBERS,
  MAX_GROUPS_PER_USER,
  findGroupForMember,
  loadGroupDetail,
  withUserGroupLock,
  type GroupDoc,
} from "@/lib/groups";

const PostBodySchema = z.object({
  user_id: z.string(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;

  const { id } = await params;

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
  const targetId = parsed.data.user_id;

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const friendIds = await getAcceptedFriendIds(myId);
    if (!friendIds.includes(targetId)) {
      return NextResponse.json(
        { error: "You can only add your friends" },
        { status: 403 },
      );
    }

    const groups = (await getDb()).collection<GroupDoc>(GROUPS_COLLECTION);

    let pushMatched = false;
    try {
      await withUserGroupLock(targetId, async (dbSession) => {
        const targetGroupCount = await groups.countDocuments(
          { "members.user_id": targetId },
          { session: dbSession },
        );
        if (targetGroupCount >= MAX_GROUPS_PER_USER) {
          throw new GroupCapReachedError();
        }

        const res = await groups.updateOne(
          {
            _id: new ObjectId(id),
            "members.user_id": { $ne: targetId },
            [`members.${MAX_GROUP_MEMBERS - 1}`]: { $exists: false },
          },
          {
            $push: {
              members: { user_id: targetId, role: "member", joined_at: new Date() },
            },
          },
          { session: dbSession },
        );
        pushMatched = res.matchedCount > 0;
      });
    } catch (err) {
      if (err instanceof GroupCapReachedError) {
        return NextResponse.json(
          { error: "That person is in too many groups already" },
          { status: 409 },
        );
      }
      throw err;
    }

    if (!pushMatched) {
      const fresh = await groups.findOne({ _id: new ObjectId(id) });
      const already = fresh?.members?.some((m) => m.user_id === targetId);
      return NextResponse.json(
        { error: already ? "Already in this group" : "Group is full" },
        { status: 409 },
      );
    }

    const updated = await groups.findOne({ _id: new ObjectId(id) });
    if (!updated) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(await loadGroupDetail(updated, myId));
  } catch (err) {
    console.error(`[POST /api/groups/${id}/members] failed:`, err);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 },
    );
  }
}
