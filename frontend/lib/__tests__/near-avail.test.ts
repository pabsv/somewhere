// Run: npx tsx --test lib/__tests__/near-avail.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { nearMissWindow, fitsAnyWindow } from "../avail-core";
import { isNearAvailWorthy } from "../score";

const W = (
  start: string,
  end: string,
  startTime: number | null = null,
  endTime: number | null = null,
) => ({ start, end, startTime, endTime });

const windows = [W("2026-08-10", "2026-08-15")];

test("exact fit is not a near miss (spill 0/0)", () => {
  const m = nearMissWindow("2026-08-10", "2026-08-15", windows);
  assert.deepEqual(m, { out_spill: 0, ret_spill: 0 });
  assert.ok(fitsAnyWindow("2026-08-10", "2026-08-15", windows));
});

test("leaves 1 day early → out_spill 1", () => {
  const m = nearMissWindow("2026-08-09", "2026-08-15", windows);
  assert.deepEqual(m, { out_spill: 1, ret_spill: 0 });
});

test("returns 1 day late → ret_spill 1", () => {
  const m = nearMissWindow("2026-08-10", "2026-08-16", windows);
  assert.deepEqual(m, { out_spill: 0, ret_spill: 1 });
});

test("spills both sides (total 2) → null", () => {
  assert.equal(nearMissWindow("2026-08-09", "2026-08-16", windows), null);
});

test("2 days over one side → null", () => {
  assert.equal(nearMissWindow("2026-08-10", "2026-08-17", windows), null);
  assert.equal(nearMissWindow("2026-08-08", "2026-08-15", windows), null);
});

test("edge hours skipped on the spilled side, enforced on the other", () => {
  const w = [W("2026-08-10", "2026-08-15", 17, 10)];
  // outbound spills a day → its startTime is irrelevant; return on w.end at
  // 09:00 (≤10) passes.
  assert.deepEqual(nearMissWindow("2026-08-09", "2026-08-15", w, 8, 9), {
    out_spill: 1,
    ret_spill: 0,
  });
  // same but return arrives 12:00 (>10) → the non-spilled edge hour rejects.
  assert.equal(nearMissWindow("2026-08-09", "2026-08-15", w, 8, 12), null);
  // return spills a day → endTime irrelevant, but outbound on w.start departs
  // 08:00 (<17) → rejected by the non-spilled edge hour.
  assert.equal(nearMissWindow("2026-08-10", "2026-08-16", w, 8, null), null);
  assert.deepEqual(nearMissWindow("2026-08-10", "2026-08-16", w, 19, null), {
    out_spill: 0,
    ret_spill: 1,
  });
});

test("picks the smallest-spill window when several match", () => {
  const ws = [W("2026-08-01", "2026-08-14"), W("2026-08-10", "2026-08-16")];
  // fits second window exactly
  assert.deepEqual(nearMissWindow("2026-08-10", "2026-08-15", ws), {
    out_spill: 0,
    ret_spill: 0,
  });
});

test("isNearAvailWorthy: steal tier or ≤€50", () => {
  assert.ok(isNearAvailWorthy("steal", 300));
  assert.ok(isNearAvailWorthy("fair", 49));
  assert.ok(isNearAvailWorthy("deal", 50));
  assert.ok(!isNearAvailWorthy("deal", 51));
  assert.ok(!isNearAvailWorthy("fair", 120));
});
