// Run: npx tsx --test lib/__tests__/curate-core.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  curateBars,
  BARS_PER_DEST_PER_MONTH,
  BARS_PER_MONTH,
  FAV_BARS_PER_DEST_PER_MONTH,
  FAV_BARS_PER_MONTH_RESERVED,
  monthKey,
} from "../curate-core";
import type { Trip } from "@/types/api";

/** Minimal Trip — curateBars only reads key/destination/outbound_date/price/score. */
function trip(
  destination: string,
  outbound_date: string,
  price: number,
  score = 50,
): Trip {
  return {
    key: `${destination}|${outbound_date}|${price}`,
    destination,
    outbound_date,
    price,
    score,
  } as unknown as Trip;
}

/** N trips to the same city in the same month, priced 10, 20, 30… */
function fares(destination: string, n: number, base = 10): Trip[] {
  return Array.from({ length: n }, (_, i) =>
    trip(destination, "2026-08-05", base + i * 10),
  );
}

const countFor = (out: Trip[], dest: string) =>
  out.filter((t) => t.destination === dest).length;

// ─── back-compat: the no-favourites path must not have moved ─────────────────

test("no favourites → at most 2 bars per destination per month", () => {
  const out = curateBars(fares("BCN", 9));
  assert.equal(out.length, BARS_PER_DEST_PER_MONTH);
  assert.deepEqual(
    out.map((t) => t.price),
    [10, 20],
    "and they are the two cheapest",
  );
});

test("no favourites → at most 40 bars per month", () => {
  // 30 cities × 3 fares each = 90 candidates, capped to 2/city = 60, then 40.
  const trips = Array.from({ length: 30 }, (_, c) =>
    fares(`C${c.toString().padStart(2, "0")}`, 3, 10 + c),
  ).flat();
  const out = curateBars(trips);
  assert.equal(out.length, BARS_PER_MONTH);
});

test("passing an empty favourite set is identical to passing none", () => {
  const trips = [...fares("BCN", 5), ...fares("LIS", 5, 15)];
  assert.deepEqual(curateBars(trips, new Set()), curateBars(trips));
});

test("months are curated independently", () => {
  const trips = [
    ...fares("BCN", 5),
    ...Array.from({ length: 5 }, (_, i) => trip("BCN", "2026-09-05", 10 + i * 10)),
  ];
  const out = curateBars(trips);
  assert.equal(out.filter((t) => monthKey(t.outbound_date) === "2026-08").length, 2);
  assert.equal(out.filter((t) => monthKey(t.outbound_date) === "2026-09").length, 2);
});

test("output is sorted cheapest-first", () => {
  const out = curateBars([...fares("BCN", 4), ...fares("LIS", 4, 15)]);
  const prices = out.map((t) => t.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
});

// ─── the favourite margin ────────────────────────────────────────────────────

test("a favourite destination gets the wider per-month slice", () => {
  const out = curateBars(fares("BCN", 9), new Set(["BCN"]));
  assert.equal(out.length, FAV_BARS_PER_DEST_PER_MONTH);
  assert.deepEqual(
    out.map((t) => t.price),
    [10, 20, 30, 40, 50, 60],
    "cheapest-first within the favourite's own slice",
  );
});

test("only the starred city is widened", () => {
  const out = curateBars(
    [...fares("BCN", 9), ...fares("LIS", 9, 15)],
    new Set(["BCN"]),
  );
  assert.equal(countFor(out, "BCN"), FAV_BARS_PER_DEST_PER_MONTH);
  assert.equal(countFor(out, "LIS"), BARS_PER_DEST_PER_MONTH);
});

test("a pricey favourite survives a month full of cheaper strangers", () => {
  // 40 cities at €10–49 would fill the month exactly; the €500 favourite would
  // lose every cheapest-first comparison without the reserve.
  const strangers = Array.from({ length: 40 }, (_, c) =>
    trip(`C${c.toString().padStart(2, "0")}`, "2026-08-05", 10 + c),
  );
  const plain = curateBars([...strangers, trip("BCN", "2026-08-05", 500)]);
  assert.equal(countFor(plain, "BCN"), 0, "baseline: curated away today");

  const withFav = curateBars(
    [...strangers, trip("BCN", "2026-08-05", 500)],
    new Set(["BCN"]),
  );
  assert.equal(countFor(withFav, "BCN"), 1);
});

test("the month cap still holds with favourites present", () => {
  const strangers = Array.from({ length: 40 }, (_, c) =>
    trip(`C${c.toString().padStart(2, "0")}`, "2026-08-05", 10 + c),
  );
  // 10 favourite cities × 6 bars each would be 60 on its own.
  const favCities = Array.from({ length: 10 }, (_, i) => `F${i}`);
  const favTrips = favCities.map((c) => fares(c, 6, 300)).flat();
  const out = curateBars([...strangers, ...favTrips], new Set(favCities));
  assert.equal(out.length, BARS_PER_MONTH, "reserved, not exempt");
});

test("the reserve is bounded and goes to the cheapest favourites", () => {
  const strangers = Array.from({ length: 40 }, (_, c) =>
    trip(`C${c.toString().padStart(2, "0")}`, "2026-08-05", 10 + c),
  );
  // 20 favourite cities, all pricier than every stranger, priced 300, 310, …
  const favCities = Array.from({ length: 20 }, (_, i) => `F${i}`);
  const favTrips = favCities.map((c, i) =>
    trip(c, "2026-08-05", 300 + i * 10),
  );
  const out = curateBars([...strangers, ...favTrips], new Set(favCities));

  const shownFavs = out.filter((t) => favCities.includes(t.destination));
  assert.equal(shownFavs.length, FAV_BARS_PER_MONTH_RESERVED);
  assert.deepEqual(
    shownFavs.map((t) => t.price),
    Array.from({ length: FAV_BARS_PER_MONTH_RESERVED }, (_, i) => 300 + i * 10),
  );
  assert.equal(out.length, BARS_PER_MONTH);
});

test("unused reserve slots go back to the general pool", () => {
  // One favourite, 40 strangers: the month should still be full, not 1 + 39.
  const strangers = Array.from({ length: 40 }, (_, c) =>
    trip(`C${c.toString().padStart(2, "0")}`, "2026-08-05", 10 + c),
  );
  const out = curateBars(
    [...strangers, trip("BCN", "2026-08-05", 500)],
    new Set(["BCN"]),
  );
  assert.equal(out.length, BARS_PER_MONTH);
  assert.equal(countFor(out, "BCN"), 1);
});

test("favourites are not excluded from the general pool once reserved", () => {
  // A cheap favourite should not be counted twice or dropped from the tail.
  const out = curateBars(
    [...fares("BCN", 9), ...fares("LIS", 9, 15)],
    new Set(["BCN"]),
  );
  const keys = out.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length, "no duplicates");
});

test("empty input stays empty", () => {
  assert.deepEqual(curateBars([]), []);
  assert.deepEqual(curateBars([], new Set(["BCN"])), []);
});
