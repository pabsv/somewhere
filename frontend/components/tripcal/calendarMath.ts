// ─── Calendar math — pure date helpers for the gantt grid ────────────────────
// Track D (DESIGN_V1 §G). All dates are bare YYYY-MM-DD strings; we parse them
// component-wise via parseLocalDate (NOT new Date(str), which is UTC-parsed and
// off-by-one west of UTC). No IO.

import { parseLocalDate } from "@/lib/format";

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export interface MonthSpec {
  /** 0-based month index */
  month: number;
  year: number;
  /** "June 2026" */
  label: string;
  /** number of days in the month */
  days: number;
  /** "2026-06-01" first day, inclusive */
  startStr: string;
  /** "2026-06-30" last day, inclusive */
  endStr: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-06-09" → that exact day at local midnight, as a YYYY-MM-DD string. */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today at local midnight, YYYY-MM-DD. */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** Build the i-th day of a month as YYYY-MM-DD (day is 1-based). */
export function dayStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** 0=Sun … 6=Sat — weekend = Sat/Sun. */
export function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

/**
 * The N month specs starting from the month containing `from` (a YYYY-MM-DD).
 * Each spec carries enough to render a gantt block without re-parsing.
 */
export function monthSpan(from: string, count: number): MonthSpec[] {
  const base = parseLocalDate(from);
  const specs: MonthSpec[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    specs.push({
      month,
      year,
      label: `${MONTHS_LONG[month]} ${year}`,
      days,
      startStr: dayStr(year, month, 1),
      endStr: dayStr(year, month, days),
    });
  }
  return specs;
}

/** Add `n` calendar months to a YYYY-MM-DD, return YYYY-MM-DD (clamped day). */
export function addMonths(from: string, n: number): string {
  const d = parseLocalDate(from);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  // last day of the target month
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(d.getDate(), last);
  return dayStr(target.getFullYear(), target.getMonth(), day);
}

/**
 * 1-based column index (within a month) for a date that falls inside the month,
 * clamped to [1, days] for trips that start before / end after the month edges.
 */
export function clampDayInMonth(
  date: string,
  spec: MonthSpec,
): number {
  if (date < spec.startStr) return 1;
  if (date > spec.endStr) return spec.days;
  return parseLocalDate(date).getDate();
}

/** Does the [out,ret] inclusive interval intersect this month at all? */
export function spansMonth(
  out: string,
  ret: string,
  spec: MonthSpec,
): boolean {
  return !(ret < spec.startStr || out > spec.endStr);
}
