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
import { getDestination } from "@/data/destinations.gen";

// ─── Price bands (absolute EUR round-trip — the tier source of truth) ─────────
// The app sells "very cheap flights to places", not "good discounts", so the
// tier — and therefore every bar/chip/badge colour — keys off the absolute
// round-trip price, not how far below the route baseline it sits.
//
// …but a flat band treats €56 to Tangier and €56 to Bergamo as the same thing,
// and they are not: one is 2 100 km to another continent, the other is a 1 h
// hop. The bands are therefore scaled by the destination's REACH — how much
// trip a euro buys — see REGION_REACH_MULTIPLIER below.

/** price <= this (EUR, round trip) → "steal" (very cheap → grab it) — at reach 1.0 */
export const PRICE_BAND_STEAL = 50;
/** price <= this (EUR) → "deal" (cheap); above → "fair" — at reach 1.0 */
export const PRICE_BAND_DEAL = 100;

// ─── Region reach multipliers ────────────────────────────────────────────────
// Multiplies BOTH bands (and the favourite/near-miss caps) for a destination.
// It is a REACH measure — roughly how far/how different the trip is from the
// NL/BE origin cluster — NOT the region's observed market price. Scaling by
// observed price would silently reintroduce the discount framing this app
// deliberately dropped ("cheap for Istanbul" is not the same as "cheap").
//
// Anchored on great-circle distance from Eindhoven, hand-rounded:
//   ~500–1 100 km (Germany, France, UK, Central Europe, Italy)  → 1.0
//   ~1 300–1 700 km (Iberia, Balkans, SE Europe, Nordics)       → 1.1–1.15
//   ~2 100 km (Greece)                                          → 1.3
//   ~2 100–3 300 km (Morocco/Tunisia/Egypt, Türkiye)            → 1.5
//   ~3 200–3 500 km (Levant, Caucasus)                          → 1.9–2.0
//   ~4 300–5 100 km (Cape Verde, Gulf)                          → 2.3–2.6
//
// Keys are the `region` strings in scraper/targets.py (→ destinations.gen.ts).
// Any region absent here gets DEFAULT_REACH (1.0). Tune these numbers, not the
// call sites. NOTE: this is the "we only fly this pool" approximation — once
// the pool leaves this region set, replace the table with real per-airport
// great-circle distance.
export const REGION_REACH_MULTIPLIER: Readonly<Record<string, number>> = {
  "Germany/Alps": 1.0,
  France: 1.0,
  "UK & Ireland": 1.0,
  "Central Europe": 1.0,
  Italy: 1.0,
  Iberia: 1.1,
  Balkans: 1.1,
  Nordics: 1.1,
  "SE Europe": 1.15,
  Greece: 1.3,
  "N. Africa": 1.5,
  Türkiye: 1.5,
  Levant: 1.9,
  Caucasus: 2.0,
  Atlantic: 2.3,
  Gulf: 2.6,
};

/** Reach multiplier for a destination with no region entry (core Europe). */
export const DEFAULT_REACH = 1.0;

/**
 * Reach multiplier for a destination IATA code. Unknown codes → DEFAULT_REACH,
 * so an un-exported destination can never accidentally get a looser band.
 */
export function reachMultiplier(dest?: string): number {
  if (!dest) return DEFAULT_REACH;
  const region = getDestination(dest)?.region;
  if (!region) return DEFAULT_REACH;
  return REGION_REACH_MULTIPLIER[region] ?? DEFAULT_REACH;
}

/** The reach-scaled steal/deal band edges (EUR) for a destination. */
export function bandsForDest(dest?: string): { steal: number; deal: number } {
  const m = reachMultiplier(dest);
  return { steal: PRICE_BAND_STEAL * m, deal: PRICE_BAND_DEAL * m };
}

/**
 * Reach-scaled price tier for a round-trip fare. Single source of tier truth.
 * `dest` is optional: omitting it keeps the flat €50/€100 bands, so any caller
 * without a destination in hand behaves exactly as before.
 */
