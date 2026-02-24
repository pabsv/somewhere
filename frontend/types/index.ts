// Core types matching backend data format

export interface Deal {
  id: string;
  origin: string;
  destination: string;
  destination_city: string;
  outbound_date: string; // YYYY-MM-DD
  return_date: string;   // YYYY-MM-DD
  price: number;
  airline: string;
  is_direct: boolean;
  deal_score: number;    // 0-100
  is_hot_deal: boolean;
  azair_link: string;
  // Extended flight details (from backend)
  duration_days?: number;
  outbound_departure?: string;
  outbound_arrival?: string;
  return_departure?: string;
  return_arrival?: string;
  outbound_duration?: string;
  return_duration?: string;
  outbound_stops?: number;
  return_stops?: number;
}

export interface DateWindow {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label?: string;
}

export interface UserPreferences {
  home_airport: string;
  nearby_airports: string[];
  destinations: string[];
  availability: DateWindow[];
  max_price: number;
  direct_only: boolean;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface Destination {
  code: string;
  name: string;
  country: string;
  region: string;
}

// Filter state for deals view
export interface DealFilters {
  origin: string | null;
  destination: string | null;
  max_price: number | null;
  direct_only: boolean;
  date_from: string | null;
  date_to: string | null;
}

// Calendar day state
export type DayState =
  | "empty"      // No interaction
  | "available"  // User marked as available
  | "has-deals"  // Deals exist for this date
  | "selected";  // Currently selected/focused
