// ─── Somewhere — shared API contract ─────────────────────────────────────────
// Single source of truth for every shape that crosses a boundary:
//   Mongo doc → API handler → client.
// Imported by BOTH API route handlers and client code (lib/client.ts).
// All dates are YYYY-MM-DD strings. All timestamps are ISO strings.
// Spec: docs/DESIGN_V1.md sections B + D.

import { z } from "zod";

// ─── Primitives ──────────────────────────────────────────────────────────────

/** Calendar date as a bare YYYY-MM-DD string (never a Date object). */
export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/**
 * Timestamp field coming out of Mongo: the Python side writes BSON datetimes,
 * which the Node driver surfaces as `Date`. Coerce to ISO string; pass
 * strings through untouched.
 */
const TimestampSchema = z.union([
  z.string(),
  z.date().transform((d) => d.toISOString()),
]);

export const DealTierSchema = z.enum(["steal", "deal", "fair"]);
export type DealTier = z.infer<typeof DealTierSchema>;

export const TierSchema = z.enum(["A", "B", "C"]);
export type Tier = z.infer<typeof TierSchema>;

// ─── FlightDoc — raw Mongo document (spec section B, FlightModel v2) ─────────

export const PricePointSchema = z.object({
  p: z.number(),
  at: TimestampSchema,
});
export type PricePoint = z.infer<typeof PricePointSchema>;

/**
 * Raw flight document as written by the Python scraper.
 * Loose: unknown extra fields (e.g. `_id`) pass through silently.
 * Strict: missing REQUIRED fields fail loudly via parseFlightDoc().
 */
export const FlightDocSchema = z.looseObject({
  flight_key: z.string().min(1), // "{origin}-{dest}-{out_date}-{ret_date}"
  origin: z.string().min(1),
  destination: z.string().min(1),
  outbound_date: DateStringSchema,
  return_date: DateStringSchema,
  duration_days: z.number(),
  price: z.number(),
  currency: z.string(),
  airlines: z.array(z.string()),

  outbound_departure: z.string(),
  outbound_arrival: z.string(),
  outbound_duration: z.string(),
  outbound_stops: z.number(),
  return_departure: z.string(),
  return_arrival: z.string(),
  return_duration: z.string(),
  return_stops: z.number(),

  search_link: z.string().nullable().default(null),
  source: z.string(),
  price_points: z.array(PricePointSchema).default([]),

  first_seen_at: TimestampSchema,
  last_seen_at: TimestampSchema,
  scraped_at: TimestampSchema,
});
export type FlightDoc = z.infer<typeof FlightDocSchema>;

/**
 * Parse a raw Mongo doc into a FlightDoc.
 * Throws on invalid shape, with the offending flight_key in the message so
 * the failing doc is identifiable in logs.
 */
export function parseFlightDoc(doc: unknown): FlightDoc {
  const result = FlightDocSchema.safeParse(doc);
  if (result.success) return result.data;

  const key =
    doc !== null &&
    typeof doc === "object" &&
    "flight_key" in doc &&
    typeof (doc as Record<string, unknown>).flight_key === "string"
      ? (doc as Record<string, unknown>).flight_key
      : "<missing flight_key>";

  throw new Error(
    `Invalid flight doc [flight_key=${key}]: ${z.prettifyError(result.error)}`,
    { cause: result.error },
  );
}

// ─── Trip — scored, client-facing itinerary (spec section D) ─────────────────

export const TripLegSchema = z.object({
  dep: z.string(),
  arr: z.string(),
  duration: z.string(),
  stops: z.number(),
});
export type TripLeg = z.infer<typeof TripLegSchema>;

export const TripSchema = z.object({
  key: z.string(),
  origin: z.string(),
  destination: z.string(),
  city: z.string(),
  outbound_date: DateStringSchema,
  return_date: DateStringSchema,
  duration_days: z.number(),
  price: z.number(),
  currency: z.string(),
  airlines: z.array(z.string()),
  is_direct: z.boolean(),
  score: z.number(),
  delta_pct: z.number().nullable(),
  deal_tier: DealTierSchema,
  outbound: TripLegSchema,
  ret: TripLegSchema,
  price_points: z.array(PricePointSchema),
  search_link: z.string().nullable(),
  last_seen_at: z.string(),
});
export type Trip = z.infer<typeof TripSchema>;

// ─── TripVariant — "stay longer" alternative return dates (calendar hover) ───

export const TripVariantSchema = z.object({
  return_date: DateStringSchema,
  duration_days: z.number(),
  price: z.number(),
  deal_tier: DealTierSchema,
  delta_pct: z.number().nullable(),
  search_link: z.string().nullable(),
});
export type TripVariant = z.infer<typeof TripVariantSchema>;

