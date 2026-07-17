// ─── Unit tests: lib/openjaw-core combineGrids ───────────────────────────────
// Run from frontend/: npx tsx --test lib/__tests__/openjaw-core.test.ts
// Pure-core only — no Mongo, no Next runtime.

import { test } from "node:test";
import assert from "node:assert/strict";
import { combineGrids, nightsBetween } from "../openjaw-core";

const OPTS = { minNights: 2, maxNights: 10, today: "2026-07-17" };

test("nightsBetween counts calendar days", () => {
  assert.equal(nightsBetween("2026-07-20", "2026-07-23"), 3);
  assert.equal(nightsBetween("2026-12-30", "2027-01-02"), 3); // year boundary
});

test("empty grids produce no combos", () => {
  assert.deepEqual(combineGrids({}, {}, OPTS), []);
  assert.deepEqual(combineGrids({ "2026-08-01": 40 }, {}, OPTS), []);
  assert.deepEqual(combineGrids({}, { "2026-08-05": 40 }, OPTS), []);
});

test("joins dates within min/max nights and sums prices", () => {
  const out = { "2026-08-01": 40 };
  const back = {
    "2026-08-02": 30, // 1 night — below min
    "2026-08-03": 35, // 2 nights — in
    "2026-08-11": 25, // 10 nights — in (inclusive max)
    "2026-08-12": 20, // 11 nights — above max
  };
  const combos = combineGrids(out, back, OPTS);
  assert.deepEqual(
    combos.map((c) => [c.backDate, c.nights, c.total]),
    [
      ["2026-08-03", 2, 75],
      ["2026-08-11", 10, 65],
    ],
  );
});

test("sparse grids: only overlapping-window dates pair up", () => {
  const out = { "2026-08-01": 40, "2026-09-15": 55 };
  const back = { "2026-08-05": 30, "2026-10-01": 45 }; // no back near 09-15
  const combos = combineGrids(out, back, OPTS);
  assert.equal(combos.length, 1);
  assert.equal(combos[0].outDate, "2026-08-01");
  assert.equal(combos[0].backDate, "2026-08-05");
});

test("outbound dates before today are dropped", () => {
  const out = { "2026-07-10": 15, "2026-08-01": 40 };
  const back = { "2026-07-14": 20, "2026-08-05": 30 };
  const combos = combineGrids(out, back, OPTS);
  assert.deepEqual(
    combos.map((c) => c.outDate),
    ["2026-08-01"],
  );
});

test("back date on or before out date never pairs", () => {
  const out = { "2026-08-05": 40 };
  const back = { "2026-08-03": 30, "2026-08-05": 30 };
  assert.deepEqual(combineGrids(out, back, OPTS), []);
});

test("maxPrice caps the combined total; hard ceiling always applies", () => {
  const out = { "2026-08-01": 60 };
  const back = { "2026-08-05": 45, "2026-08-06": 20 };
  const combos = combineGrids(out, back, { ...OPTS, maxPrice: 90 });
  assert.deepEqual(
    combos.map((c) => c.total),
    [80],
  );
  // No explicit maxPrice → HARD_PRICE_CEILING (700) still filters junk.
  const junk = combineGrids(
    { "2026-08-01": 600 },
    { "2026-08-05": 200 },
    OPTS,
  );
  assert.deepEqual(junk, []);
});

test("non-finite or sub-€1 leg prices are skipped", () => {
  const out = { "2026-08-01": 40, "2026-08-02": 0 };
  const back = { "2026-08-05": NaN, "2026-08-06": 30 };
  const combos = combineGrids(out, back, OPTS);
  assert.deepEqual(
    combos.map((c) => [c.outDate, c.backDate]),
    [["2026-08-01", "2026-08-06"]],
  );
});

test("minNights = 0 allows... nothing below 1 night (back must be after out)", () => {
  const out = { "2026-08-01": 40 };
  const back = { "2026-08-02": 30 };
  const combos = combineGrids(out, back, { ...OPTS, minNights: 0, maxNights: 1 });
  assert.equal(combos.length, 1);
  assert.equal(combos[0].nights, 1);
});
