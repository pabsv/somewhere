// ─── Search URL builders ─────────────────────────────────────────────────────
// Ported from legacy lib/api.ts (logic identical), retargeted at the v1 Trip
// shape. Google Flights is the primary fallback (fli source); the Azair
// builder stays available for the "browse alternatives" flow — flight docs
// no longer carry azair_link (spec section B), so it's always built here.
//
// Every Google link is a `tfs` protobuf deep link (lib/googleFlightsTfs.ts) —
// exact airports, dates and currency rather than a fuzzy text query.

import type { Trip } from "@/types/api";
import { getDestination } from "@/data/destinations.gen";
import { ORIGINS } from "@/data/airports.gen";
import {
  buildGoogleFlightsTfsUrl,
  TFS_ROUND_TRIP,
} from "@/lib/googleFlightsTfs";

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
// `tfs` deep link (lib/googleFlightsTfs.ts): the search lands prefilled with
// these exact airports + dates in EUR, instead of relying on Google's parser to
// read a `?q=Flights+to+…` sentence.
export function buildGoogleFlightsSearchUrl(trip: SearchableTrip): string {
  return buildGoogleFlightsTfsUrl(
    [
      {
        origin: trip.origin,
        destination: trip.destination,
        date: trip.outbound_date,
      },
      {
        origin: trip.destination,
        destination: trip.origin,
        date: trip.return_date,
      },
    ],
    TFS_ROUND_TRIP,
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────
/**
 * Best outbound link for a trip.
 *
 * `trip.search_link` (stored by the scraper, `_build_google_flights_url` in
 * scraper-fli/scraper.py) is deliberately IGNORED: it is the same fuzzy
 * `?q=Flights+to+X+from+Y+on+…` text query this file used to build, which the
 * `tfs` deep link strictly supersedes — exact airports, exact dates, EUR. The
 * field stays on the Trip shape (Mongo + Zod) so nothing downstream breaks; if
 * the scraper ever stores a real per-fare booking URL, restore the preference
 * here.
 */
export function getSearchUrl(trip: SearchableTrip): string {
  return buildGoogleFlightsSearchUrl(trip);
}
