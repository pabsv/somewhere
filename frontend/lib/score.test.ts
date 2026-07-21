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
  bandsForDest,
  reachMultiplier,
  promoteFavouriteTier,
  isNearAvailWorthy,
  DEFAULT_REACH,
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

// 1d. Reach multipliers: unknown/absent dest and core-Europe regions are 1.0;
// far regions scale the bands up.
assert.equal(reachMultiplier(undefined), DEFAULT_REACH);
assert.equal(reachMultiplier("ZZZ"), DEFAULT_REACH); // not in the catalog
assert.equal(reachMultiplier("BGY"), 1.0); // Italy
assert.equal(reachMultiplier("BCN"), 1.1); // Iberia
assert.equal(reachMultiplier("TNG"), 1.5); // N. Africa
assert.equal(reachMultiplier("IST"), 1.5); // Türkiye
assert.equal(reachMultiplier("TLV"), 1.9); // Levant
assert.equal(reachMultiplier("DXB"), 2.6); // Gulf

// 1e. Bands scale with reach.
assert.deepEqual(bandsForDest("BGY"), { steal: 50, deal: 100 });
assert.deepEqual(bandsForDest("TNG"), { steal: 75, deal: 150 });

// 1f. The motivating case: €56 EIN→TNG is a steal (2 100 km, band €75) while
// the same €56 to Bergamo (1 h hop, band €50) is only a deal.
assert.equal(tierForPrice(56, "TNG"), "steal");
assert.equal(tierForPrice(56, "BGY"), "deal");
assert.equal(tierForPrice(76, "TNG"), "deal");
assert.equal(tierForPrice(151, "TNG"), "fair");

// 1g. scoreTrip threads dest through to the tier; omitting it keeps flat bands.
assert.equal(scoreTrip(56, 120, "TNG").deal_tier, "steal");
assert.equal(scoreTrip(56, 120).deal_tier, "deal");
// The absolute MAX_DEAL_PRICE sanity gate still wins over any reach scaling.
assert.equal(scoreTrip(401, 900, "DXB").deal_tier, "fair");

// 1h. Favourite promotion and the near-miss cap use the same reach scaling.
assert.equal(promoteFavouriteTier("deal", 0, 110, "TNG"), "steal"); // 75 × 1.5
assert.equal(promoteFavouriteTier("deal", 0, 110, "BGY"), "deal"); // > 75
assert.ok(isNearAvailWorthy("fair", 70, "TNG")); // 50 × 1.5 = 75
assert.ok(!isNearAvailWorthy("fair", 70, "BGY"));

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
