// ─── POST /api/groups/[id]/leave — leave a group ──────────────────────────────
// Sole member -> delete the group. Owner with co-members -> hand ownership to
// the longest-tenured remaining member, then remove myself. Plain member ->
// just remove myself.
//
// The promotion + removal are two SEQUENTIAL updateOne calls, not one
// combined { $pull, $set } update: $pull targets the whole "members" array
// path while the arrayFilter $set targets the sub-path
// "members.$[next].role" — MongoDB's update-path conflict check rejects two
// operators in the same call where one path is a prefix of the other
// ("would create a conflict at 'members'"), regardless of whether the actual
// elements touched overlap. Promotion is written FIRST so a crash between the
// two calls leaves the group with two owners transiently, never zero.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  GROUPS_COLLECTION,
  findGroupForMember,
  loadGroupsState,
  type GroupDoc,
} from "@/lib/groups";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const myId = session.user.id;
  const { id } = await params;

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const db = await getDb();
    const groups = db.collection<GroupDoc>(GROUPS_COLLECTION);
    const mine = group.members.find((m) => m.user_id === myId);

    if (group.members.length === 1) {
      await groups.deleteOne({ _id: group._id });
    } else if (mine?.role === "owner") {
      const successor = [...group.members]
        .filter((m) => m.user_id !== myId)
        .sort((a, b) => a.joined_at.getTime() - b.joined_at.getTime())[0];
      if (!successor) {
        // Unreachable: members.length > 1 guarantees another member exists.
        throw new Error("No successor found while leaving group");
      }

      await groups.updateOne(
        { _id: group._id },
        { $set: { "members.$[next].role": "owner" } },
        { arrayFilters: [{ "next.user_id": successor.user_id }] },
      );
      await groups.updateOne(
        { _id: group._id },
        { $pull: { members: { user_id: myId } } },
      );
    } else {
      await groups.updateOne(
        { _id: group._id },
        { $pull: { members: { user_id: myId } } },
      );
    }

    return NextResponse.json(await loadGroupsState(myId));
  } catch (err) {
    console.error(`[POST /api/groups/${id}/leave] failed:`, err);
    return NextResponse.json(
      { error: "Failed to leave group" },
      { status: 500 },
    );
  }
}
