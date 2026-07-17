// ─── Typed client fetchers — one per API route ───────────────────────────────
// The ONLY way client components talk to /api/*. Relative paths, JSON bodies,
// session is implicit (NextAuth cookie — no X-User-ID header anywhere).
// Shapes come from types/api.ts, the shared contract with the handlers.
// Spec: docs/DESIGN_V1.md section D.

import type {
  AdminPoolSummary,
  AdminRunsResponse,
  AvailabilityResponse,
  CitiesResponse,
  CityDetailResponse,
  DateWindow,
  ExtensionsResponse,
  FriendsResponse,
  GroupDetailResponse,
  GroupsResponse,
  GroupTripsResponse,
  JoinInfoResponse,
  JoinResult,
  OpenJawResponse,
  Preferences,
  SavedCitiesResponse,
  TripsResponse,
  UsersResponse,
  WipeResponse,
} from "@/types/api";

// ─── Error type ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core request helper ─────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = `${init?.method ?? "GET"} ${path} failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      // non-JSON error body — keep the default message
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

type QueryValue = string | number | boolean | string[] | undefined;

function qs<T extends Record<string, QueryValue>>(params: T): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, QueryValue][]) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) sp.set(key, value.join(","));
    } else {
      sp.set(key, String(value));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ─── Public: cities + trips ──────────────────────────────────────────────────

// Param shapes are type aliases (not interfaces) so they satisfy the qs()
// Record constraint via implicit index signatures.
export type CitiesParams = {
  /** origin IATA codes, e.g. ["EIN","AMS"]; omit = all origins */
  from?: string[];
  /** time window filter, e.g. "all" */
  window?: string;
  /** restrict to the signed-in user's availability windows */
  avail?: boolean;
};

/** GET /api/cities */
export function getCities(params: CitiesParams = {}): Promise<CitiesResponse> {
  return request(`/api/cities${qs(params)}`);
}

/** GET /api/cities/[code] */
export function getCity(
  code: string,
  params: { from?: string[] } = {},
): Promise<CityDetailResponse> {
  return request(`/api/cities/${encodeURIComponent(code)}${qs(params)}`);
}

export type TripsParams = {
  from?: string[];
  /** YYYY-MM-DD range bounds (inclusive) */
  start?: string;
  end?: string;
  maxPrice?: number;
  minNights?: number;
  maxNights?: number;
  direct?: boolean;
  tier?: "steal" | "deal" | "fair";
  /** restrict to the signed-in user's availability windows */
  avail?: boolean;
};

/** GET /api/trips */
export function getTrips(params: TripsParams = {}): Promise<TripsResponse> {
  return request(`/api/trips${qs(params)}`);
}

export type OpenJawParams = {
  /** destination IATA code */
  dest: string;
  from?: string[];
  min_nights?: number;
  max_nights?: number;
  max_price?: number;
  /** restrict to the signed-in user's availability windows (date-level only) */
  avail?: boolean;
};

/** GET /api/openjaw — origin-side open-jaw combos for one destination */
export function getOpenJaw(params: OpenJawParams): Promise<OpenJawResponse> {
  const { dest, ...rest } = params;
  return request(`/api/openjaw${qs({ dest, ...rest })}`);
}

/** GET /api/trips/extensions — "stay longer" variants for one trip */
export function getTripExtensions(params: {
  from: string;
  to: string;
  outbound: string;
}): Promise<ExtensionsResponse> {
  return request(`/api/trips/extensions${qs(params)}`);
}

// ─── Session: availability + preferences ─────────────────────────────────────

/** GET /api/availability */
export function getAvailability(): Promise<AvailabilityResponse> {
  return request(`/api/availability`);
}

/** PUT /api/availability — replace-all semantics */
export function putAvailability(
  windows: DateWindow[],
): Promise<AvailabilityResponse> {
  return request(`/api/availability`, {
    method: "PUT",
    body: JSON.stringify({ windows }),
  });
}

/** GET /api/preferences */
export function getPreferences(): Promise<Preferences> {
  return request(`/api/preferences`);
}

/** PUT /api/preferences */
export function putPreferences(p: Preferences): Promise<Preferences> {
  return request(`/api/preferences`, {
    method: "PUT",
    body: JSON.stringify(p),
  });
}

/** GET /api/saved-cities */
export function getSavedCities(): Promise<SavedCitiesResponse> {
  return request(`/api/saved-cities`);
}

/** PUT /api/saved-cities — replace-all semantics */
export function putSavedCities(
  cities: string[],
): Promise<SavedCitiesResponse> {
  return request(`/api/saved-cities`, {
    method: "PUT",
    body: JSON.stringify({ cities }),
  });
}

// ─── Session: friends ────────────────────────────────────────────────────────
// Every mutation returns the full FriendsResponse — replace client state
// wholesale, no refetch needed.

/** GET /api/friends */
export function getFriends(): Promise<FriendsResponse> {
  return request(`/api/friends`);
}

/** GET /api/users — people directory (everyone except me) */
export function getUsers(): Promise<UsersResponse> {
  return request(`/api/users`);
}

/** POST /api/friends/requests — send a friend request by email */
export function sendFriendRequest(email: string): Promise<FriendsResponse> {
  return request(`/api/friends/requests`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** PATCH /api/friends/requests/[id] — accept or decline an incoming request */
export function respondToFriendRequest(
  id: string,
  action: "accept" | "decline",
): Promise<FriendsResponse> {
  return request(`/api/friends/requests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

/** DELETE /api/friends/[id] — unfriend, or cancel my outgoing request */
export function removeFriend(id: string): Promise<FriendsResponse> {
  return request(`/api/friends/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Session: groups ─────────────────────────────────────────────────────────
// Every mutation returns the full authoritative state (GroupsResponse or
// GroupDetailResponse) — replace client state wholesale, no refetch needed.

/** GET /api/groups */
export function getGroups(): Promise<GroupsResponse> {
  return request(`/api/groups`);
}

/** POST /api/groups — create a group */
export function createGroup(name: string): Promise<GroupsResponse> {
  return request(`/api/groups`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

/** GET /api/groups/[id] */
export function getGroup(id: string): Promise<GroupDetailResponse> {
  return request(`/api/groups/${encodeURIComponent(id)}`);
}

/** PATCH /api/groups/[id] — rename */
export function renameGroup(
  id: string,
  name: string,
): Promise<GroupDetailResponse> {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

/** DELETE /api/groups/[id] */
export function deleteGroup(id: string): Promise<GroupsResponse> {
  return request(`/api/groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** POST /api/groups/[id]/leave */
export function leaveGroup(id: string): Promise<GroupsResponse> {
  return request(`/api/groups/${encodeURIComponent(id)}/leave`, {
    method: "POST",
  });
}

/** POST /api/groups/[id]/members */
export function addGroupMember(
  id: string,
  userId: string,
): Promise<GroupDetailResponse> {
  return request(`/api/groups/${encodeURIComponent(id)}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

/** DELETE /api/groups/[id]/members/[userId] */
export function removeGroupMember(
  id: string,
  userId: string,
): Promise<GroupDetailResponse> {
  return request(
    `/api/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

/** POST /api/groups/[id]/invite — rotate the invite token */
export function rotateGroupInvite(id: string): Promise<GroupDetailResponse> {
  return request(`/api/groups/${encodeURIComponent(id)}/invite`, {
    method: "POST",
  });
}

/** GET /api/groups/[id]/trips */
export function getGroupTrips(
  id: string,
  params: { from?: string[] } = {},
): Promise<GroupTripsResponse> {
  return request(`/api/groups/${encodeURIComponent(id)}/trips${qs(params)}`);
}

/** GET /api/join/[token] — public, deliberately minimal */
export function getJoinInfo(token: string): Promise<JoinInfoResponse> {
  return request(`/api/join/${encodeURIComponent(token)}`);
}

/** POST /api/join/[token] */
export function joinGroup(token: string): Promise<JoinResult> {
  return request(`/api/join/${encodeURIComponent(token)}`, {
    method: "POST",
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/** GET /api/admin/pool */
export function adminPool(): Promise<AdminPoolSummary> {
  return request(`/api/admin/pool`);
}

/** GET /api/admin/runs */
export function adminRuns(limit?: number): Promise<AdminRunsResponse> {
  return request(`/api/admin/runs${qs({ limit })}`);
}

/** POST /api/admin/wipe — flights only by contract */
export function adminWipe(collection: "flights"): Promise<WipeResponse> {
  return request(`/api/admin/wipe`, {
    method: "POST",
    body: JSON.stringify({ collection }),
  });
}
