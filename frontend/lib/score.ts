// ─── Deal scoring — the ONLY place scores exist ──────────────────────────────
// Pure functions, no IO. Python computes NO deal scores (spec section B.5);
// everything is scored read-time against scrape_targets baselines.
// Spec: docs/DESIGN_V1.md section C — implemented EXACTLY:
//
//   baseline = scrape_targets[route_key].price_p50_ewma   (null when cold)
//   delta_pct = (price - baseline) / baseline * 100        (negative = below typical)
//   score: null baseline -> clamp(round((150 - price) / 1.5), 0, 100)
//          else             clamp(round(50 - delta_pct * 2.5), 0, 100)
//   deal_tier: absolute PRICE bands (not discount) —
//              "steal" if price <= PRICE_BAND_STEAL (very cheap)
//              "deal"  if price <= PRICE_BAND_DEAL  (cheap)
//              "fair"  otherwise
//   (score/delta_pct are still computed but no longer drive the tier —
//    dormant, kept so discount-based tiers can be revived in one edit.)

import type { DealTier } from "@/types/api";

// ─── Price bands (absolute EUR round-trip — the tier source of truth) ─────────
// The app sells "very cheap flights to places", not "good discounts", so the
// tier — and therefore every bar/chip/badge colour — keys off the absolute
// round-trip price, not how far below the route baseline it sits.

/** price <= this (EUR, round trip) → "steal" (very cheap → grab it) */
export const PRICE_BAND_STEAL = 50;
/** price <= this (EUR) → "deal" (cheap); above → "fair" */
export const PRICE_BAND_DEAL = 100;

/** Absolute-price tier for a round-trip fare. Single source of tier truth. */
export function tierForPrice(price: number): DealTier {
  return price <= PRICE_BAND_STEAL
    ? "steal"
    : price <= PRICE_BAND_DEAL
      ? "deal"
      : "fair";
}

// ─── Legacy discount-score thresholds (DORMANT) ──────────────────────────────
// No longer drive the tier (bands do). Kept exported so score.test.ts imports
// and any future discount-tier revival keep working. `score`/`delta_pct` are
// still computed against these ideas but only for potential future use.

/** DORMANT — was: score >= this → "steal" */
export const STEAL_SCORE_THRESHOLD = 85;
/** DORMANT — was: price <= this (EUR) → "steal" regardless of score */
export const STEAL_PRICE_THRESHOLD = 35;
/** DORMANT — was: score >= this (and not a steal) → "deal" */
export const DEAL_SCORE_THRESHOLD = 68;
/**
 * price > this (EUR) → never "steal"/"deal", score capped at the midpoint.
 * Guards against routes where Google only returns absurd multi-leg fares
 * (e.g. €2985 BRU→OSR): the EWMA baseline is equally absurd, so a relative
 * delta can look like "30% below typical" on a €2000+ ticket.
 */
export const MAX_DEAL_PRICE = 400;
/**
 * price > this (EUR) → not a real option for this app at all; read queries
 * exclude such fares entirely (they're routing artifacts, not trips).
 */
export const HARD_PRICE_CEILING = 700;
/**
 * Default calendar price cap (EUR, round trip). Within this app's short-haul
 * Europe/N.Africa/Levant pool, a >€200 round trip is never interesting — it
 * only clutters the calendar. Users can still type a higher "Max €" to see
 * everything; an empty field means this default, not "no cap".
 */
export const CALENDAR_DEFAULT_MAX_PRICE = 200;

// ─── Near-miss availability (calendar exception bars) ────────────────────────
/**
 * Round-trip €-cap for a trip that misses the user's availability window by
 * one day to still show on the calendar as an "exception" bar. A near-miss
 * shows when it's a "steal" by tier OR at/below this absolute price — the user
 * may want to move things around for a genuine bargain.
 */
export const NEAR_AVAIL_MAX_PRICE = 50;

/**
 * True when a trip is cheap enough to surface as a ±1-day availability miss.
 * Now effectively price-only: "steal" ⟺ price <= PRICE_BAND_STEAL (50) ==
 * NEAR_AVAIL_MAX_PRICE, so the tier clause is subsumed by the price clause.
 */
export function isNearAvailWorthy(tier: DealTier, price: number): boolean {
  return tier === "steal" || price <= NEAR_AVAIL_MAX_PRICE;
}

// ─── Ground-competitive destinations (train/Flixbus beats the flight) ────────
/**
 * Round-trip €-cap for destinations close enough to the NL/BE origin cluster
 * that a train or Flixbus is a real alternative. On the discovery boards these
 * only surface when the WHOLE round trip is at or below this price; above it the
 * ground option wins and a flight there is just clutter. Berlin/Frankfurt/etc.
 * still appear — but only when genuinely cheap (the user's "take it if it's a
 * steal" rule). Tune this one number to loosen/tighten the gate.
 */
