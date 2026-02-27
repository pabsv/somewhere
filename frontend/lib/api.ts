// ─── API abstraction layer ─────────────────────────────────────────────────────
// All pages import from here. To connect to the real API:
//   1. Set USE_MOCK = false
//   2. Set NEXT_PUBLIC_API_URL in your .env.local
// Nothing else needs to change.

import { Deal, UserPreferences, DealFilters } from "@/types";
import { loadPreferences, savePreferences as storageSave } from "@/lib/storage";
import { getDestination } from "@/data/destinations";
import { getAirport } from "@/data/airports";
import { getStoredUser } from "@/lib/auth";

const USE_MOCK = false;

function authHeaders(): HeadersInit {
  const user = getStoredUser();
  return user ? { "X-User-ID": user.user_id } : {};
}

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

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
}

export async function login(name: string, email: string): Promise<AuthUser> {
  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json();
}

export async function verifySession(userId: string): Promise<AuthUser> {
  const res = await fetch(`/api/auth/me`, {
    headers: { "X-User-ID": userId },
  });
  if (!res.ok) throw new Error("Session invalid");
  return res.json();
}

// ─── Deals ────────────────────────────────────────────────────────────────────
// Real API returns deals pre-filtered by user preferences (server-side matching).
// Pages apply additional UI-level filtering on top (client-side).
export async function getDeals(): Promise<Deal[]> {
  if (USE_MOCK) return [];

  const res = await fetch(`/api/deals`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch deals: ${res.status}`);
  const data: { deals: BackendFlight[] } = await res.json();
  return data.deals.map(transformFlight);
}

// ─── User preferences ─────────────────────────────────────────────────────────
export async function getPreferences(): Promise<UserPreferences> {
  if (USE_MOCK) return loadPreferences();

  const res = await fetch(`/api/preferences`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch preferences: ${res.status}`);
  return res.json();
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  if (USE_MOCK) { storageSave(prefs); return; }

  const res = await fetch(`/api/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error(`Failed to save preferences: ${res.status}`);
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string | null;
  airports: { home: string; nearby: string[] };
}

export async function getAdminUsers(): Promise<{ users: AdminUser[]; total: number }> {
  const res = await fetch(`/api/admin/users`);
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  return res.json();
}

export async function clearAllData(): Promise<{ deleted: Record<string, number> }> {
  const res = await fetch(`/api/admin/clear`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to clear data: ${res.status}`);
  return res.json();
}

export interface OriginScheduleState {
  origin: string;
  status: "idle" | "running" | "done" | "error";
  last_run_at: string | null;
  finished_at: string | null;
  next_run_at: string | null;
  period_minutes: number | null;
  last_result: { new: number; updated: number; deals: number; hot_deals: number } | null;
  last_error: string | null;
}

export async function getScheduleStatus(): Promise<{ states: OriginScheduleState[] }> {
  const res = await fetch(`/api/admin/schedule`);
  if (!res.ok) throw new Error(`Failed to fetch schedule: ${res.status}`);
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
