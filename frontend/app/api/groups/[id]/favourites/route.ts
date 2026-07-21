// ─── /api/groups/[id]/favourites — the crew's shared starred destinations ────
// GET → the full group detail (favourites included).
// PUT → replace-all: sanitize (uppercase + dedupe + cap), persist on the group
//        doc under `favourites`, respond with the full group detail.
//
// Session-gated, MEMBER-gated, no role check: like rotating the invite link,
// the favourites list is a shared object of the crew, so any member may edit it
// — which a replace-all PUT implies anyway (it can't tell an add from a
// remove). findGroupForMember -> null -> 404 "Group not found", never 403: a
// non-member must not learn whether the group id exists.
//
// Concurrency: last-write-wins between two members editing simultaneously. A
// per-code $addToSet/$pull pair would be race-free but breaks the replace-all
// mirror of /api/saved-cities and the pill list's optimistic model; with <=12
// members the odds don't justify it. No withUserGroupLock — that transaction
// exists for the cross-document MAX_GROUPS_PER_USER race; a $set on one array
// in one document is already atomic.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  GROUPS_COLLECTION,
  MAX_GROUP_FAVOURITES,
  findGroupForMember,
  loadGroupDetail,
  type GroupDoc,
} from "@/lib/groups";

const PutBodySchema = z.object({
  cities: z.array(z.string()),
});

/** Uppercase, trim, drop blanks/over-long, dedupe (stable), cap length. */
function sanitize(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of codes) {
    const code = raw.trim().toUpperCase();
    if (!code || code.length > 8) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length >= MAX_GROUP_FAVOURITES) break;
  }
  return out;
}

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

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json(await loadGroupDetail(group, myId));
  } catch (err) {
    console.error(`[GET /api/groups/${id}/favourites] failed:`, err);
    return NextResponse.json(
      { error: "Failed to load group favourites" },
      { status: 500 },
    );
  }
}

export async function PUT(
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

  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: z.prettifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const group = await findGroupForMember(id, myId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const favourites = sanitize(parsed.data.cities);

    const groups = (await getDb()).collection<GroupDoc>(GROUPS_COLLECTION);
    await groups.updateOne({ _id: new ObjectId(id) }, { $set: { favourites } });

    const updated = await groups.findOne({ _id: new ObjectId(id) });
    if (!updated) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Full authoritative state, per the group-mutation convention — the client
    // replaces its GroupDetailResponse wholesale, no refetch of detail needed.
    return NextResponse.json(await loadGroupDetail(updated, myId));
  } catch (err) {
    console.error(`[PUT /api/groups/${id}/favourites] failed:`, err);
    return NextResponse.json(
      { error: "Failed to save group favourites" },
      { status: 500 },
    );
  }
}
