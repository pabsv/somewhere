// ─── /api/admin/users — read-only people rollup (admin only) ─────────────────
// One pass over users + groups + friendships + availability, assembled into
// { tiles, users, groups }. Role re-checked server-side (defense in depth).
//
// SECURITY: full user docs are loaded so we can DERIVE has_password /
// has_google, but the raw password_hash / google_id are NEVER emitted — only
// the booleans. Mirrors the name/email-only projection convention elsewhere.
//
// The `availability` collection has the string/ObjectId dual-key legacy (see
// lib/queries.ts loadUserAvailability): user_id may be a session-id STRING
// (current PUT route) or a legacy ObjectId. We bucket by user_id.toString().

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  AdminUsersResponseSchema,
  type AdminUser,
  type AdminFriendRef,
  type AdminGroup,
  type AdminGroupTrip,
  type AdminUserGroup,
  type DateWindow,
  type GroupRole,
} from "@/types/api";

const USER_CAP = 1000;

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

/** Normalize a Mongo date field (BSON Date or string) → YYYY-MM-DD, or null. */
function toDateStr(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") {
    const m = v.match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  }
  return null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function toMs(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v !== "string") return null;
  const parsed = Date.parse(v);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Latest valid timestamp as a canonical ISO string. */
function latestIso(values: unknown[]): string | null {
  let latest: number | null = null;
  for (const value of values) {
    const ms = toMs(value);
    if (ms != null && (latest == null || ms > latest)) latest = ms;
  }
  return latest == null ? null : new Date(latest).toISOString();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object"
    ? (v as Record<string, unknown>)
    : null;
}

function idString(v: unknown): string | null {
  if (v instanceof ObjectId) return v.toString();
  if (typeof v !== "string") return null;
  const value = v.trim();
  return value ? value : null;
}

