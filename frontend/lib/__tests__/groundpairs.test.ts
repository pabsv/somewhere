// ─── Unit tests: data/groundpairs.gen ground-pair invariants + lookup ────────
// Run from frontend/: npx tsx --test lib/__tests__/groundpairs.test.ts
// Pure data only — no Mongo, no Next runtime. The Python side enforces the
// same invariants at codegen time (scraper/targets.py validate_ground_pairs);
// this re-checks the GENERATED artifact so a hand-edited .gen.ts can't drift.

import { test } from "node:test";
import assert from "node:assert/strict";
import { GROUND_PAIRS, getGroundLinks } from "../../data/groundpairs.gen";
import { getDestination } from "../../data/destinations.gen";
import { ORIGINS } from "../../data/airports.gen";

test("pairs are non-empty and well-formed", () => {
  assert.ok(GROUND_PAIRS.length >= 40, "expected a substantial curated list");
  for (const p of GROUND_PAIRS) {
    assert.match(p.a, /^[A-Z]{3}$/);
    assert.match(p.b, /^[A-Z]{3}$/);
    assert.notEqual(p.a, p.b, `${p.a}-${p.b}: self-pair`);
    assert.ok(p.hours > 0 && p.hours <= 8, `${p.a}-${p.b}: hours ${p.hours}`);
  }
});

test("every pair code is a known destination and never a home origin", () => {
  const origins = new Set(ORIGINS.map((o) => o.code));
  for (const p of GROUND_PAIRS) {
    for (const code of [p.a, p.b]) {
      assert.ok(getDestination(code), `${p.a}-${p.b}: ${code} unknown`);
      assert.ok(!origins.has(code), `${p.a}-${p.b}: ${code} is a home origin`);
    }
  }
});

test("no duplicate unordered pairs", () => {
  const seen = new Set<string>();
  for (const p of GROUND_PAIRS) {
    const key = [p.a, p.b].sort().join("-");
    assert.ok(!seen.has(key), `duplicate pair ${key}`);
    seen.add(key);
  }
});

test("getGroundLinks expands both directions symmetrically", () => {
  const bcn = getGroundLinks("BCN");
  const mad = getGroundLinks("MAD");
  const bcnToMad = bcn.find((l) => l.other === "MAD");
  const madToBcn = mad.find((l) => l.other === "BCN");
  assert.ok(bcnToMad, "BCN links include MAD");
  assert.ok(madToBcn, "MAD links include BCN");
  assert.equal(bcnToMad.hours, madToBcn.hours);

  // Global symmetry: every link exists mirrored with equal hours.
  for (const p of GROUND_PAIRS) {
    assert.ok(getGroundLinks(p.a).some((l) => l.other === p.b && l.hours === p.hours));
    assert.ok(getGroundLinks(p.b).some((l) => l.other === p.a && l.hours === p.hours));
  }
});

test("unknown code yields an empty list, not a throw", () => {
  assert.deepEqual(getGroundLinks("XXX"), []);
  assert.deepEqual(getGroundLinks("EIN"), []); // origin — never paired
});
