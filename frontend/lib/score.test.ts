// ─── score.ts unit assertions ────────────────────────────────────────────────
// No test framework installed — plain node:assert, runnable any time with:
//   cd frontend && npx tsx lib/score.test.ts
// Also type-checked by `tsc --noEmit`, so the examples can never drift from
// the scoreTrip signature.
//
// Tiers are now ABSOLUTE PRICE BANDS (not discount): price <= PRICE_BAND_STEAL
// (50) → "steal", <= PRICE_BAND_DEAL (100) → "deal", else "fair". The
// score/delta_pct values are still computed (dormant) and asserted below.

import assert from "node:assert/strict";
import {
  scoreTrip,
  tierForPrice,
  PRICE_BAND_STEAL,
  PRICE_BAND_DEAL,
  STEAL_SCORE_THRESHOLD,
  STEAL_PRICE_THRESHOLD,
  DEAL_SCORE_THRESHOLD,
} from "./score";

// 1. Price-band constants.
assert.equal(PRICE_BAND_STEAL, 50);
assert.equal(PRICE_BAND_DEAL, 100);

// 1b. Dormant legacy discount thresholds still exported (unused by tier).
assert.equal(STEAL_SCORE_THRESHOLD, 85);
assert.equal(STEAL_PRICE_THRESHOLD, 35);
assert.equal(DEAL_SCORE_THRESHOLD, 68);

// 1c. tierForPrice boundaries: 50 steal, 51 deal, 100 deal, 101 fair.
assert.equal(tierForPrice(0), "steal");
assert.equal(tierForPrice(50), "steal");
assert.equal(tierForPrice(51), "deal");
assert.equal(tierForPrice(100), "deal");
assert.equal(tierForPrice(101), "fair");

// 2. Very cheap fare: €38 → steal (<= 50). score/delta still computed warm.
{
  const s = scoreTrip(38, 95);
  assert.equal(s.score, 100);
  assert.ok(Math.abs((s.delta_pct as number) - -60) < 1e-9);
  assert.equal(s.deal_tier, "steal");
}

// 3. €100 exactly at the deal band ceiling → deal. score 50 / delta 0 unchanged.
{
  const s = scoreTrip(100, 100);
  assert.equal(s.score, 50);
  assert.equal(s.delta_pct, 0);
  assert.equal(s.deal_tier, "deal");
}

// 4. €86 → deal (<= 100, > 50). score still 85 but no longer drives tier.
{
  const s = scoreTrip(86, 100);
  assert.equal(s.score, 85);
  assert.equal(s.deal_tier, "deal");
}

// 5. €92.8 → deal. score 68.
{
  const s = scoreTrip(92.8, 100);
  assert.equal(s.score, 68);
  assert.equal(s.deal_tier, "deal");
}

// 6. €93.2 → deal (band-based; score 67 is irrelevant now).
{
  const s = scoreTrip(93.2, 100);
  assert.equal(s.score, 67);
  assert.equal(s.deal_tier, "deal");
}

// 7. €130 above the deal band → fair. score clamps at 0.
{
  const s = scoreTrip(130, 100);
  assert.equal(s.score, 0);
  assert.ok((s.delta_pct as number) > 0);
  assert.equal(s.deal_tier, "fair");
}

// 8. €35 → steal (<= 50). score 8 irrelevant to tier now.
{
  const s = scoreTrip(35, 30);
  assert.equal(s.score, 8);
  assert.equal(s.deal_tier, "steal");
}

// 9. Cold baseline, €30 → steal. delta_pct null when baseline cold.
{
  const s = scoreTrip(30, null);
  assert.equal(s.score, 80);
  assert.equal(s.delta_pct, null);
  assert.equal(s.deal_tier, "steal");
}

// 10. Cold baseline, €36 → steal (<= 50). score 76 unchanged.
{
  const s = scoreTrip(36, null);
  assert.equal(s.score, 76);
  assert.equal(s.deal_tier, "steal");
}

// 11. Cold baseline expensive: €150 → fair; €400 score clamps at 0.
{
  assert.equal(scoreTrip(150, null).score, 0);
  assert.equal(scoreTrip(150, null).deal_tier, "fair");
  assert.equal(scoreTrip(400, null).score, 0); // clamped, never negative
}

// 12. Free-ish flight → steal.
{
  const s = scoreTrip(0, null);
  assert.equal(s.score, 100);
  assert.equal(s.deal_tier, "steal");
}

// 13. Non-positive baseline treated as cold; €50 is at the steal ceiling → steal.
{
  const s = scoreTrip(50, 0);
  assert.equal(s.delta_pct, null);
  assert.equal(s.score, Math.round((150 - 50) / 1.5)); // 67
  assert.equal(s.deal_tier, "steal");
}

console.log("score.test.ts: all assertions passed");
