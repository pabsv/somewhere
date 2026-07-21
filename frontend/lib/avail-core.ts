// ─── Availability-window matching — pure, Mongo-free (unit-testable) ─────────
// Used by lib/queries.ts (server) and tested directly:
//   npx tsx --test lib/__tests__/near-avail.test.ts

/** A user availability window, normalized to YYYY-MM-DD strings. */
export interface AvailWindow {
  start: string;
  end: string;
  /** Hour (5–23) the user gets free on `start`; null = all day. */
  startTime: number | null;
  /** Hour (1–23) the user must be back by on `end`; null = all day. */
  endTime: number | null;
}

/**
 * True if [outbound,return] fits ENTIRELY inside at least one window,
 * respecting the window's edge times: on the first day the outbound must
 * depart at/after startTime, on the last day the return must arrive at/before
 * endTime. Legs with unparseable times are never filtered out.
 */
export function fitsAnyWindow(
  outbound: string,
  ret: string,
  windows: AvailWindow[],
  depHour: number | null = null,
  arrHour: number | null = null,
): boolean {
  for (const w of windows) {
    if (outbound < w.start || ret > w.end) continue;
    if (
      w.startTime !== null &&
      outbound === w.start &&
      depHour !== null &&
      depHour < w.startTime
    )
      continue;
    if (
      w.endTime !== null &&
      ret === w.end &&
      arrHour !== null &&
      arrHour > w.endTime
    )
      continue;
    return true;
  }
  return false;
}

/**
 * How far outside a free window a trip may hang and still be offered, in days
 * TOTAL across both edges — the "± 2 days" chip. Two is the whole budget: a
 * trip can leave two days early, come back two days late, or split one each
 * way. Beyond that it stops being your trip with a day of slack and starts
 * being a different trip.
 */
export const NEAR_AVAIL_MAX_SPILL_DAYS = 2;

/** Whole days between two YYYY-MM-DD strings (b − a). */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * Near-miss sibling of `fitsAnyWindow`: the trip does NOT fit exactly, but
 * hangs over some window's edge by at most `maxSpillDays` in TOTAL (out side +
 * ret side combined). Returns the smallest-spill match, or null. Edge-hour
 * checks apply only on a boundary day that is NOT spilled — a spilled day is
 * outside the window anyway, so its hours are meaningless.
 */
export function nearMissWindow(
  outbound: string,
  ret: string,
  windows: AvailWindow[],
  depHour: number | null = null,
  arrHour: number | null = null,
  maxSpillDays = NEAR_AVAIL_MAX_SPILL_DAYS,
): { out_spill: number; ret_spill: number } | null {
  let best: { out_spill: number; ret_spill: number } | null = null;
  for (const w of windows) {
    const out_spill = Math.max(0, dayDiff(outbound, w.start));
    const ret_spill = Math.max(0, dayDiff(w.end, ret));
    if (out_spill + ret_spill > maxSpillDays) continue;
    if (
      out_spill === 0 &&
      w.startTime !== null &&
      outbound === w.start &&
      depHour !== null &&
      depHour < w.startTime
    )
      continue;
    if (
      ret_spill === 0 &&
      w.endTime !== null &&
      ret === w.end &&
      arrHour !== null &&
      arrHour > w.endTime
    )
      continue;
    if (!best || out_spill + ret_spill < best.out_spill + best.ret_spill) {
      best = { out_spill, ret_spill };
    }
  }
  return best;
}
