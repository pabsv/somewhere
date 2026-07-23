// ─── Minimal in-memory rate limiter ──────────────────────────────────────────
// Per-instance sliding window keyed on caller IP. On Vercel, function
// instances are reused across requests (Fluid Compute), so this throttles
// sustained abuse without an external store. Not distributed: parallel cold
// instances each get their own window, so a determined attacker can exceed
// the nominal limit — acceptable first gate for the public endpoints
// (feedback, waitlist, register, login) until a shared store is warranted.

const buckets = new Map<string, number[]>();

// Hard cap on tracked keys so the map itself can't be used to balloon memory
// (an attacker rotating spoofed X-Forwarded-For values would otherwise grow
// it unboundedly). Clearing everything on overflow briefly resets limits —
// fine at this scale, and strictly better than unbounded growth.
const MAX_KEYS = 10_000;

/** Best-effort client IP: first hop of x-forwarded-for (set by Vercel). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Record a hit for `key` and report whether it stays within `limit` hits per
 * `windowMs`. Returns true when allowed, false when over the limit.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let hits = buckets.get(key);
  if (!hits) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    hits = [];
    buckets.set(key, hits);
  }
  while (hits.length && hits[0] <= now - windowMs) hits.shift();
  if (hits.length >= limit) return false;
  hits.push(now);
  return true;
}
