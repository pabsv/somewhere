// Run: npx tsx --test lib/__tests__/trip-filter.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTripFilter,
  outboundMonthChunks,
  GROUND_COMPETITIVE_NOR,
} from "../trip-filter";
import { HARD_PRICE_CEILING } from "../score";

const BASE = {
  origins: ["EIN", "AMS"],
  start: "2026-07-21",
  end: "2027-05-21",
  today: "2026-07-21",
};

// The filter shape as it was before favourites existed. Any drift here changes
// what EVERY signed-out and no-favourites request sees, so it is pinned by
// value rather than by construction.
const legacyShape = (maxPrice?: number) => ({
  origin: { $in: ["EIN", "AMS"] },
  outbound_date: { $gte: "2026-07-21", $lte: "2027-05-21" },
  return_date: { $gte: "2026-07-21" },
  price: { $lte: maxPrice ?? HARD_PRICE_CEILING },
  $nor: GROUND_COMPETITIVE_NOR,
});

test("no favourites → filter is byte-identical to the legacy shape", () => {
  assert.deepEqual(buildTripFilter({ ...BASE, maxPrice: 200 }), legacyShape(200));
});

test("empty favourites array behaves exactly like omitting it", () => {
  assert.deepEqual(
    buildTripFilter({ ...BASE, maxPrice: 200, favourites: [] }),
    buildTripFilter({ ...BASE, maxPrice: 200 }),
  );
});

test("no maxPrice → the hard ceiling, and key order is unchanged", () => {
  const f = buildTripFilter(BASE);
  assert.deepEqual(f, legacyShape());
  assert.deepEqual(Object.keys(f), [
    "origin",
    "outbound_date",
    "return_date",
    "price",
    "$nor",
  ]);
});

test("a requested cap above the hard ceiling is clamped to it", () => {
  const f = buildTripFilter({ ...BASE, maxPrice: 9999 });
  assert.deepEqual(f.price, { $lte: HARD_PRICE_CEILING });
});

test("no end date → outbound has only a floor", () => {
  const f = buildTripFilter({ ...BASE, end: null });
  assert.deepEqual(f.outbound_date, { $gte: "2026-07-21" });
});

test("direct + nights land on the top level when there are no favourites", () => {
  const f = buildTripFilter({
    ...BASE,
    direct: true,
    minNights: 3,
    maxNights: 10,
  });
  assert.equal(f.outbound_stops, 0);
  assert.equal(f.return_stops, 0);
  assert.deepEqual(f.duration_days, { $gte: 3, $lte: 10 });
  assert.equal(f.$or, undefined);
});

// ─── favourites branch ───────────────────────────────────────────────────────

test("favourites produce an $or with the ceiling hoisted above it", () => {
  const f = buildTripFilter({
    ...BASE,
    maxPrice: 200,
    favourites: ["BCN", "LIS"],
    favMaxPrice: 400,
  });

  // The hoisted price is the ceiling, NOT the user's cap — the user's cap
  // lives in the normal branch so the favourite branch can exceed it.
  assert.deepEqual(f.price, { $lte: HARD_PRICE_CEILING });
  assert.equal(f.$nor, undefined, "$nor must move INTO the branches");
  assert.equal(f.$or?.length, 2);

  const [normal, fav] = f.$or!;
  assert.deepEqual(normal.price, { $lte: 200 });
  assert.deepEqual(normal.$nor, GROUND_COMPETITIVE_NOR);
  assert.equal(
    normal.destination,
    undefined,
    "no $nin — the branches are a union, not a partition",
  );

  assert.deepEqual(fav.destination, { $in: ["BCN", "LIS"] });
  assert.deepEqual(fav.price, { $lte: 400 });
});

test("a favourite never gets a TIGHTER cap than a stranger", () => {
  // Slider dragged to "any price" → maxPrice omitted → normal branch resolves
  // to the ceiling. The favourite allowance (400) must not undercut that.
  const f = buildTripFilter({
    ...BASE,
    favourites: ["BCN"],
    favMaxPrice: 400,
  });
  const [normal, fav] = f.$or!;
  assert.deepEqual(normal.price, { $lte: HARD_PRICE_CEILING });
  assert.deepEqual(fav.price, { $lte: HARD_PRICE_CEILING });
});

