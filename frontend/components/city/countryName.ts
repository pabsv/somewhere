// ─── Country names for the City detail header (Track E) ──────────────────────
// CitySummary.country carries ISO-3166 alpha-2 codes only; the header shows the
// human name. Self-contained on purpose — Track E must not import Track C's
// components/explore/countries.ts. Unknown codes fall back to the raw code so a
// regenerated dataset never renders blank.

const COUNTRY_NAMES: Record<string, string> = {
  AL: "Albania",
  AT: "Austria",
  BA: "Bosnia & Herzegovina",
  BG: "Bulgaria",
  CH: "Switzerland",
  CV: "Cape Verde",
  CY: "Cyprus",
  CZ: "Czechia",
  DE: "Germany",
  DK: "Denmark",
  EE: "Estonia",
  EG: "Egypt",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IL: "Israel",
  IS: "Iceland",
  IT: "Italy",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MA: "Morocco",
  ME: "Montenegro",
  MK: "North Macedonia",
  MT: "Malta",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  RS: "Serbia",
  SE: "Sweden",
  SI: "Slovenia",
  SK: "Slovakia",
  TN: "Tunisia",
  TR: "Türkiye",
  XK: "Kosovo",
};

/** "ES" → "Spain"; unknown codes pass through unchanged. */
export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}