export const ExtensionsResponseSchema = z.object({
  variants: z.array(TripVariantSchema),
});
export type ExtensionsResponse = z.infer<typeof ExtensionsResponseSchema>;

// ─── OnewayFareDoc — raw `oneway_fares` Mongo document (open-jaw Phase 0) ────

/**
 * One document per DIRECTED leg, written by the Python pool scheduler.
 * `prices` maps YYYY-MM-DD → cheapest one-way fare in EUR, replaced wholesale
 * each scrape. Loose: unknown extra fields (`_id`, diagnostics) pass through.
 */
export const OnewayFareDocSchema = z.looseObject({
  leg_key: z.string().min(1), // "EIN-BCN"
  origin: z.string().min(1),
  destination: z.string().min(1),
  currency: z.string(),
  prices: z.record(DateStringSchema, z.number()),
  scraped_at: TimestampSchema,
});
export type OnewayFareDoc = z.infer<typeof OnewayFareDocSchema>;

// ─── OpenJawTrip — combined one-way pair (open-jaw Phase 1) ──────────────────

/**
 * One flight leg of an open-jaw combo. Leg-based on purpose: Phase 4
 * (destination-side multi-city) extends the same shape by letting
 * `back.origin`/`out.destination` name a DIFFERENT city — no new type.
 */
export const OpenJawLegSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  date: DateStringSchema,
  /** cheapest one-way fare in EUR as of `scraped_at` on the parent trip */
  price: z.number(),
});
export type OpenJawLeg = z.infer<typeof OpenJawLegSchema>;

export const OpenJawTripSchema = z.object({
  key: z.string(), // "EIN-BCN-2026-10-03|BCN-AMS-2026-10-08"
  destination: z.string(),
  city: z.string(),
  out: OpenJawLegSchema,
  back: OpenJawLegSchema,
  /** sum of the two one-way fares — the real bookable price (two tickets) */
  total_price: z.number(),
  nights: z.number(),
  /** true when out.origin === back.origin (two singles instead of a return) */
  same_origin: z.boolean(),
  /**
   * Best stored ROUND-TRIP price for the same destination + exact dates,
   * minus total_price. Positive = the open-jaw combo is cheaper (the win
   * signal). Null when no round trip is stored for those dates.
   */
  vs_roundtrip: z.number().nullable(),
  /** older `scraped_at` of the two source grids — "prices as of" honesty */
  scraped_at: z.string(),
});
export type OpenJawTrip = z.infer<typeof OpenJawTripSchema>;

/** GET /api/openjaw */
export const OpenJawResponseSchema = z.object({
  trips: z.array(OpenJawTripSchema),
});
export type OpenJawResponse = z.infer<typeof OpenJawResponseSchema>;

// ─── CitySummary — Explore grid cell (spec section D) ────────────────────────

export const CityBestSchema = z.object({
  origin: z.string(),
  price: z.number(),
  outbound_date: DateStringSchema,
  return_date: DateStringSchema,
  duration_days: z.number(),
  nights: z.number(),
  score: z.number(),
  delta_pct: z.number().nullable(),
  deal_tier: DealTierSchema,
  airlines: z.array(z.string()),
  is_direct: z.boolean(),
  search_link: z.string().nullable(),
});
export type CityBest = z.infer<typeof CityBestSchema>;

export const CitySummarySchema = z.object({
  code: z.string(),
  name: z.string(),
  country: z.string(),
  region: z.string(),
  tier: TierSchema,
  min_price: z.number(),
  trip_count: z.number(),
  baseline: z.number().nullable(),
  best: CityBestSchema,
});
export type CitySummary = z.infer<typeof CitySummarySchema>;

// ─── Availability + preferences ──────────────────────────────────────────────

export const DateWindowSchema = z.object({
  start_date: DateStringSchema,
  end_date: DateStringSchema,
  label: z.string().nullable().optional(),
  /** Hour (5–23) the user becomes free on start_date; absent/null = all day. */
  start_time: z.number().int().min(5).max(23).nullable().optional(),
  /** Hour (1–23) the user must be back by on end_date; absent/null = all day. */
  end_time: z.number().int().min(1).max(23).nullable().optional(),
});
export type DateWindow = z.infer<typeof DateWindowSchema>;

