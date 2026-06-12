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
  Preferences,
  TripsResponse,
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
