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

  const deal_tier: DealTier =
    score >= STEAL_SCORE_THRESHOLD || price <= STEAL_PRICE_THRESHOLD
      ? "steal"
      : score >= DEAL_SCORE_THRESHOLD
        ? "deal"
        : "fair";

  return { score, delta_pct, deal_tier };
}
