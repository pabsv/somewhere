// ─── University academic calendars ───────────────────────────────────────────
// Hardcoded no-teaching/exam periods overlaid (subtly) on every calendar
// surface for users who opt in via Settings → Preferences ("I'm a TU/e
// student", stored as preferences.university). Adding next year's calendar or
// another university is data-only: extend the periods array / this record and
// the UniversityId union in types/api.ts. Bare YYYY-MM-DD strings, inclusive
// on both ends, matching the rest of the codebase (lib/format.ts).
//
// Source: TU/e "Calendar academic year 2026-2027" PDF.

export type UniPeriodKind = "exam" | "break";

export interface UniPeriod {
  /** First day, YYYY-MM-DD inclusive. */
  start: string;
  /** Last day, YYYY-MM-DD inclusive. */
  end: string;
  kind: UniPeriodKind;
  label: string;
}

export type UniversityId = "tue";

const TUE_2026_2027: UniPeriod[] = [
  { start: "2026-09-25", end: "2026-09-25", kind: "break", label: "MomenTUm (no teaching)" },
  { start: "2026-10-26", end: "2026-11-07", kind: "exam", label: "Exams Q1" },
  { start: "2026-12-21", end: "2027-01-01", kind: "break", label: "Christmas recess" },
  { start: "2027-01-18", end: "2027-01-30", kind: "exam", label: "Exams Q2" },
  { start: "2027-02-08", end: "2027-02-12", kind: "break", label: "Carnival" },
  { start: "2027-03-26", end: "2027-03-29", kind: "break", label: "Easter (TU/e closed)" },
  { start: "2027-04-05", end: "2027-04-17", kind: "exam", label: "Exams Q3" },
  { start: "2027-04-26", end: "2027-04-27", kind: "break", label: "King's Day + bridge day" },
  { start: "2027-05-05", end: "2027-05-05", kind: "break", label: "Liberation Day" },
  { start: "2027-05-06", end: "2027-05-07", kind: "break", label: "Ascension + bridge day" },
  { start: "2027-05-17", end: "2027-05-17", kind: "break", label: "Whit Monday" },
  { start: "2027-06-21", end: "2027-07-03", kind: "exam", label: "Exams Q4" },
  { start: "2027-07-05", end: "2027-08-14", kind: "break", label: "Summer break" },
];

export const UNIVERSITY_CALENDARS: Record<
  UniversityId,
  { name: string; periods: UniPeriod[] }
> = {
  tue: { name: "TU/e", periods: TUE_2026_2027 },
};

/** Periods whose inclusive interval overlaps [start, end] (both YYYY-MM-DD). */
export function periodsInRange(
  periods: UniPeriod[],
  start: string,
  end: string,
): UniPeriod[] {
  return periods.filter((p) => !(p.end < start || p.start > end));
}