export const PreferencesSchema = z.object({
  origins: z.array(z.string()),
  trip_min_nights: z.number(),
  trip_max_nights: z.number(),
  direct_only: z.boolean(),
  max_price: z.number().nullable(),
  /** Recurring weekly busy days, ISO 1=Mon…7=Sun (Settings → Quick setup). */
  busy_weekdays: z.array(z.number().int().min(1).max(7)).optional(),
  /** Academic calendar to overlay on calendar views (lib/university/tue.ts). */
  university: z.enum(["tue"]).nullable().optional(),
  /** Opted into deal-alert emails (feature not yet built — captured for later). */
  notify_optin: z.boolean().optional().default(false),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

// ─── Admin — pool health (spec section D, /api/admin/pool) ───────────────────

export const AdminTargetSummarySchema = z.object({
  route_key: z.string(),
  origin: z.string(),
  destination: z.string(),
  tier: TierSchema,
  enabled: z.boolean(),
  last_scraped_at: z.string().nullable(),
  next_due_at: z.string().nullable(),
  last_status: z.string().nullable(),
  last_error: z.string().nullable(),
  last_flight_count: z.number(),
  total_runs: z.number(),
  success_runs: z.number(),
  empty_runs: z.number(),
  error_runs: z.number(),
  consecutive_failures: z.number(),
  avg_price: z.number().nullable(),
  price_p50_ewma: z.number().nullable(),
  min_price_seen: z.number().nullable(),
});
export type AdminTargetSummary = z.infer<typeof AdminTargetSummarySchema>;

export const AdminPoolSummarySchema = z.object({
  tiles: z.object({
    total: z.number(),
    enabled: z.number(),
    disabled: z.number(),
    overdue: z.number(),
    never_scraped: z.number(),
    by_tier: z.record(TierSchema, z.number()),
  }),
  targets: z.array(AdminTargetSummarySchema),
});
export type AdminPoolSummary = z.infer<typeof AdminPoolSummarySchema>;

// ─── Admin — run feed (spec section D, /api/admin/runs) ──────────────────────

export const ScrapeRunSummarySchema = z.object({
  route_key: z.string(),
  origin: z.string(),
  destination: z.string(),
  tier: TierSchema,
  started_at: z.string(),
  finished_at: z.string().nullable(),
  status: z.enum(["running", "success", "empty", "error"]),
  flight_count: z.number(),
  api_calls: z.number(),
  cheapest_price: z.number().nullable(),
  error_message: z.string().nullable(),
  duration_seconds: z.number().nullable(),
});
export type ScrapeRunSummary = z.infer<typeof ScrapeRunSummarySchema>;

export const RunStats24hSchema = z.object({
  total_runs: z.number(),
  by_status: z.record(
    z.string(),
    z.object({
      count: z.number(),
      avg_duration: z.number().nullable(),
      total_flights: z.number(),
      total_api_calls: z.number(),
    }),
  ),
});
export type RunStats24h = z.infer<typeof RunStats24hSchema>;

// ─── Response envelopes (one per route in spec section D) ────────────────────

/** GET /api/cities */
export const CitiesResponseSchema = z.object({
  cities: z.array(CitySummarySchema),
  updated_at: z.string(),
});
export type CitiesResponse = z.infer<typeof CitiesResponseSchema>;

/** GET /api/cities/[code] */
export const CityDetailResponseSchema = z.object({
  city: CitySummarySchema,
  baseline: z.number().nullable(),
  trips: z.array(TripSchema),
});
export type CityDetailResponse = z.infer<typeof CityDetailResponseSchema>;

/** GET /api/trips */
export const TripsResponseSchema = z.object({
  trips: z.array(TripSchema),
  density: z.record(DateStringSchema, z.number()),
  truncated: z.boolean(),
});
export type TripsResponse = z.infer<typeof TripsResponseSchema>;

/** GET + PUT /api/availability */
export const AvailabilityResponseSchema = z.object({
  windows: z.array(DateWindowSchema),
});
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;

/**
 * GET + PUT /api/saved-cities — the user's starred destinations (IATA codes).
 * Replace-all semantics, like availability. Codes are uppercased + deduped
 * server-side; order is not significant.
 */
export const SavedCitiesResponseSchema = z.object({
  cities: z.array(z.string().min(1)),
});
export type SavedCitiesResponse = z.infer<typeof SavedCitiesResponseSchema>;

/**
 * One row in the friends UI: the OTHER user plus the friendship doc id.
 * Used for accepted friends and both pending directions.
 */
export const FriendEntrySchema = z.object({
  friendship_id: z.string(),
  user_id: z.string(),
  name: z.string(),
  email: z.string(),
  created_at: z.string(),
});
export type FriendEntry = z.infer<typeof FriendEntrySchema>;

/**
 * GET /api/friends + every friends mutation — the full friends state.
 * Mutations return this authoritative shape so the client replaces its
 * state wholesale instead of refetching.
 */
export const FriendsResponseSchema = z.object({
  friends: z.array(FriendEntrySchema),
  /** Pending requests awaiting MY accept. */
  incoming: z.array(FriendEntrySchema),
  /** Pending requests I sent, awaiting THEIR accept. */
  outgoing: z.array(FriendEntrySchema),
});
export type FriendsResponse = z.infer<typeof FriendsResponseSchema>;

/** One row in the people directory: any registered user (never self). */
export const DirectoryUserSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string(),
});
export type DirectoryUser = z.infer<typeof DirectoryUserSchema>;

