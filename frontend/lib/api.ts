// ─── API abstraction layer ─────────────────────────────────────────────────────
// All pages import from here. To connect to the real API:
//   1. Set USE_MOCK = false
//   2. Set NEXT_PUBLIC_API_URL in your .env.local
// Nothing else needs to change.

import { Deal, UserPreferences, DealFilters } from "@/types";
import { mockDeals } from "@/data/mock-deals";
import { loadPreferences, savePreferences as storageSave } from "@/lib/storage";
import { getDestination } from "@/data/destinations";

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
