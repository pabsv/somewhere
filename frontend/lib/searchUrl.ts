// ─── Search URL builders ─────────────────────────────────────────────────────
// Ported from legacy lib/api.ts (logic identical), retargeted at the v1 Trip
// shape. Google Flights is the primary fallback (fli source); the Azair
// builder stays available for the "browse alternatives" flow — flight docs
// no longer carry azair_link (spec section B), so it's always built here.

import type { Trip } from "@/types/api";
import { getDestination } from "@/data/destinations.gen";
import { ORIGINS } from "@/data/airports.gen";

/** Minimum trip fields the builders need — full Trip satisfies it. */
export type SearchableTrip = Pick<
  Trip,
  "origin" | "destination" | "outbound_date" | "return_date" | "duration_days"
> &
  Partial<Pick<Trip, "search_link">>;

function getOriginName(code: string): string {
  return ORIGINS.find((o) => o.code === code)?.name ?? code;
}

// ─── Azair: flexible search URL ──────────────────────────────────────────────
// ±3 days departure/return, ±2 days trip duration around the deal's dates so
// the user can browse alternatives on Azair.
export function buildAzairSearchUrl(trip: SearchableTrip): string {
  const origin = trip.origin;
  const dest = trip.destination;

  const originCity = getOriginName(origin);
  const destCity = getDestination(dest)?.name ?? dest;

  const parseLocal = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtMonth = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  const out = parseLocal(trip.outbound_date);
  const ret = parseLocal(trip.return_date);
  const dep = addDays(out, -3);
  const arr = addDays(ret, 3);

  const dur =
    trip.duration_days ??
    Math.ceil((ret.getTime() - out.getTime()) / 86400000);
  const minDays = Math.max(2, dur - 2);
  const maxDays = dur + 2;

  const params = new URLSearchParams({
    lang: "en", searchtype: "flexi", tp: "0", isOneway: "return",
    srcAirport: `${originCity} [${origin}]`, srcTypedText: origin, srcap: origin,
    dstAirport: `${destCity} [${dest}]`, dstTypedText: dest, dstap: dest,
    depmonth: fmtMonth(dep), depdate: fmtDate(dep),
    arrmonth: fmtMonth(arr), arrdate: fmtDate(arr),
    minDaysStay: String(minDays), maxDaysStay: String(maxDays),
    dep0: "true", dep1: "true", dep2: "true", dep3: "true", dep4: "true", dep5: "true", dep6: "true",
    arr0: "true", arr1: "true", arr2: "true", arr3: "true", arr4: "true", arr5: "true", arr6: "true",
    samedep: "true", samearr: "true",
    minHourStay: "0:45", maxHourStay: "23:20",
    minHourOutbound: "0:00", maxHourOutbound: "24:00",
    minHourInbound: "0:00", maxHourInbound: "24:00",
    autoprice: "true", maxChng: "1", currency: "EUR", indexSubmit: "Search",
  });

  return `https://www.azair.eu/azfin.php?${params.toString()}`;
}

// ─── Google Flights: exact-date search URL ───────────────────────────────────
export function buildGoogleFlightsSearchUrl(trip: SearchableTrip): string {
  return (
    `https://www.google.com/travel/flights?q=` +
    `Flights+to+${trip.destination}+from+${trip.origin}` +
    `+on+${trip.outbound_date}+returning+${trip.return_date}`
  );
}

// ─── Google Flights: one-way search URL ──────────────────────────────────────
// An open-jaw combo is two separate tickets, so it gets TWO of these links —
// one per leg. Text-query form, same as the round-trip builder above.
export function buildGoogleFlightsOneWayUrl(
  origin: string,
  dest: string,
  date: string,
): string {
  return (
    `https://www.google.com/travel/flights?q=` +
    `One+way+flights+to+${dest}+from+${origin}+on+${date}`
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────
/**
 * Best outbound link for a trip: the scraper-provided deep link when present,
 * otherwise a Google Flights search built from the trip's route + dates.
 */
export function getSearchUrl(trip: SearchableTrip): string {
  if (trip.search_link) return trip.search_link;
  return buildGoogleFlightsSearchUrl(trip);
}
