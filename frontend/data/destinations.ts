import { Destination } from "@/types";

export const destinations: Destination[] = [
  // Spain
  { code: "BCN", name: "Barcelona", country: "ES", region: "Southern Europe" },
  { code: "MAD", name: "Madrid", country: "ES", region: "Southern Europe" },
  { code: "AGP", name: "Malaga", country: "ES", region: "Southern Europe" },
  { code: "PMI", name: "Palma de Mallorca", country: "ES", region: "Southern Europe" },
  { code: "IBZ", name: "Ibiza", country: "ES", region: "Southern Europe" },
  { code: "VLC", name: "Valencia", country: "ES", region: "Southern Europe" },
  { code: "ALC", name: "Alicante", country: "ES", region: "Southern Europe" },

  // Portugal
  { code: "LIS", name: "Lisbon", country: "PT", region: "Southern Europe" },
  { code: "OPO", name: "Porto", country: "PT", region: "Southern Europe" },
  { code: "FAO", name: "Faro", country: "PT", region: "Southern Europe" },

  // Italy
  { code: "FCO", name: "Rome", country: "IT", region: "Southern Europe" },
  { code: "MXP", name: "Milan", country: "IT", region: "Southern Europe" },
  { code: "NAP", name: "Naples", country: "IT", region: "Southern Europe" },
  { code: "VCE", name: "Venice", country: "IT", region: "Southern Europe" },
  { code: "BGY", name: "Bergamo", country: "IT", region: "Southern Europe" },
  { code: "PSA", name: "Pisa", country: "IT", region: "Southern Europe" },

  // Greece
  { code: "ATH", name: "Athens", country: "GR", region: "Southern Europe" },
  { code: "SKG", name: "Thessaloniki", country: "GR", region: "Southern Europe" },
  { code: "HER", name: "Heraklion", country: "GR", region: "Southern Europe" },
  { code: "RHO", name: "Rhodes", country: "GR", region: "Southern Europe" },

  // Eastern Europe
  { code: "BUD", name: "Budapest", country: "HU", region: "Eastern Europe" },
  { code: "PRG", name: "Prague", country: "CZ", region: "Eastern Europe" },
  { code: "WAW", name: "Warsaw", country: "PL", region: "Eastern Europe" },
  { code: "KRK", name: "Krakow", country: "PL", region: "Eastern Europe" },
  { code: "VIE", name: "Vienna", country: "AT", region: "Eastern Europe" },
  { code: "ZAG", name: "Zagreb", country: "HR", region: "Eastern Europe" },
  { code: "BEG", name: "Belgrade", country: "RS", region: "Eastern Europe" },
  { code: "SOF", name: "Sofia", country: "BG", region: "Eastern Europe" },
  { code: "OTP", name: "Bucharest", country: "RO", region: "Eastern Europe" },
  { code: "CLJ", name: "Cluj-Napoca", country: "RO", region: "Eastern Europe" },

  // Germany
  { code: "BER", name: "Berlin", country: "DE", region: "Northern Europe" },

  // Northern Europe
  { code: "CPH", name: "Copenhagen", country: "DK", region: "Northern Europe" },
  { code: "ARN", name: "Stockholm", country: "SE", region: "Northern Europe" },
  { code: "OSL", name: "Oslo", country: "NO", region: "Northern Europe" },
  { code: "HEL", name: "Helsinki", country: "FI", region: "Northern Europe" },
  { code: "KEF", name: "Reykjavik", country: "IS", region: "Northern Europe" },

  // UK & Ireland
  { code: "DUB", name: "Dublin", country: "IE", region: "UK & Ireland" },
  { code: "EDI", name: "Edinburgh", country: "GB", region: "UK & Ireland" },
  { code: "MAN", name: "Manchester", country: "GB", region: "UK & Ireland" },
  { code: "STN", name: "London Stansted", country: "GB", region: "UK & Ireland" },
  { code: "LTN", name: "London Luton", country: "GB", region: "UK & Ireland" },

  // North Africa
  { code: "RAK", name: "Marrakech", country: "MA", region: "North Africa" },
  { code: "AGA", name: "Agadir", country: "MA", region: "North Africa" },
  { code: "TNG", name: "Tangier", country: "MA", region: "North Africa" },

  // Other
  { code: "MLA", name: "Malta", country: "MT", region: "Southern Europe" },
];

export const regions = [
  "Southern Europe",
  "Eastern Europe",
  "Northern Europe",
  "UK & Ireland",
  "North Africa",
];

export function getDestinationsByRegion(region: string): Destination[] {
  return destinations.filter(d => d.region === region);
}

export function getDestination(code: string): Destination | undefined {
  return destinations.find(d => d.code === code);
}
