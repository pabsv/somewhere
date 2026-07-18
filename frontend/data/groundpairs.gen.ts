// GENERATED — edit scraper/targets.py, then run: python -m scripts.export_destinations

// Overland twin-city pairs (docs/MULTICITY_PLAN.md Phase 4). Each
// unordered pair appears ONCE; getGroundLinks expands both directions.
// `hours` = approximate one-way ground time — display info only.

export interface GroundPair {
  a: string;
  b: string;
  hours: number;
}

export interface GroundLink {
  other: string;
  hours: number;
}

export const GROUND_PAIRS: GroundPair[] = [
  { a: "BCN", b: "MAD", hours: 2.5 },
  { a: "BCN", b: "VLC", hours: 3.0 },
  { a: "BCN", b: "ZAZ", hours: 1.5 },
  { a: "MAD", b: "ZAZ", hours: 1.5 },
  { a: "MAD", b: "VLC", hours: 2.0 },
  { a: "MAD", b: "SVQ", hours: 2.5 },
  { a: "SVQ", b: "AGP", hours: 2.0 },
  { a: "SVQ", b: "XRY", hours: 1.0 },
  { a: "AGP", b: "GRX", hours: 1.5 },
  { a: "ALC", b: "VLC", hours: 2.0 },
  { a: "BIO", b: "SDR", hours: 1.5 },
  { a: "BIO", b: "EAS", hours: 1.5 },
  { a: "LIS", b: "OPO", hours: 3.0 },
  { a: "LIS", b: "FAO", hours: 3.0 },
  { a: "FCO", b: "NAP", hours: 1.2 },
  { a: "FCO", b: "FLR", hours: 1.5 },
  { a: "FLR", b: "BLQ", hours: 1.0 },
  { a: "FLR", b: "PSA", hours: 1.0 },
  { a: "MXP", b: "TRN", hours: 1.0 },
  { a: "MXP", b: "GOA", hours: 2.0 },
  { a: "MXP", b: "BLQ", hours: 1.5 },
  { a: "MXP", b: "VCE", hours: 2.5 },
  { a: "VRN", b: "VCE", hours: 1.2 },
  { a: "VCE", b: "BLQ", hours: 1.5 },
  { a: "BRI", b: "BDS", hours: 1.0 },
  { a: "PMO", b: "CTA", hours: 3.0 },
  { a: "MRS", b: "NCE", hours: 2.5 },
  { a: "LYS", b: "MRS", hours: 1.7 },
  { a: "MPL", b: "MRS", hours: 1.5 },
  { a: "TLS", b: "BOD", hours: 2.2 },
  { a: "BOD", b: "BIQ", hours: 2.0 },
  { a: "BER", b: "LEJ", hours: 1.2 },
  { a: "BER", b: "DRS", hours: 2.0 },
  { a: "HAM", b: "BRE", hours: 1.0 },
  { a: "MUC", b: "NUE", hours: 1.0 },
  { a: "MUC", b: "SZG", hours: 1.5 },
  { a: "MUC", b: "INN", hours: 2.0 },
  { a: "FRA", b: "STR", hours: 1.3 },
  { a: "ZRH", b: "BSL", hours: 1.0 },
  { a: "GVA", b: "LYS", hours: 2.0 },
  { a: "VIE", b: "BUD", hours: 2.5 },
  { a: "VIE", b: "BTS", hours: 1.0 },
  { a: "VIE", b: "PRG", hours: 4.0 },
  { a: "VIE", b: "GRZ", hours: 2.5 },
  { a: "VIE", b: "BRQ", hours: 2.0 },
  { a: "PRG", b: "BRQ", hours: 2.5 },
  { a: "KRK", b: "KTW", hours: 1.0 },
  { a: "KRK", b: "WAW", hours: 2.5 },
  { a: "WAW", b: "GDN", hours: 3.0 },
  { a: "ZAG", b: "LJU", hours: 2.5 },
  { a: "SPU", b: "ZAD", hours: 1.5 },
  { a: "SPU", b: "DBV", hours: 3.0 },
  { a: "DBV", b: "TIV", hours: 1.0 },
  { a: "SOF", b: "PDV", hours: 2.0 },
  { a: "SOF", b: "SKP", hours: 3.5 },
  { a: "VAR", b: "BOJ", hours: 1.5 },
  { a: "LCA", b: "PFO", hours: 1.5 },
  { a: "CPH", b: "MMX", hours: 0.7 },
  { a: "CPH", b: "GOT", hours: 3.5 },
  { a: "GOT", b: "OSL", hours: 3.5 },
  { a: "HEL", b: "TLL", hours: 2.0 },
  { a: "RIX", b: "VNO", hours: 4.0 },
  { a: "VNO", b: "KUN", hours: 1.2 },
  { a: "EDI", b: "GLA", hours: 1.0 },
  { a: "MAN", b: "LPL", hours: 1.0 },
  { a: "DUB", b: "ORK", hours: 2.5 },
  { a: "RAK", b: "CMN", hours: 3.0 },
  { a: "CMN", b: "TNG", hours: 2.0 },
];

const LINKS = new Map<string, GroundLink[]>();
for (const { a, b, hours } of GROUND_PAIRS) {
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    const list = LINKS.get(from) ?? [];
    list.push({ other: to, hours });
    LINKS.set(from, list);
  }
}

/** Ground links touching `code`, both directions. [] when none. */
export function getGroundLinks(code: string): GroundLink[] {
  return LINKS.get(code) ?? [];
}
