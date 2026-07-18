// ─── Unit tests: pickOpenJawExtensions ("stay longer" for combo bars) ────────
// Run from frontend/: npx tsx --test lib/__tests__/openjaw-extensions.test.ts
// Pure shaping only — no fetch, no Mongo.

import { test } from "node:test";
import assert from "node:assert/strict";
import { pickOpenJawExtensions } from "../../components/tripcal/useStayExtensions";
import type { CalTrip, DateWindow, OpenJawTrip } from "../../types/api";

/** Minimal CalTrip carrying only the fields the helper reads. */
function calTrip(
  oj: Partial<OpenJawTrip> & Pick<OpenJawTrip, "out" | "back">,
): CalTrip {
  return {
    outbound_date: oj.out.date,
    return_date: oj.back.date,
    duration_days: 4,
    price: 100,
    openjaw: oj,
  } as unknown as CalTrip;
}

const BASE = calTrip({
  out: { origin: "EIN", destination: "BCN", date: "2026-08-01", price: 40 },
  back: { origin: "BCN", destination: "AMS", date: "2026-08-05", price: 60 },
  extensions: [
    { date: "2026-08-06", back_price: 55, total: 95 },
    { date: "2026-08-07", back_price: 80, total: 120 },
    { date: "2026-08-08", back_price: 65, total: 105 },
    { date: "2026-08-12", back_price: 30, total: 70 },
  ],
});

test("no combo or no extensions → empty", () => {
  assert.deepEqual(
    pickOpenJawExtensions({} as unknown as CalTrip, [], false),
    [],
  );
  const bare = calTrip({
    out: { origin: "EIN", destination: "BCN", date: "2026-08-01", price: 40 },
    back: { origin: "BCN", destination: "AMS", date: "2026-08-05", price: 60 },
  });
  assert.deepEqual(pickOpenJawExtensions(bare, [], false), []);
});

test("unclamped: +3d fallback bounds the suggestions", () => {
  const exts = pickOpenJawExtensions(BASE, [], false);
  // 08-12 is past return_date + 3; the rest fit and stay under the row cap
  assert.deepEqual(
    exts.map((e) => [e.return_date, e.price, e.deltaPrice, e.extraNights]),
    [
      ["2026-08-06", 95, -5, 1],
      ["2026-08-07", 120, 20, 2],
      ["2026-08-08", 105, 5, 3],
    ],
  );
  assert.equal(exts[0].nights, 5); // 4 nights + 1 extra
  assert.equal(exts[0].kind, "later");
  assert.equal(exts[0].daysLater, 1);
});

test("clamped: containing window's end bounds the suggestions", () => {
  const windows: DateWindow[] = [
    { start_date: "2026-07-30", end_date: "2026-08-07" } as DateWindow,
  ];
  const exts = pickOpenJawExtensions(BASE, windows, true);
  assert.deepEqual(
    exts.map((e) => e.return_date),
    ["2026-08-06", "2026-08-07"],
  );
});

test("clamped but no containing window → +3d fallback", () => {
  const windows: DateWindow[] = [
    { start_date: "2026-09-01", end_date: "2026-09-10" } as DateWindow,
  ];
  const exts = pickOpenJawExtensions(BASE, windows, true);
  assert.equal(exts.length, 3);
});
