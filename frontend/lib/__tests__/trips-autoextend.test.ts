// ─── Unit tests: lib/trips applyAutoExtend ───────────────────────────────────
// Run from frontend/: npx tsx --test lib/__tests__/trips-autoextend.test.ts
// Pure shaping only — no Mongo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAutoExtend } from "../trips";
import type { Trip } from "../../types/api";

/** Minimal Trip carrying only the fields applyAutoExtend reads. */
function trip(
  key: string,
  ret: string,
  price: number,
  score = 50,
  out = "2026-08-14",
): Trip {
  return {
    key,
    origin: "EIN",
    destination: "BCN",
    outbound_date: out,
    return_date: ret,
    duration_days:
      Number(ret.slice(8, 10)) - Number(out.slice(8, 10)),
    price,
    score,
  } as unknown as Trip;
}

test("longer variant within €5 replaces the base, shorter is dropped", () => {
  const base = trip("a", "2026-08-17", 107, 80);
  const longer = trip("b", "2026-08-18", 107, 60);
  const out = applyAutoExtend([base, longer]);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "b");
  assert.deepEqual(out[0].auto_extended, {
    base_return_date: "2026-08-17",
    base_price: 107,
    extra_nights: 1,
    delta_price: 0,
  });
});

test("€6 more → untouched (both bars survive, no stamp)", () => {
  const base = trip("a", "2026-08-17", 107, 80);
  const longer = trip("b", "2026-08-18", 113, 60);
  const out = applyAutoExtend([base, longer]);
  assert.equal(out.length, 2);
  assert.ok(out.every((t) => t.auto_extended == null));
});

test("longest qualifying return wins over a shorter qualifying one", () => {
  const base = trip("a", "2026-08-17", 100, 80);
  const mid = trip("b", "2026-08-18", 103, 70);
  const long = trip("c", "2026-08-19", 105, 60);
  const out = applyAutoExtend([base, mid, long]);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "c");
  assert.equal(out[0].auto_extended?.delta_price, 5);
  assert.equal(out[0].auto_extended?.extra_nights, 2);
});

test("longer NON-qualifying variant survives as its own bar", () => {
  const base = trip("a", "2026-08-17", 100, 80);
  const cheapLonger = trip("b", "2026-08-18", 104, 70);
  const priceyLongest = trip("c", "2026-08-20", 180, 60);
  const out = applyAutoExtend([base, cheapLonger, priceyLongest]);
  assert.deepEqual(out.map((t) => t.key).sort(), ["b", "c"]);
  assert.equal(out.find((t) => t.key === "b")?.auto_extended?.extra_nights, 1);
  assert.equal(out.find((t) => t.key === "c")?.auto_extended, undefined);
});

test("single-variant group untouched", () => {
  const only = trip("a", "2026-08-17", 100);
  const out = applyAutoExtend([only]);
  assert.deepEqual(out, [only]);
});

test("different outbound dates never merge", () => {
  const a = trip("a", "2026-08-17", 100, 80, "2026-08-14");
  const b = trip("b", "2026-08-18", 100, 80, "2026-08-15");
  const out = applyAutoExtend([a, b]);
  assert.equal(out.length, 2);
  assert.ok(out.every((t) => t.auto_extended == null));
});

test("base is the best-scored trip, not the first", () => {
  const weak = trip("a", "2026-08-18", 90, 40); // longer but weak score
  const strong = trip("b", "2026-08-17", 100, 90); // curation would show this
  const out = applyAutoExtend([weak, strong]);
  // weak is longer AND cheaper than strong+5 → auto-extend to weak's dates
  assert.equal(out.length, 1);
  assert.equal(out[0].key, "a");
  assert.equal(out[0].auto_extended?.base_return_date, "2026-08-17");
  assert.equal(out[0].auto_extended?.delta_price, -10);
});
