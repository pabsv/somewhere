import type { CitySummary } from "@/types/api";

/**
 * Build the promotional landing board from three deliberate buckets:
 *   1. the cheapest fare in the whole pool;
 *   2. the cheapest fare departing Eindhoven (unless row 1 already is it);
 *   3. the cheapest tier-A tourist destinations / major hubs.
 *
 * Lower-tier cities remain eligible for the two price-led headline slots, but
 * cannot crowd recognizable destinations out of the rest of the board.
 */
export function selectLandingCities(
  allCities: CitySummary[],
  eindhovenCities: CitySummary[],
  limit = 6,
): CitySummary[] {
  if (limit <= 0) return [];

  const byPrice = (a: CitySummary, b: CitySummary) =>
    a.best.price - b.best.price || b.best.score - a.best.score;
  const allByPrice = [...allCities].sort(byPrice);
  const eindhovenByPrice = [...eindhovenCities]
    .filter((city) => city.best.origin === "EIN")
    .sort(byPrice);

  const selected: CitySummary[] = [];
  const seenRoutes = new Set<string>();
  const seenDestinations = new Set<string>();

  const add = (city: CitySummary | undefined) => {
    if (!city || selected.length >= limit) return;
    const route = `${city.best.origin}-${city.code}`;
    if (seenRoutes.has(route)) return;
    selected.push(city);
    seenRoutes.add(route);
    seenDestinations.add(city.code);
  };

  const cheapestOverall = allByPrice[0];
  add(cheapestOverall);

  // If the global winner already leaves from Eindhoven, that one row truthfully
  // fills both headline roles and leaves an extra slot for a popular city.
  if (cheapestOverall?.best.origin !== "EIN") {
    add(eindhovenByPrice[0]);
  }

  for (const city of allByPrice) {
    if (city.tier === "A" && !seenDestinations.has(city.code)) add(city);
  }

  // Defensive cold-pool fallback: still fill the board if too few tier-A
  // destinations currently have live fares.
  for (const city of allByPrice) {
    if (!seenDestinations.has(city.code)) add(city);
  }

  return selected;
}
