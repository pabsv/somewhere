// ─── POST /api/groups/[id]/invite — rotate the group's shared invite link ────
// Session-gated. Any member (not owner-only — rotating the shared link is a
// per-product-spec action any member can take). findGroupForMember(id, myId)
// -> null -> 404 "Group not found". Overwrites the embedded invite (fresh
// token, no expiry to track). Responds with the full group detail.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  GROUPS_COLLECTION,
  findGroupForMember,
  generateInviteToken,
  loadGroupDetail,
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

    const groups = (await getDb()).collection<GroupDoc>(GROUPS_COLLECTION);
    await groups.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          invite: {
            token: generateInviteToken(),
            created_by: myId,
            created_at: new Date(),
          },
        },
      },
    );

    const updated = await groups.findOne({ _id: new ObjectId(id) });
    if (!updated) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(await loadGroupDetail(updated, myId));
  } catch (err) {
    console.error(`[POST /api/groups/${id}/invite] failed:`, err);
    return NextResponse.json(
      { error: "Failed to rotate invite link" },
      { status: 500 },
    );
  }
}
