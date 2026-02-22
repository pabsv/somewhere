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
  min_days: number;
  max_days: number;
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
