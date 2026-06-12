// TU/e academic calendar 2026–2027 — hand-derived from the official
// "Calendar academic year 2026-2027" PDF. All dates inclusive, YYYY-MM-DD.
//
// Span kinds:
//   exam        — examination period (blackout)
//   pre_exam    — 14 days before an exam block (blackout)
//   no_teaching — recess / holiday / bridge day (weekday rules don't apply)
//   hot         — prime travel period (post-exam week, recess) — UI only

export type CalSpanKind = "exam" | "pre_exam" | "no_teaching" | "hot";

export interface CalSpan {
  start: string;
  end: string;
  kind: CalSpanKind;
  label: string;
}

export interface QuartileSpan {
  q: 1 | 2 | 3 | 4;
  /** first day of courses, inclusive */
  courses_start: string;
  /** last day of courses, inclusive */
  courses_end: string;
}

export interface AcademicCalendar {
  id: string;
  name: string;
  quartiles: QuartileSpan[];
  spans: CalSpan[];
}

export const TUE_2026_2027: AcademicCalendar = {
  id: "tue-2026-2027",
  name: "TU/e 2026–2027",
  quartiles: [
    { q: 1, courses_start: "2026-08-31", courses_end: "2026-10-23" },
    { q: 2, courses_start: "2026-11-09", courses_end: "2027-01-15" },
    { q: 3, courses_start: "2027-02-01", courses_end: "2027-04-02" },
    { q: 4, courses_start: "2027-04-19", courses_end: "2027-06-18" },
  ],
  spans: [
    // ── Exams ────────────────────────────────────────────────────────────
    { start: "2026-10-26", end: "2026-11-07", kind: "exam", label: "Q1 exams" },
    { start: "2027-01-18", end: "2027-01-30", kind: "exam", label: "Q2 exams" },
    { start: "2027-04-05", end: "2027-04-17", kind: "exam", label: "Q3 exams" },
    { start: "2027-06-21", end: "2027-07-03", kind: "exam", label: "Q4 exams" },
    { start: "2027-08-16", end: "2027-08-21", kind: "exam", label: "Interim exams" },

    // ── Pre-exam crunch (14 days before each block) ──────────────────────
    { start: "2026-10-12", end: "2026-10-25", kind: "pre_exam", label: "Q1 crunch" },
    { start: "2027-01-04", end: "2027-01-17", kind: "pre_exam", label: "Q2 crunch" },
    { start: "2027-03-22", end: "2027-04-04", kind: "pre_exam", label: "Q3 crunch" },
    { start: "2027-06-07", end: "2027-06-20", kind: "pre_exam", label: "Q4 crunch" },

    // ── No teaching (recess / holidays / bridge days) ────────────────────
    { start: "2026-09-25", end: "2026-09-25", kind: "no_teaching", label: "MomenTUm" },
    { start: "2026-12-21", end: "2027-01-01", kind: "no_teaching", label: "Christmas recess" },
    { start: "2027-02-08", end: "2027-02-12", kind: "no_teaching", label: "Carnival" },
    { start: "2027-03-26", end: "2027-03-29", kind: "no_teaching", label: "Easter (TU/e closed)" },
    { start: "2027-04-26", end: "2027-04-27", kind: "no_teaching", label: "Bridge day + King's Day" },
    { start: "2027-05-05", end: "2027-05-05", kind: "no_teaching", label: "Liberation Day" },
    { start: "2027-05-06", end: "2027-05-07", kind: "no_teaching", label: "Ascension + bridge day" },
    { start: "2027-05-17", end: "2027-05-17", kind: "no_teaching", label: "Whit Monday" },

    // ── Hot travel periods (UI affordance only) ──────────────────────────
    { start: "2026-11-08", end: "2026-11-15", kind: "hot", label: "Post-Q1-exams week" },
    { start: "2026-12-19", end: "2027-01-03", kind: "hot", label: "Christmas break" },
    { start: "2027-01-31", end: "2027-02-12", kind: "hot", label: "Post-Q2-exams + Carnival" },
    { start: "2027-04-18", end: "2027-04-25", kind: "hot", label: "Post-Q3-exams week" },
    { start: "2027-07-04", end: "2027-07-18", kind: "hot", label: "Post-Q4-exams / summer start" },
  ],
};
