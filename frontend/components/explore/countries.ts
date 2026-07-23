// ─── Country names for the Explore grid + search ─────────────────────────────
// destinations.gen.ts carries ISO-3166 alpha-2 codes only; the grid shows the
// human name and search matches against it ("spain" → ES cities). Covers every
// code present in the generated data — unknown codes fall back to the raw code
// so a regenerated dataset never renders blank.

const COUNTRY_NAMES: Record<string, string> = {
  AE: "United Arab Emirates",
  AL: "Albania",
  AM: "Armenia",
  AT: "Austria",
  AZ: "Azerbaijan",
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
  GE: "Georgia",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IL: "Israel",
  IS: "Iceland",
  IT: "Italy",
  JO: "Jordan",
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
  QA: "Qatar",
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
