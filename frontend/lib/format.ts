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

/** "+€8" / "−€4" / "±€0" — signed whole-euro delta vs a reference fare. */
export function formatDelta(delta: number): string {
  const r = Math.round(delta);
  if (r > 0) return `+€${r}`;
  if (r < 0) return `−€${-r}`;
  return "±€0";
}
