// ─── Deal scoring — the ONLY place scores exist ──────────────────────────────
// Pure functions, no IO. Python computes NO deal scores (spec section B.5);
// everything is scored read-time against scrape_targets baselines.
// Spec: docs/DESIGN_V1.md section C — implemented EXACTLY:
//
//   baseline = scrape_targets[route_key].price_p50_ewma   (null when cold)
//   delta_pct = (price - baseline) / baseline * 100        (negative = below typical)
//   score: null baseline -> clamp(round((150 - price) / 1.5), 0, 100)
//          else             clamp(round(50 - delta_pct * 2.5), 0, 100)
//   deal_tier: "steal" if score >= 85 or price <= 35
//              "deal"  if score >= 68
//              "fair"  otherwise

import type { DealTier } from "@/types/api";

// ─── Tier thresholds (named constants — single source of truth) ──────────────

/** score >= this → "steal" */
export const STEAL_SCORE_THRESHOLD = 85;
/** price <= this (EUR) → "steal" regardless of score */
export const STEAL_PRICE_THRESHOLD = 35;
/** score >= this (and not a steal) → "deal" */
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

/** favourite: score >= this → promote to "steal" */
export const FAV_STEAL_SCORE_THRESHOLD = 75;
/** favourite: price <= this (EUR) → promote to "steal" regardless of score */
export const FAV_STEAL_PRICE_THRESHOLD = 50;
/** favourite: score >= this → promote to "deal" */
export const FAV_DEAL_SCORE_THRESHOLD = 55;

/**
 * Promote a trip's tier for a favourited city. Never demotes, never promotes an
 * over-MAX_DEAL_PRICE fare. Pass the trip's own score/price alongside its
 * already-computed tier.
 */
export function promoteFavouriteTier(
  tier: DealTier,
  score: number,
  price: number,
): DealTier {
  if (price > MAX_DEAL_PRICE) return tier;
  if (tier === "steal") return tier;
  if (score >= FAV_STEAL_SCORE_THRESHOLD || price <= FAV_STEAL_PRICE_THRESHOLD) {
    return "steal";
  }
  if (tier === "deal") return tier;
  if (score >= FAV_DEAL_SCORE_THRESHOLD) return "deal";
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

  // Absolute sanity gate: an expensive ticket is never a deal, no matter how
  // far below its (possibly absurd) baseline it sits.
  if (price > MAX_DEAL_PRICE) {
    return {
      score: Math.min(score, SCORE_MIDPOINT),
      delta_pct,
      deal_tier: "fair",
    };
  }

  const deal_tier: DealTier =
    score >= STEAL_SCORE_THRESHOLD || price <= STEAL_PRICE_THRESHOLD
      ? "steal"
      : score >= DEAL_SCORE_THRESHOLD
        ? "deal"
        : "fair";

  return { score, delta_pct, deal_tier };
}
