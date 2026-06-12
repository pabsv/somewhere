// ─── Quick-setup window generation — pure, no IO ─────────────────────────────
// Settings → Quick setup: the user ticks recurring weekly busy days, hits
// "Apply to calendar", and we materialize the free gaps as painted
// availability windows. The calendar (and the windows collection) stays the
// single source of truth for filtering — this is just a generator.

import type { DateWindow } from "@/types/api";

/** ISO weekday 1=Mon…7=Sun for a YYYY-MM-DD (local, component-parsed). */
export function isoWeekday(date: string): number {
  const d = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  ).getDay(); // 0=Sun…6=Sat
  return d === 0 ? 7 : d;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Free windows between recurring busy weekdays, from `start` (inclusive)
 * through `months` calendar months ahead. Consecutive free days coalesce into
 * one window. Empty `busyWeekdays` → one giant window; all 7 busy → none.
 */
export function generateFreeWindows(
  busyWeekdays: number[],
  start: string,
  months: number,
): DateWindow[] {
  const startDate = new Date(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)),
  );
  const endDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + months,
    startDate.getDate(),
  );

  const windows: DateWindow[] = [];
  let runStart: string | null = null;
  let prev: string | null = null;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = toStr(d);
    const free = !busyWeekdays.includes(isoWeekday(day));
    if (free) {
      if (runStart === null) runStart = day;
      prev = day;
    } else if (runStart !== null && prev !== null) {
      windows.push({ start_date: runStart, end_date: prev });
      runStart = null;
    }
  }
  if (runStart !== null && prev !== null) {
    windows.push({ start_date: runStart, end_date: prev });
  }
  return windows;
}
