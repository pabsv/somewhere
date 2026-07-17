// ─── Open-jaw pure core — no I/O, no Mongo ───────────────────────────────────
// The date-join that turns two one-way fare grids into candidate combos.
// Kept free of lib/mongodb imports so it stays unit-testable in isolation
// (lib/mongodb opens a connection at import time). lib/openjaw.ts wraps this
// with grid loading + round-trip comparison. Spec: docs/MULTICITY_PLAN.md
// Phase 1.

import { HARD_PRICE_CEILING } from "@/lib/score";

/**
 * Sanity floor on a single one-way fare — mirrors the save-time filter in
 * FlightService.save_oneway_grids as defense in depth against bad grid data.
 */
const MIN_LEG_PRICE = 1;

export interface CombineOptions {
  minNights: number;
  maxNights: number;
  /** cap on the combined price (both legs); defaults to HARD_PRICE_CEILING */
  maxPrice?: number | null;
  /** ISO date floor for the outbound leg; defaults to today (server TZ) */
  today?: string;
}

export interface GridCombo {
  outDate: string;
  backDate: string;
  outPrice: number;
  backPrice: number;
  total: number;
  nights: number;
}

/** Nights between two YYYY-MM-DD dates (backDate − outDate in days). */
export function nightsBetween(outDate: string, backDate: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round(
    (Date.parse(`${backDate}T00:00:00Z`) - Date.parse(`${outDate}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}

/**
 * Date-join two one-way grids into every (out, back) pair whose nights fall
 * in [minNights, maxNights] and whose combined price is within maxPrice.
 * Pure function, no I/O — mirrors the Python Phase-1 pairing in
 * scraper-fli/scraper.py search_one_route. Tolerates empty/sparse grids
 * (returns []). Results are unsorted; callers rank.
 */
export function combineGrids(
  outGrid: Record<string, number>,
  backGrid: Record<string, number>,
  opts: CombineOptions,
): GridCombo[] {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const effectiveMax =
    typeof opts.maxPrice === "number" && Number.isFinite(opts.maxPrice)
      ? Math.min(opts.maxPrice, HARD_PRICE_CEILING)
      : HARD_PRICE_CEILING;

  // Sorted back-grid dates let each outbound scan only its nights window.
  const backDates = Object.keys(backGrid).sort();

  const combos: GridCombo[] = [];
  for (const outDate of Object.keys(outGrid)) {
    if (outDate < today) continue;
    const outPrice = outGrid[outDate];
    if (!Number.isFinite(outPrice) || outPrice < MIN_LEG_PRICE) continue;

    for (const backDate of backDates) {
      if (backDate <= outDate) continue;
      const nights = nightsBetween(outDate, backDate);
      if (nights < opts.minNights) continue;
      if (nights > opts.maxNights) break; // sorted → nothing later fits

      const backPrice = backGrid[backDate];
      if (!Number.isFinite(backPrice) || backPrice < MIN_LEG_PRICE) continue;

      const total = outPrice + backPrice;
      if (total > effectiveMax) continue;

      combos.push({ outDate, backDate, outPrice, backPrice, total, nights });
    }
  }
  return combos;
}
