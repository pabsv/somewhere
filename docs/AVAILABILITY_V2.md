# Availability v2 — academic-calendar-aware travel windows

Status: implemented 2026-06-12; LLM-interview import removed same day.
Extends the v1 explicit date-window
model with TU/e academic-calendar awareness and recurring mandatory-attendance
weekdays that vary per quartile.

## Problem

v1 availability = hand-painted date windows. Tedious, goes stale, and ignores
the structure every TU/e student's year actually has:

- **Exams** (4 × 2 weeks) — never travel.
- **~2 weeks before exams** — crunch, no travel.
- **Week right after exams** — prime travel time.
- **Recesses / holidays / bridge days** (Christmas, Carnival, King's Day,
  Ascension, Whitsun, MomenTUm) — free regardless of weekday rules.
- **Teaching weeks** — travel possible only around mandatory attendance days
  (e.g. "Tue + Thu lectures I can't skip"), and those days differ per quartile.

## Model

Three layers, evaluated per calendar day. Precedence top-down:

1. **Explicit user window** (v1 `availability` collection) → day is FREE.
   Manual override always wins ("I'm skipping that week anyway").
2. **Blackout** — day inside an `exam` or `pre_exam` span → day is BUSY.
3. **Mandatory weekday** — day is a busy weekday for its quartile AND the day
   is a teaching day (inside the quartile's course range, not inside a
   `no_teaching` span) → day is BUSY.
4. Otherwise → FREE. (Weekends, recesses, holidays, summer, post-exam weeks.)

A trip `[outbound, return]` passes iff **every** day in the interval is FREE,
plus the existing trip-length prefs (min/max nights).

`hot` spans (post-exam weeks, Christmas, Carnival) don't affect filtering —
they're a UI affordance (badge/underlay/boost) marking prime travel periods.

## Data

- `frontend/data/calendars/tue-2026-2027.ts` — static dataset generated from
  the official TU/e calendar PDF. Spans: `exam`, `pre_exam` (14 days before
  each exam block), `no_teaching` (recess/holiday/bridge days), `hot`.
  Quartile course ranges (q1–q4) drive the weekday rule.
- New optional prefs on `users.preferences`:
  - `academic_calendar: string | null` — calendar id, e.g. `"tue-2026-2027"`.
  - `busy_weekdays: { q1: number[], q2: …, q3: …, q4: … }` — ISO weekdays
    (1 = Mon … 7 = Sun) with mandatory attendance, per quartile.
- Explicit windows stay in the `availability` collection unchanged.

## Logic

`frontend/lib/academic.ts` — pure, no IO, shared by server queries and any
future client UI:

- `getCalendar(id)` — registry lookup.
- `classifyDay(date, cal, busyWeekdays)` → `"free" | "busy" | "blackout"`.
- `tripAllowed(out, ret, cal, busyWeekdays, explicitWindows)` — the day-loop
  with precedence above.

`lib/queries.ts` `loadUserAvailability` now also returns the calendar + busy
weekdays; `passesAvail` (trips + cities paths) delegates to `tripAllowed` when
a calendar is enabled, else falls back to v1 fits-a-window behaviour.

Note: with a calendar enabled the availability filter becomes a day-loop in
TS, so the Mongo-side `$or` window pre-filter used by `getCitiesData` is
replaced by post-aggregation filtering for that path.

## Settings UI

"Quick setup" card at the top of Settings (`AcademicCard.tsx`): toggle the
TU/e calendar on/off + weekday chips per quartile for mandatory attendance.
Each click saves immediately via PUT /api/preferences.

(An LLM "interview prompt + JSON import" flow shipped 2026-06-12 and was
removed the same day — manual chips are faster than a chatbot round-trip.)

## Not done yet / ideas

- Calendar UI underlay for blackout (red tint) and hot (amber tint) spans.
- Score boost or "HOT WEEK" badge for trips inside `hot` spans.
- More calendars (other unis) — registry is keyed by id, add a file per year.
- Auto-rollover warning when the active calendar's last span is in the past.
