import { UserPreferences } from "@/types";

const defaultUserPreferences: UserPreferences = {
  home_airport: "",
  nearby_airports: [],
  destinations: [],
  availability: [],
  max_price: 150,
  direct_only: false,
};

const STORAGE_KEY = "flight-scraper-preferences";

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultUserPreferences;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultUserPreferences;

  try {
    return JSON.parse(stored) as UserPreferences;
  } catch {
    return defaultUserPreferences;
  }
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
