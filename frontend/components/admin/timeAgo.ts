// Local relative-time helper for the admin surface. Kept here (not in the
// frozen lib/format) per track instructions — admin-only, not load-bearing
// elsewhere.

/**
 * Compact relative time, e.g. "4m ago", "2h ago", "3d ago", "just now".
 * `null`/invalid → "never". Future timestamps → "in 5m" etc.
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "never";

  const diffMs = Date.now() - then;
  const future = diffMs < 0;
  const s = Math.abs(diffMs) / 1000;

  let value: number;
  let unit: string;
  if (s < 45) {
    return future ? "soon" : "just now";
  } else if (s < 90) {
    value = 1;
    unit = "m";
  } else if (s < 3600) {
    value = Math.round(s / 60);
    unit = "m";
  } else if (s < 86400) {
    value = Math.round(s / 3600);
    unit = "h";
  } else if (s < 86400 * 30) {
    value = Math.round(s / 86400);
    unit = "d";
  } else {
    value = Math.round(s / (86400 * 30));
    unit = "mo";
  }

  return future ? `in ${value}${unit}` : `${value}${unit} ago`;
}
