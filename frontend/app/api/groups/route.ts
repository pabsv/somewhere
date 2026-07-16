// ─── /api/groups — list my groups (GET), create a new group (POST) ───────────
// GET returns the full groups list for the signed-in user. POST creates a new
// group with me as sole owner + a fresh invite token, capped at
// MAX_GROUPS_PER_USER active memberships per user.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  GROUPS_COLLECTION,
  GroupCapReachedError,
  MAX_GROUP_NAME,
  MAX_GROUPS_PER_USER,
  generateInviteToken,
  loadGroupsState,
  withUserGroupLock,
  type GroupDoc,
} from "@/lib/groups";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await loadGroupsState(session.user.id));
  } catch (err) {
    console.error("[GET /api/groups] failed:", err);
    return NextResponse.json(
      { error: "Failed to load groups" },
      { status: 500 },
    );
  }
}

const PostBodySchema = z.object({
  name: z.string(),
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

  const name = parsed.data.name.trim();
  if (name.length < 1 || name.length > MAX_GROUP_NAME) {
    return NextResponse.json(
      { error: "Group name must be 1–40 characters" },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();
    const groups = db.collection<GroupDoc>(GROUPS_COLLECTION);

    try {
      await withUserGroupLock(myId, async (dbSession) => {
        const myGroupCount = await groups.countDocuments(
          { "members.user_id": myId },
          { session: dbSession },
        );
        if (myGroupCount >= MAX_GROUPS_PER_USER) {
          throw new GroupCapReachedError();
        }

        const now = new Date();
        await groups.insertOne(
          {
            name,
            created_by: myId,
            created_at: now,
            members: [{ user_id: myId, role: "owner", joined_at: now }],
            invite: {
              token: generateInviteToken(),
              created_by: myId,
              created_at: now,
            },
          } as GroupDoc,
          { session: dbSession },
        );
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

    return NextResponse.json(await loadGroupsState(myId), { status: 201 });
  } catch (err) {
    console.error("[POST /api/groups] failed:", err);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}
