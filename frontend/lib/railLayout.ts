// ─── Rail layout — pure vertical-timeline geometry for the mobile calendar ───
// The phone calendar is the desktop gantt rotated 90°: dates run DOWN one
// continuous rail, trips hang across it as lanes. This module owns the only
// tricky part — turning a date range into pixel offsets when some runs of
// empty days are collapsed — so it can be unit-tested without React or Mongo.
//
// All dates are bare YYYY-MM-DD strings (lexicographically comparable), same
// convention as lib/avail-core.ts and components/tripcal/calendarMath.ts.

export const ROW_H = 20;
/** Height of one collapsed "nothing here" run. */
export const COLLAPSE_H = 26;
/** A run of empty days shorter than this is never collapsed. */
export const COLLAPSE_MIN = 5;
/**
 * Height of the band that introduces each month. It's a real row in the
 * layout, not an overlay — an overlaid label sits on top of whatever tag
 * happens to start that month and makes it unreadable.
 */
export const MONTH_H = 26;

export interface RailRow {
  /** YYYY-MM-DD */
  date: string;
  top: number;
  /** 0=Sun … 6=Sat */
  dow: number;
  /** day-of-month, 1-based */
  day: number;
  /** first day of a month → the 3-letter month label to print, else null */
  monthLabel: string | null;
}

export interface RailCollapse {
  /** first hidden day, inclusive */
  from: string;
  /** last hidden day, inclusive */
  to: string;
  days: number;
  top: number;
}

export interface RailMonthBand {
  /** "2026-08" */
  month: string;
  /** "August 2026" */
  label: string;
  top: number;
}

export interface RailLayout {
  rows: RailRow[];
  collapses: RailCollapse[];
  /** full-width month headers, one per month the rail enters */
  bands: RailMonthBand[];
  /** date → top offset in px. Collapsed days are absent. */
  offsets: Map<string, number>;
  /** total rail height in px */
  height: number;
}

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parse a bare YYYY-MM-DD as local midnight (never `new Date(str)` — that's UTC). */
function parseLocal(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Every YYYY-MM-DD from `start` to `end`, both inclusive. */
export function enumerateDays(start: string, end: string): string[] {
  const out: string[] = [];
  const d = parseLocal(start);
  const last = parseLocal(end);
  while (d <= last) {
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * Lay the rail out.
 *
 * `keep` is the set of days that must render as a full row no matter what — in
 * practice: every day a rendered trip spans, plus every day inside an
 * availability window. Maximal runs of ≥ COLLAPSE_MIN days outside `keep`
 * fold into a single "⋯ N days" row, which is what stops the default
 * "Only my free dates" view from being 6 000px of nothing.
 *
 * Collapsing is provably safe: any day a tag covers is in `keep` by
 * construction, so no tag can ever start or end inside a collapsed run.
 */
export function buildRailLayout(
  days: string[],
  keep: ReadonlySet<string>,
  { collapse = true }: { collapse?: boolean } = {},
): RailLayout {
  const rows: RailRow[] = [];
  const collapses: RailCollapse[] = [];
  const bands: RailMonthBand[] = [];
  const offsets = new Map<string, number>();
  let top = 0;
  let i = 0;
  let currentMonth = "";

  while (i < days.length) {
    if (collapse && !keep.has(days[i])) {
      let j = i;
      while (j < days.length && !keep.has(days[j])) j++;
      if (j - i >= COLLAPSE_MIN) {
        collapses.push({
          from: days[i],
          to: days[j - 1],
          days: j - i,
          top,
        });
        top += COLLAPSE_H;
        i = j;
        continue;
      }
    }
    const date = days[i];
    const d = parseLocal(date);
    const day = d.getDate();

    // A new month opens with its own full-width band, so the label never
    // shares a row with a tag. Driven by the rows we actually emit, so a
    // collapsed run that swallows the 1st still gets a band on the next
    // visible day of that month.
    const month = date.slice(0, 7);
    if (month !== currentMonth) {
      bands.push({
        month,
        label: `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`,
        top,
      });
      top += MONTH_H;
      currentMonth = month;
    }

    rows.push({
      date,
      top,
      dow: d.getDay(),
      day,
      monthLabel: day === 1 ? MONTHS_SHORT[d.getMonth()] : null,
    });
    offsets.set(date, top);
    top += ROW_H;
    i++;
  }

  return { rows, collapses, bands, offsets, height: top };
}

/**
 * Top/height for a bar spanning [out, ret], clamped to the laid-out range.
 * Returns null when neither end survives the layout (fully collapsed / off
 * the rail) — callers skip those trips.
 */
export function spanBox(
  layout: RailLayout,
  out: string,
  ret: string,
  firstDay: string,
  lastDay: string,
): { top: number; height: number; clippedStart: boolean; clippedEnd: boolean } | null {
  const start = out < firstDay ? firstDay : out;
  const end = ret > lastDay ? lastDay : ret;
  const a = layout.offsets.get(start);
  const b = layout.offsets.get(end);
  if (a == null || b == null) return null;
  return {
    top: a,
    height: b - a + ROW_H,
    clippedStart: out < firstDay,
    clippedEnd: ret > lastDay,
  };
}

/**
 * Re-index lanes so lane 0 holds the globally cheapest trip, lane 1 the next
 * cheapest lane leader, and so on.
 *
 * `assignLanes` is greedy first-fit, so its lane index says nothing about
 * price — on a phone, where only ~4.8 lanes are visible without swiping, that
 * would bury cheap fares off-screen. Permuting whole lanes is collision-safe
 * by construction: every trip in a lane moves together, so no two trips that
 * previously shared a lane can now overlap in a different one.
 */
export function rankLanesByPrice(
  lanes: ReadonlyMap<string, number>,
  priceOf: ReadonlyMap<string, number>,
): Map<string, number> {
  const cheapest = new Map<number, number>();
  for (const [key, lane] of lanes) {
    const p = priceOf.get(key);
    if (p == null) continue;
    const cur = cheapest.get(lane);
    if (cur == null || p < cur) cheapest.set(lane, p);
  }
  const order = [...cheapest.entries()]
    .sort((a, b) => (a[1] !== b[1] ? a[1] - b[1] : a[0] - b[0]))
    .map(([lane]) => lane);
  const remap = new Map<number, number>();
  order.forEach((lane, i) => remap.set(lane, i));

  const out = new Map<string, number>();
  for (const [key, lane] of lanes) out.set(key, remap.get(lane) ?? lane);
  return out;
}
