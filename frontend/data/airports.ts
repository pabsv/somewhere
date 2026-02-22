import { Airport } from "@/types";

export const airports: Airport[] = [
  // Netherlands
  { code: "EIN", name: "Eindhoven Airport", city: "Eindhoven", country: "NL" },
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "NL" },
  { code: "RTM", name: "Rotterdam The Hague", city: "Rotterdam", country: "NL" },

  // Belgium
  { code: "BRU", name: "Brussels Airport", city: "Brussels", country: "BE" },
  { code: "CRL", name: "Brussels South Charleroi", city: "Charleroi", country: "BE" },

  // Germany
  { code: "DUS", name: "Düsseldorf Airport", city: "Düsseldorf", country: "DE" },
  { code: "CGN", name: "Cologne Bonn Airport", city: "Cologne", country: "DE" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "DE" },
  { code: "DTM", name: "Dortmund Airport", city: "Dortmund", country: "DE" },
];

// Nearby airports for each departure point (within ~200km driving)
export const nearbyAirports: Record<string, string[]> = {
  "EIN": ["AMS", "BRU", "DUS", "CGN", "RTM", "CRL"],
  "AMS": ["EIN", "RTM", "BRU", "DUS"],
  "BRU": ["EIN", "AMS", "CRL", "DUS", "CGN"],
  "DUS": ["CGN", "EIN", "AMS", "DTM", "BRU"],
  "CGN": ["DUS", "BRU", "FRA", "DTM"],
  "RTM": ["AMS", "EIN", "BRU"],
  "CRL": ["BRU", "EIN"],
  "FRA": ["CGN", "DUS"],
  "DTM": ["DUS", "CGN"],
};

export function getAirport(code: string): Airport | undefined {
  return airports.find(a => a.code === code);
}

export function getNearbyAirports(code: string): Airport[] {
  const nearbyCodes = nearbyAirports[code] || [];
  return nearbyCodes.map(c => getAirport(c)).filter((a): a is Airport => !!a);
}
