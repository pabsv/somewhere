// Run: npx tsx --test lib/__tests__/favourites.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { favouriteDest, isFavouriteTrip } from "../favourites";

const saved = (...codes: string[]) => new Set(codes);

const trip = (destination: string) => ({ destination });

test("trip matches on its destination", () => {
  assert.equal(favouriteDest(trip("BCN"), saved("BCN")), "BCN");
  assert.ok(isFavouriteTrip(trip("BCN"), saved("BCN")));
});

test("trip to an unstarred city matches nothing", () => {
  assert.equal(favouriteDest(trip("BCN"), saved("LIS")), null);
  assert.equal(isFavouriteTrip(trip("BCN"), saved("LIS")), false);
});

test("empty favourite set never matches", () => {
  assert.equal(favouriteDest(trip("BCN"), saved()), null);
  assert.equal(isFavouriteTrip(trip("BCN"), saved()), false);
});

test("a larger favourite set still matches only the trip's own city", () => {
  assert.equal(favouriteDest(trip("BCN"), saved("LIS", "BCN", "DXB")), "BCN");
  assert.equal(favouriteDest(trip("VAR"), saved("LIS", "BCN", "DXB")), null);
});

test("the returned code drives reach scaling, not just a boolean", () => {
  // promoteFavouriteTier scales the price bands by the destination's reach
  // multiplier (lib/score.ts), so this must return the CODE — a boolean would
  // silently fall back to core-Europe bands for every favourite.
  assert.equal(favouriteDest(trip("DXB"), saved("DXB")), "DXB");
  assert.equal(typeof favouriteDest(trip("DXB"), saved("DXB")), "string");
});
