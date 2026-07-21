// ─── Display formatting — pure, locale-stable ────────────────────────────────
// All flight data renders in mono (Spline Sans Mono); these helpers produce
// the exact strings the design system expects. Bare YYYY-MM-DD strings are
// parsed component-wise (new Date(y, m-1, d)) — NEVER new Date("YYYY-MM-DD"),
// which would parse as UTC midnight and shift dates in west-of-UTC zones.

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Local-safe parse of a bare YYYY-MM-DD string. */
export function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "€39" — whole euros, no decimals. */
export function formatPrice(n: number): string {
  return `€${Math.round(n)}`;
}

/** "2026-06-21" → "21 Jun" */
export function formatDateShort(date: string): string {
  const d = parseLocalDate(date);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "2026-06-21" → "21 JUN" — departure-board style. */
export function formatDateBoard(date: string): string {
  return formatDateShort(date).toUpperCase();
}

/**
 * Date range label:
 *   same month      → "21–31 Jan"        (en dash, no spaces)
 *   across months   → "28 Jan – 3 Feb"   (en dash, spaced)
 */
export function formatRange(out: string, ret: string): string {
  const o = parseLocalDate(out);
  const r = parseLocalDate(ret);

  if (o.getMonth() === r.getMonth() && o.getFullYear() === r.getFullYear()) {
    return `${o.getDate()}–${r.getDate()} ${MONTHS_SHORT[o.getMonth()]}`;
  }
  return `${o.getDate()} ${MONTHS_SHORT[o.getMonth()]} – ${r.getDate()} ${MONTHS_SHORT[r.getMonth()]}`;
}

/** "1 night" / "10 nights" */
export function nightsLabel(n: number): string {
  return n === 1 ? "1 night" : `${n} nights`;
}

/**
 * Nights between two YYYY-MM-DD dates (backDate − outDate in days).
 * Parsed as UTC midnight on both sides on purpose — this is a difference, not
 * a display date, so the DST-free UTC arithmetic is what we want.
 */
export function nightsBetween(outDate: string, backDate: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round(
    (Date.parse(`${backDate}T00:00:00Z`) - Date.parse(`${outDate}T00:00:00Z`)) /
      MS_PER_DAY,
  );
}

/** "+€8" / "−€4" / "±€0" — signed whole-euro delta vs a reference fare. */
export function formatDelta(delta: number): string {
  const r = Math.round(delta);
  if (r > 0) return `+€${r}`;
  if (r < 0) return `−€${-r}`;
  return "±€0";
}

// ─── Near-miss ("± 2 days") wording ──────────────────────────────────────────
// The spill budget is 2 days TOTAL, so a trip can also hang over BOTH edges at
// once (1 + 1) — which the old one-sided phrasing silently dropped. Shared by
// TripBar, TripRail, TripTooltip, TripPopover and AgendaMonth so the five of
// them can't drift apart again.

/** How far a trip hangs outside its free window, per edge. */
export interface NearAvailSpill {
  out_spill: number;
  ret_spill: number;
}

/** Compact bar/tag mark: "−2d" (leaves early), "+1d" (back late), "±1d" (both). */
export function nearMissMark(na: NearAvailSpill): string {
  if (na.out_spill > 0 && na.ret_spill > 0) return `±${na.out_spill}d`;
  return na.out_spill > 0 ? `−${na.out_spill}d` : `+${na.ret_spill}d`;
}

/**
 * Sentence fragment, lower-case so it can follow a dash mid-sentence:
 * "leaves 2 days before your free window" / "returns 1 day after your free
 * window" / "leaves a day early and returns a day late".
 */
export function nearMissPhrase(na: NearAvailSpill): string {
  const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  if (na.out_spill > 0 && na.ret_spill > 0) {
    return `leaves ${days(na.out_spill)} early and returns ${days(na.ret_spill)} late`;
  }
  return na.out_spill > 0
    ? `leaves ${days(na.out_spill)} before your free window`
    : `returns ${days(na.ret_spill)} after your free window`;
}

/** `nearMissPhrase` with the first letter capitalised, for standalone lines. */
export function nearMissSentence(na: NearAvailSpill): string {
  const p = nearMissPhrase(na);
  return p.charAt(0).toUpperCase() + p.slice(1);
}
