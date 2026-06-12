// node --test via tsx — mirrors lib/score.test.ts style.
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyDay,
  tripAllowed,
  isoWeekday,
  quartileOf,
  EMPTY_BUSY_WEEKDAYS,
} from "./academic";
import { TUE_2026_2027 } from "@/data/calendars/tue-2026-2027";

const CAL = TUE_2026_2027;
const TUE_THU = { q1: [2, 4], q2: [2, 4], q3: [2, 4], q4: [2, 4] };

test("academic calendar rules", () => {
  // weekday math
  assert.equal(isoWeekday("2026-06-12"), 5); // Friday
  assert.equal(isoWeekday("2026-06-14"), 7); // Sunday

  // quartiles
  assert.equal(quartileOf("2026-09-15", CAL), 1);
  assert.equal(quartileOf("2026-12-25", CAL), 2); // recess sits inside Q2 range
  assert.equal(quartileOf("2027-07-10", CAL), null); // summer

  // blackouts: exams + pre-exam crunch
  assert.equal(classifyDay("2026-10-30", CAL, EMPTY_BUSY_WEEKDAYS), "blackout"); // Q1 exams
  assert.equal(classifyDay("2026-10-15", CAL, EMPTY_BUSY_WEEKDAYS), "blackout"); // crunch
  assert.equal(classifyDay("2027-03-27", CAL, TUE_THU), "blackout"); // Easter inside Q3 crunch

  // mandatory weekday on a teaching day
  assert.equal(classifyDay("2026-09-08", CAL, TUE_THU), "busy_weekday"); // Tue, Q1 teaching
  assert.equal(classifyDay("2026-09-09", CAL, TUE_THU), "free"); // Wed
  // same weekday during Christmas recess (no teaching) → free
  assert.equal(classifyDay("2026-12-22", CAL, TUE_THU), "free"); // Tue in recess
  // Carnival Tue → free
  assert.equal(classifyDay("2027-02-09", CAL, TUE_THU), "free");
  // summer Tue → free (outside any quartile)
  assert.equal(classifyDay("2027-07-13", CAL, TUE_THU), "free");

  // trips
  // Fri–Mon city trip over a teaching weekend, Tue/Thu busy → allowed
  assert.ok(tripAllowed("2026-09-11", "2026-09-14", CAL, TUE_THU, []));
  // Fri–Tue → spans a mandatory Tuesday → rejected
  assert.ok(!tripAllowed("2026-09-11", "2026-09-15", CAL, TUE_THU, []));
  // explicit window override frees the Tuesday
  assert.ok(
    tripAllowed("2026-09-11", "2026-09-15", CAL, TUE_THU, [
      { start: "2026-09-15", end: "2026-09-16" },
    ]),
  );
  // week inside exams → rejected even with no weekday rules
  assert.ok(!tripAllowed("2026-10-27", "2026-10-30", CAL, EMPTY_BUSY_WEEKDAYS, []));
  // Christmas week → allowed
  assert.ok(tripAllowed("2026-12-21", "2026-12-28", CAL, TUE_THU, []));
  // post-Q3-exams hot week (Apr 18–25) → allowed... Apr 19 courses start Q4:
  // Apr 20 is a Tue → only allowed up to Apr 19 with TUE_THU
  assert.ok(tripAllowed("2027-04-18", "2027-04-19", CAL, TUE_THU, []));
  assert.ok(!tripAllowed("2027-04-18", "2027-04-21", CAL, TUE_THU, []));
});
