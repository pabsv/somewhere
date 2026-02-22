import { UserPreferences } from "@/types";

// Default user preferences for development
export const defaultUserPreferences: UserPreferences = {
  home_airport: "EIN",
  nearby_airports: ["AMS", "BRU"],
  destinations: ["BCN", "LIS", "ATH", "BUD", "RAK", "PRG", "NAP"],
  availability: [
    { start: "2026-03-01", end: "2026-03-15", label: "Spring break" },
    { start: "2026-04-25", end: "2026-05-05", label: "May holiday" },
  ],
  min_days: 2,
  max_days: 7,
  max_price: 150,
  direct_only: false,
};
