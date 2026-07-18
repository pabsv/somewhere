// GENERATED — edit scraper/targets.py, then run: python -m scripts.export_destinations

export interface Origin {
  code: string;
  name: string;
  country: string;
}

// Active origins only. Inactive extras (e.g. DUS, NRN) live
// commented-out in scraper/targets.py — re-enable there and re-run.
export const ORIGINS: Origin[] = [
  { code: "EIN", name: "Eindhoven", country: "NL" },
  { code: "AMS", name: "Amsterdam Schiphol", country: "NL" },
  { code: "BRU", name: "Brussels", country: "BE" },
  { code: "CRL", name: "Brussels-Charleroi", country: "BE" },
  { code: "MST", name: "Maastricht", country: "NL" },
  { code: "DUS", name: "Düsseldorf", country: "DE" },
];
