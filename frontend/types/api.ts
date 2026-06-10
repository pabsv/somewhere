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
});
export type DateWindow = z.infer<typeof DateWindowSchema>;

export const PreferencesSchema = z.object({
  origins: z.array(z.string()),
  trip_min_nights: z.number(),
  trip_max_nights: z.number(),
  direct_only: z.boolean(),
  max_price: z.number().nullable(),
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