function nonNegativeInt(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

/**
 * Groups do not currently have a separate planned-trips write path. Accept a
 * small embedded shape when a stored document already supplies one, and skip
 * malformed entries instead of manufacturing data from the live deal feed.
 */
function parseEmbeddedTrip(v: unknown): AdminGroupTrip | null {
  const trip = asRecord(v);
  if (!trip) return null;

  const rawCode = trip.code ?? trip.destination;
  const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
  const start = toDateStr(trip.start ?? trip.start_date);
  const end = toDateStr(trip.end ?? trip.end_date);
  const addedBy = idString(trip.added_by ?? trip.by);

  if (!code || code.length > 8 || !start || !end || end < start || !addedBy) {
    return null;
  }
  return { code, start, end, added_by: addedBy };
}

interface GroupMemberRaw {
  user_id: string;
  role: GroupRole;
  joined_at?: unknown;
}
interface GroupInviteRaw {
  created_at?: unknown;
}
interface GroupRaw {
  _id: ObjectId;
  name?: string;
  created_by?: string;
  created_at?: unknown;
  updated_at?: unknown;
  last_active_at?: unknown;
  last_activity_at?: unknown;
  members?: GroupMemberRaw[];
  invite?: GroupInviteRaw;
  favourites?: unknown;
  trips?: unknown;
  trip_count?: unknown;
  activity?: unknown;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();

  const [userDocs, groupDocs, friendDocs, availDocs] = await Promise.all([
    db.collection("users").find({}).limit(USER_CAP).toArray(),
    db.collection("groups").find({}).sort({ created_at: -1 }).toArray(),
    db
      .collection("friendships")
      .find(
        { status: "accepted" },
        { projection: { requester_id: 1, recipient_id: 1 } },
      )
      .toArray(),
    db
      .collection("availability")
      .find(
        {},
        {
          projection: {
            user_id: 1,
            start_date: 1,
            end_date: 1,
            label: 1,
            start_time: 1,
            end_time: 1,
          },
        },
      )
      .toArray(),
  ]);

  // ── name/email lookup for every user ──────────────────────────────────────
  const nameById = new Map<string, string>();
  const emailById = new Map<string, string>();
  for (const u of userDocs) {
    const id = u._id.toString();
    nameById.set(id, typeof u.name === "string" ? u.name : "");
    emailById.set(id, typeof u.email === "string" ? u.email : "");
  }

  // ── availability windows bucketed by user (dual-key) ──────────────────────
  const availByUser = new Map<string, DateWindow[]>();
  for (const doc of availDocs) {
    const uid =
      doc.user_id instanceof ObjectId
        ? doc.user_id.toString()
        : String(doc.user_id);
    const start = toDateStr(doc.start_date);
    const end = toDateStr(doc.end_date);
    if (!start || !end) continue;
    const win: DateWindow = {
      start_date: start,
      end_date: end,
      label: typeof doc.label === "string" ? doc.label : null,
      start_time: typeof doc.start_time === "number" ? doc.start_time : null,
      end_time: typeof doc.end_time === "number" ? doc.end_time : null,
    };
    const arr = availByUser.get(uid);
    if (arr) arr.push(win);
    else availByUser.set(uid, [win]);
  }

  // ── friends bucketed by user (ids are strings) ────────────────────────────
  const friendIdsByUser = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    const set = friendIdsByUser.get(a);
    if (set) set.add(b);
    else friendIdsByUser.set(a, new Set([b]));
  };
  for (const f of friendDocs) {
    const a = String(f.requester_id);
    const b = String(f.recipient_id);
    if (!a || !b) continue;
    link(a, b);
    link(b, a);
  }

  // ── group memberships bucketed by user ────────────────────────────────────
  const groupsByUser = new Map<string, AdminUserGroup[]>();
  const groups: AdminGroup[] = [];
  for (const g of groupDocs as unknown as GroupRaw[]) {
    const gid = g._id.toString();
    const gname = typeof g.name === "string" ? g.name : "";
    const members = Array.isArray(g.members) ? g.members : [];
    const rawTrips = Array.isArray(g.trips) ? g.trips : [];
    const trips = rawTrips
      .map(parseEmbeddedTrip)
      .filter((trip): trip is AdminGroupTrip => trip !== null);
    const activity = asRecord(g.activity);
    const storedTripCount = nonNegativeInt(
      g.trip_count ?? activity?.trip_count,
    );
    const tripCount = Math.max(trips.length, storedTripCount ?? 0);

    const favouriteCodes = Array.isArray(g.favourites)
      ? g.favourites
          .filter((code): code is string => typeof code === "string")
          .map((code) => code.trim().toUpperCase())
          .filter((code) => code.length > 0 && code.length <= 8)
      : [];
    const sharedFavouritesCount = new Set(favouriteCodes).size;

    const tripActivityTimes = rawTrips.flatMap((rawTrip) => {
      const trip = asRecord(rawTrip);
      return trip
        ? [trip.updated_at, trip.added_at, trip.created_at]
        : [];
    });
    const lastActiveAt = latestIso([
      g.last_active_at,
      g.last_activity_at,
      activity?.last_active_at,
      activity?.last_activity_at,
      g.updated_at,
      activity?.updated_at,
      ...tripActivityTimes,
      ...members.map((m) => m.joined_at),
      g.invite?.created_at,
      g.created_at,
    ]);

    const owner = members.find((m) => m.role === "owner");
    const ownerName =
      (owner && nameById.get(owner.user_id)) ||
      (g.created_by && nameById.get(g.created_by)) ||
      "—";

    groups.push({
      group_id: gid,
      name: gname,
      owner_name: ownerName,
      member_count: members.length,
      created_at: toIso(g.created_at),
      last_active_at: lastActiveAt,
      trip_count: tripCount,
      trips,
      shared_favourites_count: sharedFavouritesCount,
      members: members.map((m) => ({
        user_id: m.user_id,
        name: nameById.get(m.user_id) ?? "",
        role: m.role,
      })),
    });

    for (const m of members) {
      const entry: AdminUserGroup = {
        group_id: gid,
        name: gname,
        my_role: m.role,
      };
      const arr = groupsByUser.get(m.user_id);
      if (arr) arr.push(entry);
      else groupsByUser.set(m.user_id, [entry]);
    }
  }

  // ── assemble per-user rollup ──────────────────────────────────────────────
  const users: AdminUser[] = userDocs.map((u) => {
    const id = u._id.toString();
    const prefs = (u.preferences ?? {}) as Record<string, unknown>;

    const friendIds = friendIdsByUser.get(id);
    const friends: AdminFriendRef[] = friendIds
      ? [...friendIds]
          .filter((fid) => nameById.has(fid)) // drop deleted accounts
          .map((fid) => ({
            user_id: fid,
            name: nameById.get(fid) ?? "",
            email: emailById.get(fid) ?? "",
          }))
      : [];

    const windows = availByUser.get(id) ?? [];
    const savedCities = Array.isArray(u.saved_cities)
      ? u.saved_cities.filter((c: unknown): c is string => typeof c === "string")
      : [];

    return {
      id,
      name: typeof u.name === "string" ? u.name : "",
      email: typeof u.email === "string" ? u.email : "",
      role: typeof u.role === "string" ? u.role : "user",
      has_password: typeof u.password_hash === "string" && u.password_hash.length > 0,
      has_google: typeof u.google_id === "string" && u.google_id.length > 0,
      created_at: toIso(u.created_at),
      onboarded: u.onboarding_pending !== true,
      onboarded_at: toIso(u.onboarded_at),
      preferences: {
        origins: Array.isArray(prefs.origins)
          ? prefs.origins.filter((o): o is string => typeof o === "string")
          : [],
        trip_min_nights: numOrNull(prefs.trip_min_nights),
        trip_max_nights: numOrNull(prefs.trip_max_nights),
        direct_only: prefs.direct_only === true,
        max_price: numOrNull(prefs.max_price),
        busy_weekdays: Array.isArray(prefs.busy_weekdays)
          ? prefs.busy_weekdays.filter((d): d is number => typeof d === "number")
          : [],
        university: typeof prefs.university === "string" ? prefs.university : null,
        notify_optin: prefs.notify_optin === true,
      },
      saved_cities: savedCities,
      friend_count: friends.length,
      friends,
      availability_window_count: windows.length,
      availability: windows,
      groups: groupsByUser.get(id) ?? [],
    };
  });

  users.sort((a, b) => a.name.localeCompare(b.name));

  const tiles = {
    total_users: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    onboarded: users.filter((u) => u.onboarded).length,
    with_availability: users.filter((u) => u.availability_window_count > 0).length,
    with_favourites: users.filter((u) => u.saved_cities.length > 0).length,
    in_a_group: users.filter((u) => u.groups.length > 0).length,
    total_groups: groups.length,
    accepted_friendships: friendDocs.length,
  };

  const body = AdminUsersResponseSchema.parse({ tiles, users, groups });
  return NextResponse.json(body);
}
