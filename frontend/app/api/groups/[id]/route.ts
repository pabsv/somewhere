// ─── /api/groups/[id] — single group: view (GET), rename (PATCH), delete ─────
// (DELETE). All three require me to be a member; rename/delete additionally
// require the "owner" role. findGroupForMember treats "not a member" as 404,
// never 403, so a non-member can't learn whether the group id even exists.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  GROUPS_COLLECTION,
  MAX_GROUP_NAME,
  findGroupForMember,
  loadGroupDetail,
  loadGroupsState,
  type GroupDoc,
} from "@/lib/groups";

export async function GET(
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
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json(await loadGroupDetail(group, myId));
  } catch (err) {
    console.error(`[GET /api/groups/${id}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to load group" },
      { status: 500 },
    );
  }
}

const PatchBodySchema = z.object({
  name: z.string(),
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
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
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

  const name = parsed.data.name.trim();
  if (name.length < 1 || name.length > MAX_GROUP_NAME) {
    return NextResponse.json(
      { error: "Group name must be 1–40 characters" },
      { status: 400 },
    );
  }

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const mine = group.members.find((m) => m.user_id === myId);
    if (mine?.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can rename this group" },
        { status: 403 },
      );
    }

    const db = await getDb();
    await db
      .collection<GroupDoc>(GROUPS_COLLECTION)
      .updateOne({ _id: group._id }, { $set: { name } });

    const updated = await findGroupForMember(id, myId);
    if (!updated) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json(await loadGroupDetail(updated, myId));
  } catch (err) {
    console.error(`[PATCH /api/groups/${id}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to rename group" },
      { status: 500 },
    );
  }
}

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
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const mine = group.members.find((m) => m.user_id === myId);
    if (mine?.role !== "owner") {
      return NextResponse.json(
        { error: "Only the owner can delete this group" },
        { status: 403 },
      );
    }

    const db = await getDb();
    await db
      .collection<GroupDoc>(GROUPS_COLLECTION)
      .deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json(await loadGroupsState(myId));
  } catch (err) {
    console.error(`[DELETE /api/groups/${id}] failed:`, err);
    return NextResponse.json(
      { error: "Failed to delete group" },
      { status: 500 },
    );
  }
}