export const GROUND_COMPETITIVE_MAX_PRICE = 100;

/**
 * Destination IATA codes that are train/bus-competitive from Eindhoven:
 * all of Germany (the neighbour — always a Flixbus/ICE alternative),
 * Luxembourg, and the northern-France airports (Paris + Lille). Southern
 * France (Nice, Marseille, Bordeaux, Corsica…) is a genuine flight and stays
 * uncapped. Switzerland/UK deliberately excluded (Alps trips / Channel).
 */
export const GROUND_COMPETITIVE_CODES: ReadonlySet<string> = new Set([
  // Germany
  "BER", "MUC", "FRA", "HAM", "STR", "HAJ", "NUE",
  "LEJ", "DRS", "BRE", "FMM", "FKB", "FMO",
  // Luxembourg
  "LUX",
  // Northern France — rail-competitive
  "CDG", "ORY", "BVA", "LIL",
]);

/** True when a destination is close enough that ground travel competes. */
export function isGroundCompetitive(code: string): boolean {
  return GROUND_COMPETITIVE_CODES.has(code);
}

// Fallback-score curve when the route baseline is cold (null).
const FALLBACK_PRICE_CEILING = 150;
const FALLBACK_PRICE_DIVISOR = 1.5;
// Each 1% below typical is worth 2.5 score points around the 50 midpoint.
const DELTA_WEIGHT = 2.5;
const SCORE_MIDPOINT = 50;

export interface TripScore {
  /** 0–100, higher = better deal */
  score: number;
  /** % vs typical route price; negative = below typical; null when baseline cold */
  delta_pct: number | null;
  deal_tier: DealTier;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ─── Favourite (starred city) relaxed tiers ──────────────────────────────────
// A favourited destination is one the user *wants* — a place they'd take on a
// merely-good fare, or a "home" they'll fly to whenever it's cheap and they're
// free. So we relax the tier gates for favourites: a "deal" reads as a "steal",
// a "fair" reads as a "deal". Purely a display-time promotion — the underlying
// score/delta are unchanged and this never runs server-side (favourites are
// per-user). The MAX_DEAL_PRICE sanity gate still applies: an expensive ticket
// is never promoted, however far below its (possibly absurd) baseline it sits.

/** favourite: price <= this (EUR) → promote to "steal" (one band greener) */
export const FAV_PRICE_BAND_STEAL = 75;
/** favourite: price <= this (EUR) → at least "deal" (one band greener) */
export const FAV_PRICE_BAND_DEAL = 130;

/**
 * Promote a trip's tier for a favourited city — the relaxed price bands, so a
 * favourite reads one band greener (a "home" city worth taking slightly
 * pricier). Never demotes; never promotes an over-MAX_DEAL_PRICE fare. The
 * `_score` param is unused (tier is price-based now) but kept so the existing
 * call sites (CityCard, CityDetail, FavouritesStrip, calendar/page) need no
 * change.
 */
export function promoteFavouriteTier(
  tier: DealTier,
  _score: number,
  price: number,
): DealTier {
  if (price > MAX_DEAL_PRICE) return tier;
  if (tier === "steal") return tier;
  if (price <= FAV_PRICE_BAND_STEAL) return "steal";
  if (tier === "deal") return tier;
  if (price <= FAV_PRICE_BAND_DEAL) return "deal";
  return tier;
}

/**
 * Score a trip price against its route baseline (price_p50_ewma).
 * `baseline` is null (or non-positive — treated as null to avoid division
 * blowups) when the route is cold; the fallback curve kicks in.
 */
export function scoreTrip(price: number, baseline: number | null): TripScore {
  let score: number;
  let delta_pct: number | null;

  if (baseline === null || baseline <= 0) {
    delta_pct = null;
    score = clamp(
      Math.round((FALLBACK_PRICE_CEILING - price) / FALLBACK_PRICE_DIVISOR),
      0,
      100,
    );
  } else {
    delta_pct = ((price - baseline) / baseline) * 100;
    score = clamp(Math.round(SCORE_MIDPOINT - delta_pct * DELTA_WEIGHT), 0, 100);
  }

  // Absolute sanity gate: caps the (now display-dormant) `score` for absurd
  // multi-leg fares. Tier-redundant since price > MAX_DEAL_PRICE > PRICE_BAND_DEAL
  // is already "fair", but kept to keep `score` sane for any future revival.
  if (price > MAX_DEAL_PRICE) {
    return {
      score: Math.min(score, SCORE_MIDPOINT),
      delta_pct,
      deal_tier: "fair",
    };
  }

  // Tier = absolute price band (not discount). See tierForPrice / PRICE_BAND_*.
  const deal_tier = tierForPrice(price);

  return { score, delta_pct, deal_tier };
}
