// ─── API abstraction layer ─────────────────────────────────────────────────────
// All pages import from here. To connect to the real API:
//   1. Set USE_MOCK = false
//   2. Set NEXT_PUBLIC_API_URL in your .env.local
// Nothing else needs to change.

import { Deal, UserPreferences, DealFilters } from "@/types";
import { mockDeals } from "@/data/mock-deals";
import { loadPreferences, savePreferences as storageSave } from "@/lib/storage";
import { getDestination } from "@/data/destinations";
import { getAirport } from "@/data/airports";

const USE_MOCK = false;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9000";

// ─── Backend response shape ────────────────────────────────────────────────────
// Matches FlightModel.to_api_dict() from database/models/flight.py exactly.
// Keep this in sync with the backend model if fields are added/renamed.
export interface BackendFlight {
  flight_key: string;       // "{origin}-{dest}-{outbound}-{return}-{price}"
  origin: string;
  destination: string;      // IATA code, e.g. "BCN"
  outbound_date: string;    // YYYY-MM-DD
  return_date: string;      // YYYY-MM-DD
  price: number;            // EUR
  airlines: string[];       // backend stores a list; we join for display
  is_direct: boolean;       // outbound_stops == 0 && return_stops == 0
  deal_score: number;       // 0–100
  is_deal: boolean;
  azair_link: string;
  duration_days: number;
  outbound_departure: string;
  outbound_arrival: string;
  return_departure: string;
  return_arrival: string;
  outbound_duration: string;
  return_duration: string;
  outbound_stops: number;
  return_stops: number;
}

// ─── Transform: backend shape → frontend Deal ─────────────────────────────────
// All field mismatches resolved here, in one place.
function transformFlight(f: BackendFlight): Deal {
  return {
    id: f.flight_key,
    origin: f.origin,
    destination: f.destination,
    destination_city: getDestination(f.destination)?.name ?? f.destination,
    outbound_date: f.outbound_date,
    return_date: f.return_date,
    price: f.price,
    airline: f.airlines.join(", "),
    is_direct: f.is_direct,
    deal_score: f.deal_score,
    // Mirrors backend thresholds in database/config.py
    is_hot_deal: f.price < 75 || f.deal_score >= 90,
    azair_link: f.azair_link,
    duration_days: f.duration_days,
    outbound_departure: f.outbound_departure,
    outbound_arrival: f.outbound_arrival,
    return_departure: f.return_departure,
    return_arrival: f.return_arrival,
    outbound_duration: f.outbound_duration,
    return_duration: f.return_duration,
    outbound_stops: f.outbound_stops,
    return_stops: f.return_stops,
  };
}

// ─── Deals ────────────────────────────────────────────────────────────────────
// Real API returns deals pre-filtered by user preferences (server-side matching).
// Pages apply additional UI-level filtering on top (client-side).
export async function getDeals(): Promise<Deal[]> {
  if (USE_MOCK) return mockDeals;

  const res = await fetch(`${API_BASE}/api/deals`);
  if (!res.ok) throw new Error(`Failed to fetch deals: ${res.status}`);
  const data: { deals: BackendFlight[] } = await res.json();
  return data.deals.map(transformFlight);
}

// ─── User preferences ─────────────────────────────────────────────────────────
export async function getPreferences(): Promise<UserPreferences> {
  if (USE_MOCK) return loadPreferences();

  const res = await fetch(`${API_BASE}/api/preferences`);
  if (!res.ok) throw new Error(`Failed to fetch preferences: ${res.status}`);
  return res.json();
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  if (USE_MOCK) { storageSave(prefs); return; }

  const res = await fetch(`${API_BASE}/api/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`Failed to save preferences: ${res.status}`);
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

export interface ScrapeResult {
  new: number;
  updated: number;
  deals: number;
  hot_deals: number;
}

export interface ScrapeState {
  status: "idle" | "running" | "done" | "error";
  started_at: string | null;
  finished_at: string | null;
  result: ScrapeResult | null;
  error: string | null;
}

export async function triggerScrape(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/scrape`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to start scrape: ${res.status}`);
  return res.json();
}

export async function getScrapeStatus(): Promise<ScrapeState> {
  const res = await fetch(`${API_BASE}/api/scrape/status`);
  if (!res.ok) throw new Error(`Failed to get scrape status: ${res.status}`);
  return res.json();
}

// ─── Azair search URL builder ─────────────────────────────────────────────────
// Builds a flexible search URL for the same route/dates so the user can browse
// alternatives on Azair (±3 days departure/return, ±2 days trip duration).
export function buildAzairSearchUrl(deal: Deal): string {
  const origin = deal.origin;
  const dest = deal.destination;

  const originCity = getAirport(origin)?.city ?? origin;
  const destCity = getDestination(dest)?.name ?? dest;

  const parseLocal = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fmtMonth = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  const out = parseLocal(deal.outbound_date);
  const ret = parseLocal(deal.return_date);
  const dep = addDays(out, -3);
  const arr = addDays(ret, 3);

  const dur = deal.duration_days ?? Math.ceil((ret.getTime() - out.getTime()) / 86400000);
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