/**
 * GET /api/users — every registered user except the caller. Deliberately
 * unpaginated: the user base is tiny; revisit if it ever isn't.
 */
export const UsersResponseSchema = z.object({
  users: z.array(DirectoryUserSchema),
});
export type UsersResponse = z.infer<typeof UsersResponseSchema>;

/** GET /api/admin/runs */
export const AdminRunsResponseSchema = z.object({
  runs: z.array(ScrapeRunSummarySchema),
  stats: RunStats24hSchema,
});
export type AdminRunsResponse = z.infer<typeof AdminRunsResponseSchema>;

/** POST /api/admin/wipe */
export const WipeResponseSchema = z.object({
  collection: z.literal("flights"),
  deleted: z.number(),
});
export type WipeResponse = z.infer<typeof WipeResponseSchema>;

// ─── Groups (travel crews) ────────────────────────────────────────────────

export const GroupRoleSchema = z.enum(["owner", "member"]);
export type GroupRole = z.infer<typeof GroupRoleSchema>;

export const GroupSummarySchema = z.object({
  group_id: z.string(),
  name: z.string(),
  my_role: GroupRoleSchema,
  member_count: z.number(),
  member_names: z.array(z.string()),
  created_at: z.string(),
});
export type GroupSummary = z.infer<typeof GroupSummarySchema>;

/** GET /api/groups + every list-level groups mutation (create/leave/delete). */
export const GroupsResponseSchema = z.object({
  groups: z.array(GroupSummarySchema),
});
export type GroupsResponse = z.infer<typeof GroupsResponseSchema>;

export const GroupMemberEntrySchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string(),
  role: GroupRoleSchema,
  joined_at: z.string(),
  /** false = zero availability windows -> counted as "unknown" in matching. */
  has_availability: z.boolean(),
});
export type GroupMemberEntry = z.infer<typeof GroupMemberEntrySchema>;

/** GET /api/groups/[id] + every group-scoped mutation — members-only response. */
export const GroupDetailResponseSchema = z.object({
  group_id: z.string(),
  name: z.string(),
  my_role: GroupRoleSchema,
  created_at: z.string(),
  members: z.array(GroupMemberEntrySchema),
  invite_token: z.string(),
});
export type GroupDetailResponse = z.infer<typeof GroupDetailResponseSchema>;

/** GET /api/join/[token] — public, deliberately minimal (no emails/ids). */
export const JoinInfoResponseSchema = z.object({
  group_name: z.string(),
  member_count: z.number(),
  inviter_name: z.string(),
});
export type JoinInfoResponse = z.infer<typeof JoinInfoResponseSchema>;

/** POST /api/join/[token] */
export const JoinResultSchema = z.object({
  group_id: z.string(),
  already_member: z.boolean(),
});
export type JoinResult = z.infer<typeof JoinResultSchema>;

export const GroupTripSchema = TripSchema.extend({
  /** members with >=1 availability window who fit this trip */
  free_count: z.number(),
  /** members with >=1 availability window (the denominator) */
  known_count: z.number(),
  /** members with zero availability windows — never blocks a full-group match */
  unknown_count: z.number(),
  free_user_ids: z.array(z.string()),
  full_group: z.boolean(),
});
export type GroupTrip = z.infer<typeof GroupTripSchema>;

export const SharedWindowSchema = z.object({
  start: DateStringSchema,
  end: DateStringSchema,
});
export type SharedWindow = z.infer<typeof SharedWindowSchema>;

/** GET /api/groups/[id]/trips */
export const GroupTripsResponseSchema = z.object({
  trips: z.array(GroupTripSchema),
  shared_windows: z.array(SharedWindowSchema),
  known_count: z.number(),
  unknown_count: z.number(),
  truncated: z.boolean(),
});
export type GroupTripsResponse = z.infer<typeof GroupTripsResponseSchema>;
