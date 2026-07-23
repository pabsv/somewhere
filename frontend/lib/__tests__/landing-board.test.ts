// Run: npx tsx --test lib/__tests__/landing-board.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectLandingCities } from "../landing-board";
import type { CitySummary } from "../../types/api";

function city(
  code: string,
  price: number,
  origin: string,
  tier: CitySummary["tier"],
): CitySummary {
  return {
    code,
    name: code,
    country: "NL",
    region: "Test",
    tier,
    min_price: price,
    trip_count: 1,
    baseline: null,
    best: {
      origin,
      price,
      outbound_date: "2026-08-01",
      return_date: "2026-08-05",
      duration_days: 5,
      nights: 4,
      score: 80,
      delta_pct: -20,
      deal_tier: "deal",
      airlines: [],
      is_direct: true,
      search_link: null,
    },
  };
}

test("keeps the global and Eindhoven price leaders, then favours tier A", () => {
  const all = [
    city("ORK", 30, "CRL", "B"),
    city("CLJ", 31, "CRL", "C"),
    city("BCN", 45, "BRU", "A"),
    city("LIS", 48, "AMS", "A"),
    city("FCO", 50, "CRL", "A"),
    city("ATH", 55, "AMS", "A"),
    city("ZAG", 34, "CRL", "B"),
  ];
  const eindhoven = [
    city("BUD", 40, "EIN", "A"),
    city("ORK", 42, "EIN", "B"),
  ];

  assert.deepEqual(
    selectLandingCities(all, eindhoven).map(
      (item) => `${item.best.origin}-${item.code}`,
    ),
    ["CRL-ORK", "EIN-BUD", "BRU-BCN", "AMS-LIS", "CRL-FCO", "AMS-ATH"],
  );
});

test("does not duplicate the Eindhoven slot when it is cheapest overall", () => {
  const all = [
    city("BCN", 30, "EIN", "A"),
    city("LIS", 40, "AMS", "A"),
    city("FCO", 45, "BRU", "A"),
  ];

  assert.deepEqual(
    selectLandingCities(all, [city("BCN", 30, "EIN", "A")]).map(
      (item) => item.code,
    ),
    ["BCN", "LIS", "FCO"],
  );
});

test("falls back to cheap lower-tier cities when the live tier-A pool is thin", () => {
  const all = [
    city("ORK", 30, "CRL", "B"),
    city("BCN", 40, "AMS", "A"),
    city("ZAG", 45, "BRU", "B"),
  ];
  const eindhoven = [city("BUD", 35, "EIN", "A")];

  assert.deepEqual(
    selectLandingCities(all, eindhoven, 4).map((item) => item.code),
    ["ORK", "BUD", "BCN", "ZAG"],
  );
});
