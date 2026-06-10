// ─── score.ts unit assertions ────────────────────────────────────────────────
// No test framework installed — plain node:assert, runnable any time with:
//   cd frontend && npx tsx lib/score.test.ts
// Also type-checked by `tsc --noEmit`, so the examples can never drift from
// the scoreTrip signature.

import assert from "node:assert/strict";
import {
  scoreTrip,
  STEAL_SCORE_THRESHOLD,
  STEAL_PRICE_THRESHOLD,
  DEAL_SCORE_THRESHOLD,
} from "./score";

// 1. Threshold constants match spec section C exactly.
assert.equal(STEAL_SCORE_THRESHOLD, 85);
assert.equal(STEAL_PRICE_THRESHOLD, 35);
assert.equal(DEAL_SCORE_THRESHOLD, 68);

// 2. Warm baseline, way below typical: €38 vs €95 baseline.
//    delta = -60%, raw score 50 + 150 = 200 → clamped 100 → steal.
{
  const s = scoreTrip(38, 95);
  assert.equal(s.score, 100);
  assert.ok(Math.abs((s.delta_pct as number) - -60) < 1e-9);
  assert.equal(s.deal_tier, "steal");
}

// 3. Price exactly at baseline: delta 0, score 50, fair.
{
  const s = scoreTrip(100, 100);
  assert.equal(s.score, 50);
  assert.equal(s.delta_pct, 0);
  assert.equal(s.deal_tier, "fair");
}

// 4. Steal boundary by score: 14% below baseline → score exactly 85 → steal.
{
  const s = scoreTrip(86, 100);
  assert.equal(s.score, 85);
  assert.equal(s.deal_tier, "steal");
}

// 5. Deal boundary by score: 7.2% below baseline → score exactly 68 → deal.
{
  const s = scoreTrip(92.8, 100);
  assert.equal(s.score, 68);
  assert.equal(s.deal_tier, "deal");
}

// 6. Just under deal boundary: 6.8% below → score 67 → fair.
{
  const s = scoreTrip(93.2, 100);
  assert.equal(s.score, 67);
  assert.equal(s.deal_tier, "fair");
}

// 7. Above typical clamps at 0 — "never red", just no badge (fair).
{
  const s = scoreTrip(130, 100);
  assert.equal(s.score, 0);
  assert.ok((s.delta_pct as number) > 0);
  assert.equal(s.deal_tier, "fair");
}

// 8. Price-floor steal overrides a bad score: €35 vs cheap €30 baseline.
//    delta ≈ +16.7%, score 8 — but price <= 35 forces steal.
{
  const s = scoreTrip(35, 30);
  assert.equal(s.score, 8);
  assert.equal(s.deal_tier, "steal");
}

// 9. Cold baseline fallback: €30 → round((150-30)/1.5) = 80; score < 85 but
//    price <= 35 → steal. delta_pct is null when baseline is cold.
{
  const s = scoreTrip(30, null);
  assert.equal(s.score, 80);
  assert.equal(s.delta_pct, null);
  assert.equal(s.deal_tier, "steal");
}

// 10. Cold baseline mid price: €36 → round(114/1.5) = 76 → deal (not steal:
//     76 < 85 and 36 > 35).
{
  const s = scoreTrip(36, null);
  assert.equal(s.score, 76);
  assert.equal(s.deal_tier, "deal");
}

// 11. Cold baseline expensive: €150 → score 0, fair; beyond ceiling clamps.
{
  assert.equal(scoreTrip(150, null).score, 0);
  assert.equal(scoreTrip(150, null).deal_tier, "fair");
  assert.equal(scoreTrip(400, null).score, 0); // clamped, never negative
}

// 12. Cold baseline free-ish flight clamps at 100.
{
  const s = scoreTrip(0, null);
  assert.equal(s.score, 100);
  assert.equal(s.deal_tier, "steal");
}

// 13. Non-positive baseline is treated as cold (no division blowup).
{
  const s = scoreTrip(50, 0);
  assert.equal(s.delta_pct, null);
  assert.equal(s.score, Math.round((150 - 50) / 1.5)); // 67 → fair
  assert.equal(s.deal_tier, "fair");
}

console.log("score.test.ts: all assertions passed");
