// Run: npx tsx --test lib/__tests__/railLayout.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COLLAPSE_H,
  COLLAPSE_MIN,
  MONTH_H,
  ROW_H,
  buildRailLayout,
  enumerateDays,
  rankLanesByPrice,
  spanBox,
} from "../railLayout";

test("enumerateDays is inclusive on both ends and crosses months", () => {
  assert.deepEqual(enumerateDays("2026-08-30", "2026-09-02"), [
    "2026-08-30",
    "2026-08-31",
    "2026-09-01",
    "2026-09-02",
  ]);
  assert.equal(enumerateDays("2026-08-01", "2026-08-01").length, 1);
});

test("with nothing collapsible, every day is one ROW_H row under its month band", () => {
  const days = enumerateDays("2026-08-01", "2026-08-10");
  const layout = buildRailLayout(days, new Set(days));
  assert.equal(layout.rows.length, 10);
  assert.equal(layout.collapses.length, 0);
  assert.equal(layout.bands.length, 1);
  assert.equal(layout.bands[0].label, "August 2026");
  assert.equal(layout.bands[0].top, 0);
  assert.equal(layout.height, MONTH_H + 10 * ROW_H);
  assert.equal(layout.offsets.get("2026-08-01"), MONTH_H);
  assert.equal(layout.offsets.get("2026-08-10"), MONTH_H + 9 * ROW_H);
});

test("each month opens its own band, and it never shares a row with a day", () => {
  const days = enumerateDays("2026-08-29", "2026-09-02");
  const layout = buildRailLayout(days, new Set(days));
  assert.deepEqual(
    layout.bands.map((b) => b.label),
    ["August 2026", "September 2026"],
  );
  // Aug 29,30,31 then the September band then Sep 1,2
  assert.equal(layout.offsets.get("2026-08-31"), MONTH_H + 2 * ROW_H);
  assert.equal(layout.bands[1].top, MONTH_H + 3 * ROW_H);
  assert.equal(layout.offsets.get("2026-09-01"), 2 * MONTH_H + 3 * ROW_H);
  // no row's top collides with a band's row
  const bandTops = new Set(layout.bands.map((b) => b.top));
  for (const r of layout.rows) assert.ok(!bandTops.has(r.top));
});

test("a collapsed run that swallows the 1st still gets its month band", () => {
  const days = enumerateDays("2026-08-25", "2026-09-10");
  const keep = new Set(["2026-08-25", "2026-09-08", "2026-09-09", "2026-09-10"]);
  const layout = buildRailLayout(days, keep);
  assert.deepEqual(
    layout.bands.map((b) => b.month),
    ["2026-08", "2026-09"],
  );
  // the September band opens on the first September day that survives
  assert.equal(layout.bands[1].top + MONTH_H, layout.offsets.get("2026-09-08"));
});

test("a run of >= COLLAPSE_MIN unkept days folds into one collapse row", () => {
  const days = enumerateDays("2026-08-01", "2026-08-12");
  // keep the first two and the last two; the 8 in between are empty
  const keep = new Set([
    "2026-08-01", "2026-08-02", "2026-08-11", "2026-08-12",
  ]);
  const layout = buildRailLayout(days, keep);
  assert.equal(layout.rows.length, 4);
  assert.equal(layout.collapses.length, 1);
  assert.deepEqual(
    { from: layout.collapses[0].from, to: layout.collapses[0].to, days: layout.collapses[0].days },
    { from: "2026-08-03", to: "2026-08-10", days: 8 },
  );
  assert.equal(layout.height, MONTH_H + 4 * ROW_H + COLLAPSE_H);
  // the day after the collapse sits below it
  assert.equal(layout.offsets.get("2026-08-11"), MONTH_H + 2 * ROW_H + COLLAPSE_H);
});

test("a run shorter than COLLAPSE_MIN is never collapsed", () => {
  const days = enumerateDays("2026-08-01", "2026-08-10");
  const gap = COLLAPSE_MIN - 1;
  const keep = new Set(days.filter((_, i) => i === 0 || i > gap));
  const layout = buildRailLayout(days, keep);
  assert.equal(layout.collapses.length, 0);
  assert.equal(layout.rows.length, days.length);
});

test("collapse:false disables folding entirely", () => {
  const days = enumerateDays("2026-08-01", "2026-08-20");
  const layout = buildRailLayout(days, new Set(), { collapse: false });
  assert.equal(layout.collapses.length, 0);
  assert.equal(layout.height, MONTH_H + 20 * ROW_H);
});

test("spanBox height is (nights + 1) rows and clamps at the rail edges", () => {
  const days = enumerateDays("2026-08-01", "2026-08-31");
  const layout = buildRailLayout(days, new Set(days));

  const inside = spanBox(layout, "2026-08-05", "2026-08-12", "2026-08-01", "2026-08-31");
  assert.ok(inside);
  assert.equal(inside.top, MONTH_H + 4 * ROW_H);
  assert.equal(inside.height, 8 * ROW_H); // 7 nights → 8 day rows
  assert.equal(inside.clippedStart, false);
  assert.equal(inside.clippedEnd, false);

  const crossing = spanBox(layout, "2026-08-28", "2026-09-04", "2026-08-01", "2026-08-31");
  assert.ok(crossing);
  assert.equal(crossing.clippedEnd, true);
  assert.equal(crossing.height, 4 * ROW_H); // 28,29,30,31

  const before = spanBox(layout, "2026-07-30", "2026-08-02", "2026-08-01", "2026-08-31");
  assert.ok(before);
  assert.equal(before.clippedStart, true);
  assert.equal(before.top, MONTH_H);
});

test("spanBox returns null when both ends fall inside a collapsed run", () => {
  const days = enumerateDays("2026-08-01", "2026-08-20");
  const keep = new Set(["2026-08-01", "2026-08-20"]);
  const layout = buildRailLayout(days, keep);
  assert.equal(
    spanBox(layout, "2026-08-05", "2026-08-09", "2026-08-01", "2026-08-20"),
    null,
  );
});

test("rankLanesByPrice puts the globally cheapest trip in lane 0", () => {
  const lanes = new Map([
    ["dear", 0],
    ["mid", 1],
    ["cheap", 2],
  ]);
  const prices = new Map([
    ["dear", 180],
    ["mid", 90],
    ["cheap", 30],
  ]);
  const ranked = rankLanesByPrice(lanes, prices);
  assert.equal(ranked.get("cheap"), 0);
  assert.equal(ranked.get("mid"), 1);
  assert.equal(ranked.get("dear"), 2);
});

test("rankLanesByPrice is a whole-lane permutation (collision-preserving)", () => {
  // two trips share lane 2 — they must still share a lane afterwards
  const lanes = new Map([
    ["a", 0],
    ["b", 1],
    ["c", 2],
    ["d", 2],
  ]);
  const prices = new Map([
    ["a", 100],
    ["b", 200],
    ["c", 40],
    ["d", 300],
  ]);
  const ranked = rankLanesByPrice(lanes, prices);
  assert.equal(ranked.get("c"), ranked.get("d"));
  assert.equal(ranked.get("c"), 0); // lane 2's cheapest member is €40
  assert.equal(new Set(ranked.values()).size, 3);
});
