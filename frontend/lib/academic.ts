// ─── Recurring weekly busy days — pure, no IO ────────────────────────────────
// "Quick setup" in Settings: ISO weekdays (1=Mon…7=Sun) the user must be home
// every week (lectures, work, sports). A trip qualifies if it fits a painted
// availability window, or touches none of the busy weekdays.

/** ISO weekday 1=Mon…7=Sun for a YYYY-MM-DD (local, component-parsed). */
export function isoWeekday(date: string): number {
  const d = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  ).getDay(); // 0=Sun…6=Sat
  return d === 0 ? 7 : d;
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
 * True when no day of [outbound, return] (inclusive) falls on a busy weekday.
 * Trivially true for an empty busy list; spans ≥ 7 days always hit one.
 * Guard: intervals longer than 60 days are rejected (corrupt data).
 */
export function avoidsBusyWeekdays(
  outbound: string,
  ret: string,
  busyWeekdays: number[],
): boolean {
  if (ret < outbound) return false;
  if (busyWeekdays.length === 0) return true;
  let day = outbound;
  for (let i = 0; i <= 60; i++) {
    if (busyWeekdays.includes(isoWeekday(day))) return false;
    if (day === ret) return true;
    day = nextDay(day);
  }
  return false;
}
