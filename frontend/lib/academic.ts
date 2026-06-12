// ─── Academic-calendar availability logic — pure, no IO ─────────────────────
// Spec: docs/AVAILABILITY_V2.md. All dates are YYYY-MM-DD strings (lexically
// comparable). Shared by server queries and client UI.
//
// Day precedence:
//   1. explicit user window        → free (manual override wins)
//   2. exam / pre_exam span        → busy (blackout)
//   3. mandatory weekday on a teaching day → busy
//   4. otherwise                   → free

import {
  TUE_2026_2027,
  type AcademicCalendar,
  type CalSpan,
} from "@/data/calendars/tue-2026-2027";

/** ISO weekdays per quartile: 1 = Mon … 7 = Sun. */
export interface BusyWeekdays {
  q1: number[];
  q2: number[];
  q3: number[];
  q4: number[];
}

export const EMPTY_BUSY_WEEKDAYS: BusyWeekdays = { q1: [], q2: [], q3: [], q4: [] };

const CALENDARS: Record<string, AcademicCalendar> = {
  [TUE_2026_2027.id]: TUE_2026_2027,
};

export function getCalendar(id: string | null | undefined): AcademicCalendar | null {
  return id ? (CALENDARS[id] ?? null) : null;
}

/** All registered calendars (for pickers). */
export function listCalendars(): AcademicCalendar[] {
  return Object.values(CALENDARS);
}

const inSpan = (date: string, s: { start: string; end: string }): boolean =>
  date >= s.start && date <= s.end;

/** ISO weekday 1=Mon…7=Sun for a YYYY-MM-DD (local, component-parsed). */
export function isoWeekday(date: string): number {
  const d = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  ).getDay(); // 0=Sun…6=Sat
  return d === 0 ? 7 : d;
}

function spansOfKind(cal: AcademicCalendar, kind: CalSpan["kind"]): CalSpan[] {
  return cal.spans.filter((s) => s.kind === kind);
}

/** The quartile (1–4) whose course range contains the date, else null. */
export function quartileOf(date: string, cal: AcademicCalendar): 1 | 2 | 3 | 4 | null {
  for (const q of cal.quartiles) {
    if (date >= q.courses_start && date <= q.courses_end) return q.q;
  }
  return null;
}

export type DayClass = "free" | "blackout" | "busy_weekday";

/**
 * Classify a single day against the calendar + per-quartile mandatory
 * weekdays. Does NOT consider explicit user windows — callers apply that
 * override first (precedence 1).
 */
export function classifyDay(
  date: string,
  cal: AcademicCalendar,
  busy: BusyWeekdays,
): DayClass {
  for (const s of cal.spans) {
    if ((s.kind === "exam" || s.kind === "pre_exam") && inSpan(date, s)) {
      return "blackout";
    }
  }

  const q = quartileOf(date, cal);
  if (q !== null) {
    const isTeachingDay = !spansOfKind(cal, "no_teaching").some((s) =>
      inSpan(date, s),
    );
    if (isTeachingDay) {
      const wd = isoWeekday(date);
      const list = busy[`q${q}` as keyof BusyWeekdays] ?? [];
      if (list.includes(wd)) return "busy_weekday";
    }
  }

  return "free";
}

/** Day inside any explicit window? */
function inAnyWindow(
  date: string,
  windows: { start: string; end: string }[],
): boolean {
  return windows.some((w) => inSpan(date, w));
}

function nextDay(date: string): string {
  const d = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)) + 1,
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Trip allowed iff every day of [outbound, return] (inclusive) is free under
 * the precedence rules. Explicit windows override the calendar entirely.
 * Guard: intervals longer than 60 days are rejected (corrupt data).
 */
export function tripAllowed(
  outbound: string,
  ret: string,
  cal: AcademicCalendar,
  busy: BusyWeekdays,
  explicitWindows: { start: string; end: string }[],
): boolean {
  if (ret < outbound) return false;
  let day = outbound;
  for (let i = 0; i <= 60; i++) {
    if (!inAnyWindow(day, explicitWindows)) {
      if (classifyDay(day, cal, busy) !== "free") return false;
    }
    if (day === ret) return true;
    day = nextDay(day);
  }
  return false;
}

/** Hot spans (UI affordance) that intersect [start, end]. */
export function hotSpansIn(
  cal: AcademicCalendar,
  start: string,
  end: string,
): CalSpan[] {
  return spansOfKind(cal, "hot").filter((s) => !(s.end < start || s.start > end));
}
