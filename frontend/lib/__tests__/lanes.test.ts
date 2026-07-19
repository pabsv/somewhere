// Run: npx tsx --test lib/__tests__/lanes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { assignLanes, type LaneTrip } from "../lanes";

const t = (
  key: string,
  out: string,
  ret: string,
  price: number,
): LaneTrip => ({ key, outbound_date: out, return_date: ret, price });

test("cheapest trip claims lane 0", () => {
  const { lanes, overflow } = assignLanes(
    [
      t("mid", "2026-08-01", "2026-08-05", 100),
      t("cheap", "2026-08-02", "2026-08-06", 40),
      t("dear", "2026-08-03", "2026-08-07", 180),
    ],
    6,
  );
  assert.equal(lanes.get("cheap"), 0);
  assert.equal(overflow.length, 0);
});

test("price tie → earlier outbound wins the higher lane", () => {
  const { lanes } = assignLanes(
    [
      t("late", "2026-08-10", "2026-08-14", 50),
      t("early", "2026-08-01", "2026-08-05", 50),
    ],
    1,
  );
  // both fit lane 0 (no overlap) — insertion order is early first
  assert.equal(lanes.get("early"), 0);
  assert.equal(lanes.get("late"), 0);
});

test("price tie on overlapping trips → earlier outbound placed first", () => {
  const { lanes, overflow } = assignLanes(
    [
      t("late", "2026-08-03", "2026-08-08", 50),
      t("early", "2026-08-01", "2026-08-05", 50),
    ],
    1,
  );
  assert.equal(lanes.get("early"), 0);
  assert.equal(lanes.has("late"), false);
  assert.deepEqual(overflow, ["late"]);
});

test("maxLanes = Infinity → everything placed, overflow empty", () => {
  // 10 mutually-overlapping trips (same span) need 10 lanes
  const trips = Array.from({ length: 10 }, (_, i) =>
    t(`k${i}`, "2026-08-01", "2026-08-10", 100 - i),
  );
  const { lanes, overflow } = assignLanes(trips, Number.POSITIVE_INFINITY);
  assert.equal(lanes.size, 10);
  assert.equal(overflow.length, 0);
  // cheapest (k9, €91) tops the stack
  assert.equal(lanes.get("k9"), 0);
});

test("equal price + date → key ASC tiebreak, deterministic", () => {
  const trips = [
    t("b", "2026-08-01", "2026-08-05", 60),
    t("a", "2026-08-01", "2026-08-05", 60),
  ];
  const first = assignLanes(trips, 2);
  const second = assignLanes([...trips].reverse(), 2);
  assert.equal(first.lanes.get("a"), 0);
  assert.equal(first.lanes.get("b"), 1);
  assert.deepEqual(first.lanes, second.lanes);
});

test("overflow only past the lane cap", () => {
  const trips = Array.from({ length: 8 }, (_, i) =>
    t(`k${i}`, "2026-08-01", "2026-08-10", 10 + i),
  );
  const { lanes, overflow } = assignLanes(trips, 6);
  assert.equal(lanes.size, 6);
  // the two priciest overflow
  assert.deepEqual(overflow.sort(), ["k6", "k7"]);
});
