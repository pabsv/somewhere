// ─── Unit tests: lib/stretch-core (enumerate + hybrid pricing) ───────────────
// Run from frontend/: npx tsx --test lib/__tests__/stretch-core.test.ts
// Pure-core only — no Mongo, no Next runtime.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enumerateStretchCandidates,
  priceStretchCandidates,
  type ExactFare,
} from "../stretch-core";

const TODAY = "2026-08-01";
const BASE = { out: "2026-08-14", ret: "2026-08-17" };

test("no window → ±3 fallback both sides, no full candidate", () => {
  const c = enumerateStretchCandidates(BASE, {}, TODAY);
  assert.deepEqual(
    c.map((x) => [x.out, x.ret, x.kind]),
    [
      ["2026-08-13", "2026-08-17", "earlier"],
      ["2026-08-12", "2026-08-17", "earlier"],
      ["2026-08-11", "2026-08-17", "earlier"],
      ["2026-08-14", "2026-08-18", "later"],
      ["2026-08-14", "2026-08-19", "later"],
      ["2026-08-14", "2026-08-20", "later"],
    ],
  );
});

test("window clamps both sides and adds the full pair", () => {
  const win = { winStart: "2026-08-12", winEnd: "2026-08-18" };
  const c = enumerateStretchCandidates(BASE, win, TODAY);
  assert.deepEqual(
    c.map((x) => [x.out, x.ret, x.kind]),
    [
      ["2026-08-13", "2026-08-17", "earlier"],
      ["2026-08-12", "2026-08-17", "earlier"],
      ["2026-08-14", "2026-08-18", "later"],
      ["2026-08-12", "2026-08-18", "full"],
    ],
  );
});

test("today floors earlier departures", () => {
  const c = enumerateStretchCandidates(BASE, {}, "2026-08-13");
  assert.deepEqual(
    c.filter((x) => x.kind === "earlier").map((x) => x.out),
    ["2026-08-13"],
  );
});

test("full pair floors its outbound at today", () => {
  const win = { winStart: "2026-08-10", winEnd: "2026-08-19" };
  const c = enumerateStretchCandidates(BASE, win, "2026-08-13");
  const full = c.find((x) => x.kind === "full");
  assert.deepEqual([full?.out, full?.ret], ["2026-08-13", "2026-08-19"]);
});

test("full pair deduped against an equal later/earlier candidate", () => {
  // window = base out .. base ret+1: full pair === the +1 later candidate
  const win = { winStart: "2026-08-14", winEnd: "2026-08-18" };
  const c = enumerateStretchCandidates(BASE, win, TODAY);
  assert.deepEqual(
    c.map((x) => [x.out, x.ret, x.kind]),
    [["2026-08-14", "2026-08-18", "later"]],
  );
});

test("window equal to the trip → nothing to stretch into", () => {
  const win = { winStart: "2026-08-14", winEnd: "2026-08-17" };
  assert.deepEqual(enumerateStretchCandidates(BASE, win, TODAY), []);
});

test("never emits out >= ret (1-night trip departing today)", () => {
  const c = enumerateStretchCandidates(
    { out: "2026-08-01", ret: "2026-08-02" },
    {},
    TODAY,
  );
  assert.ok(c.every((x) => x.out < x.ret));
  assert.equal(c.filter((x) => x.kind === "earlier").length, 0);
});

test("pricing: exact beats estimate, estimate sums grids, no data drops", () => {
  const candidates = enumerateStretchCandidates(BASE, {}, TODAY);
  const exact = new Map<string, ExactFare>([
    [
      "2026-08-14|2026-08-18",
      { price: 120, deal_tier: "deal", delta_pct: -12, search_link: "gf" },
    ],
  ]);
  const outGrid = { "2026-08-13": 40, "2026-08-14": 45 };
  const backGrid = { "2026-08-17": 50, "2026-08-18": 90, "2026-08-19": 55 };
  const v = priceStretchCandidates(candidates, exact, outGrid, backGrid);
  assert.deepEqual(
    v.map((x) => [x.out_date, x.return_date, x.price, x.estimated, x.kind]),
    [
      ["2026-08-13", "2026-08-17", 90, true, "earlier"], // 40+50 estimate
      ["2026-08-14", "2026-08-18", 120, false, "later"], // exact wins over 45+90
      ["2026-08-14", "2026-08-19", 100, true, "later"], // 45+55 estimate
      // 08-12/08-11 earlier + others: no grid data → dropped
    ],
  );
  const exactV = v.find((x) => !x.estimated);
  assert.equal(exactV?.deal_tier, "deal");
  assert.equal(exactV?.search_link, "gf");
  assert.equal(v.find((x) => x.estimated)?.deal_tier, null);
});

test("pricing: nights computed from the candidate pair", () => {
  const v = priceStretchCandidates(
    [{ out: "2026-08-12", ret: "2026-08-17", kind: "earlier" }],
    new Map(),
    { "2026-08-12": 30 },
    { "2026-08-17": 30 },
  );
  assert.equal(v[0].nights, 5);
});