export function tierForPrice(price: number, dest?: string): DealTier {
  const { steal, deal } = bandsForDest(dest);
  return price <= steal ? "steal" : price <= deal ? "deal" : "fair";
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
// DORMANT since the "± 2 days" chip: near-miss bars used to appear unasked, so
// they had to earn it by being a bargain. Now the user opts in explicitly and
// the chip means "widen my windows by up to two days", so the only price rule
// is the board's own Max € slider. Kept exported (near-avail.test.ts pins
// them) —
// restore the call in lib/queries.ts to bring the cheapness gate back.
/**
 * Round-trip €-cap for a trip that misses the user's availability window to
 * still show on the calendar as an "exception" bar. A near-miss
 * shows when it's a "steal" by tier OR at/below this absolute price — the user
 * may want to move things around for a genuine bargain.
 */
export const NEAR_AVAIL_MAX_PRICE = 50;

/**
 * DORMANT — see the note above.
 *
 * True when a trip is cheap enough to surface as a near-miss availability bar.
 * Effectively price-only: "steal" ⟺ price <= the destination's steal band ==
 * NEAR_AVAIL_MAX_PRICE × reach, so the tier clause subsumes the price clause.
 * `dest` optional — omitted keeps the flat €50 cap.
 */
export function isNearAvailWorthy(
  tier: DealTier,
  price: number,
  dest?: string,
): boolean {
  return tier === "steal" || price <= NEAR_AVAIL_MAX_PRICE * reachMultiplier(dest);
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

/**
 * Discovery-board €-cap a FAVOURITE destination gets, at reach 1.0.
 *
 * The calendar defaults to CALENDAR_DEFAULT_MAX_PRICE (€200) — a default the
 * user never chose — which silently hides a starred city priced above it. A
 * favourite is a deliberate act, so it earns the same allowance as the
 * MAX_DEAL_PRICE sanity gate. Explicit user filters (the slider, "direct only",
 * the nights range) still apply; only this default is relaxed.
 */
export const FAV_MAX_PRICE = 400;

/**
 * That cap for a specific destination, reach-scaled like every other band —
 * a favourited Dubai (reach 2.6) is a different kind of expensive from a
 * favourited Cologne, and one flat number would treat them identically.
 * Callers must still clamp the result by HARD_PRICE_CEILING.
 */
export function favMaxPriceFor(dest?: string): number {
  return FAV_MAX_PRICE * reachMultiplier(dest);
}

/** favourite: price <= this (EUR) → promote to "steal" (one band greener) — at reach 1.0 */
export const FAV_PRICE_BAND_STEAL = 75;
/** favourite: price <= this (EUR) → at least "deal" (one band greener) — at reach 1.0 */
export const FAV_PRICE_BAND_DEAL = 130;

/**
 * Promote a trip's tier for a favourited city — the relaxed price bands, so a
 * favourite reads one band greener (a "home" city worth taking slightly
 * pricier). Never demotes; never promotes an over-MAX_DEAL_PRICE fare. The
 * `_score` param is unused (tier is price-based now) but kept so the existing
 * call sites (CityCard, CityDetail, FavouritesStrip, calendar/page) need no
 * change. The favourite bands are reach-scaled by the same multiplier as the
 * base bands, so a favourited Tangier relaxes from its own band, not Europe's.
 */
export function promoteFavouriteTier(
  tier: DealTier,
  _score: number,
  price: number,
  dest?: string,
): DealTier {
  if (price > MAX_DEAL_PRICE) return tier;
  if (tier === "steal") return tier;
  const m = reachMultiplier(dest);
  if (price <= FAV_PRICE_BAND_STEAL * m) return "steal";
  if (tier === "deal") return tier;
  if (price <= FAV_PRICE_BAND_DEAL * m) return "deal";
  return tier;
}

/**
 * Score a trip price against its route baseline (price_p50_ewma).
 * `baseline` is null (or non-positive — treated as null to avoid division
 * blowups) when the route is cold; the fallback curve kicks in.
 * `dest` (IATA) reach-scales the tier bands; omitting it keeps the flat bands.
 */
export function scoreTrip(
  price: number,
  baseline: number | null,
  dest?: string,
): TripScore {
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

  // Tier = reach-scaled price band (not discount). See tierForPrice / bandsForDest.
  const deal_tier = tierForPrice(price, dest);

  return { score, delta_pct, deal_tier };
}