test("the favourite allowance is clamped by the hard ceiling", () => {
  const f = buildTripFilter({
    ...BASE,
    maxPrice: 200,
    favourites: ["BCN"],
    favMaxPrice: 5000,
  });
  assert.deepEqual(f.$or![1].price, { $lte: HARD_PRICE_CEILING });
});

test("explicit user filters still apply to favourites", () => {
  // "Direct only" and the nights sliders are assertions the user made; only
  // the app's own price default is relaxed.
  const f = buildTripFilter({
    ...BASE,
    maxPrice: 200,
    direct: true,
    minNights: 3,
    maxNights: 10,
    favourites: ["BCN"],
    favMaxPrice: 400,
  });
  const fav = f.$or![1];
  assert.equal(fav.outbound_stops, 0);
  assert.equal(fav.return_stops, 0);
  assert.deepEqual(fav.duration_days, { $gte: 3, $lte: 10 });
});

test("the rail-competitive cap still applies on BOTH branches", () => {
  // Declined non-goal: starring Berlin does not currently lift the ground cap.
  // If that ever changes, this is the test that should fail first.
  const f = buildTripFilter({
    ...BASE,
    maxPrice: 200,
    favourites: ["BER"],
    favMaxPrice: 400,
  });
  assert.deepEqual(f.$or![0].$nor, GROUND_COMPETITIVE_NOR);
  assert.deepEqual(f.$or![1].$nor, GROUND_COMPETITIVE_NOR);
});

test("the spine stays outside the $or so the index bounds survive", () => {
  const f = buildTripFilter({ ...BASE, favourites: ["BCN"], favMaxPrice: 400 });
  assert.deepEqual(f.origin, { $in: ["EIN", "AMS"] });
  assert.deepEqual(f.outbound_date, { $gte: "2026-07-21", $lte: "2027-05-21" });
  assert.deepEqual(f.return_date, { $gte: "2026-07-21" });
});

// ─── outbound month chunking (the per-month cache split) ─────────────────────

test("chunks cover exactly one calendar month each, clamped to the range", () => {
  const c = outboundMonthChunks("2026-07-21", "2026-10-05");
  assert.deepEqual(c, [
    { start: "2026-07-21", end: "2026-07-31" }, // clamped at the front
    { start: "2026-08-01", end: "2026-08-31" },
    { start: "2026-09-01", end: "2026-09-30" },
    { start: "2026-10-01", end: "2026-10-05" }, // clamped at the back
  ]);
});

test("chunks are contiguous and gapless — the union is the whole range", () => {
  const from = "2026-07-21";
  const to = "2027-05-21";
  const c = outboundMonthChunks(from, to);
  assert.equal(c.length, 11, "Jul 2026 … May 2027 inclusive");
  assert.equal(c[0].start, from);
  assert.equal(c[c.length - 1].end, to);
  for (let i = 1; i < c.length; i++) {
    const prevEnd = new Date(`${c[i - 1].end}T00:00:00Z`);
    const nextDay = new Date(prevEnd.getTime() + 86400000)
      .toISOString()
      .slice(0, 10);
    assert.equal(c[i].start, nextDay, `gap or overlap before ${c[i].start}`);
  }
});

test("a range inside one month is a single chunk", () => {
  assert.deepEqual(outboundMonthChunks("2026-07-10", "2026-07-20"), [
    { start: "2026-07-10", end: "2026-07-20" },
  ]);
});

test("a single day is a single one-day chunk", () => {
  assert.deepEqual(outboundMonthChunks("2026-07-10", "2026-07-10"), [
    { start: "2026-07-10", end: "2026-07-10" },
  ]);
});

test("an inverted range yields no chunks", () => {
  assert.deepEqual(outboundMonthChunks("2026-07-10", "2026-07-09"), []);
});

test("month lengths are real, including a leap February", () => {
  const feb28 = outboundMonthChunks("2026-02-01", "2026-03-01");
  assert.equal(feb28[0].end, "2026-02-28");
  const feb29 = outboundMonthChunks("2028-02-01", "2028-03-01");
  assert.equal(feb29[0].end, "2028-02-29", "2028 is a leap year");
});

test("year boundaries roll over correctly", () => {
  const c = outboundMonthChunks("2026-11-15", "2027-02-03");
  assert.deepEqual(
    c.map((x) => `${x.start}..${x.end}`),
    [
      "2026-11-15..2026-11-30",
      "2026-12-01..2026-12-31",
      "2027-01-01..2027-01-31",
      "2027-02-01..2027-02-03",
    ],
  );
});
