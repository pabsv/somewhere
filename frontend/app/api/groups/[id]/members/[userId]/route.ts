// ─── DELETE /api/groups/[id]/members/[userId] — owner removes a member ───────
// Session-gated. findGroupForMember(id, myId) -> null -> 404 "Group not found".
// Only the group owner may remove OTHER members — removing yourself goes
// through a separate leave flow, not this route. Responds with the full
// group detail.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  GROUPS_COLLECTION,
  findGroupForMember,
  loadGroupDetail,
  type GroupDoc,
} from "@/lib/groups";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;

  const { id, userId } = await params;

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const mine = group.members.find((m) => m.user_id === myId);
    if (mine?.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can remove members" },
        { status: 403 },
      );
    }

    if (userId === myId) {
      return NextResponse.json(
        { error: "Use leave to remove yourself" },
        { status: 400 },
      );
    }

    const target = group.members.find((m) => m.user_id === userId);
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const groups = (await getDb()).collection<GroupDoc>(GROUPS_COLLECTION);
    await groups.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { members: { user_id: userId } } },
    );

    const updated = await groups.findOne({ _id: new ObjectId(id) });
    if (!updated) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(await loadGroupDetail(updated, myId));
  } catch (err) {
    console.error(`[DELETE /api/groups/${id}/members/${userId}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 },
    );
  }
}
