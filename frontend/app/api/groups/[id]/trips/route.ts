// ─── GET /api/groups/[id]/trips — group trip matching ────────────────────────
// Session-gated. findGroupForMember(id, myId) -> null -> 404 "Group not found".
// Query ?from= (comma-separated origin codes) overrides the default, which is
// the union of every member's preferred origins. Delegates the actual
// matching (fan availability over members, rank by free-count) to
// lib/queries.ts getGroupTripsData.

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  filterExistingMemberIds,
  findGroupForMember,
  memberOriginsUnion,
} from "@/lib/groups";
import { getGroupTripsData, parseOrigins } from "@/lib/queries";
import { GroupTripsResponseSchema } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
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

    // Drop orphan rows (member account deleted, groups.members entry and
    // their availability docs left behind) — same guard loadGroupDetail
    // already applies to the member list, so counts here stay reconcilable
    // against what the group's members UI shows.
    const memberIds = await filterExistingMemberIds(
      group.members.map((m) => m.user_id),
    );

    const fromParam = req.nextUrl.searchParams.get("from");
    const origins = fromParam
      ? parseOrigins(fromParam)
      : await memberOriginsUnion(memberIds);

    // The crew's shared favourites ride along on the group doc we already
    // fetched — zero extra queries.
    const data = await getGroupTripsData(
      memberIds,
      origins,
      group.favourites ?? [],
    );

    const body = GroupTripsResponseSchema.parse(data);
    return NextResponse.json(body);
  } catch (err) {
    console.error(`[GET /api/groups/${id}/trips] failed:`, err);
    return NextResponse.json(
      { error: "Failed to load group trips" },
      { status: 500 },
    );
  }
}
