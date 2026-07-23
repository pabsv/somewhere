// ─── /api/admin/pool — read-only pool health (admin only) ───────────────────
// Tiles (totals/enabled/overdue/never-scraped/by-tier) + per-target summaries.
// Role re-checked server-side (defense in depth). Spec: docs/DESIGN_V1.md D+E.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  AdminPoolSummarySchema,
  type AdminGridStats,
  type AdminTargetSummary,
  type Tier,
} from "@/types/api";

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

/** scraped_at → epoch ms; Python writes BSON Dates, older docs naive strings. */
function toMs(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(v);
    const t = Date.parse(hasTimezone ? v : v + "Z");
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/**
 * One-way fare grid coverage. ~2,300 slim
 * docs — a single projected fetch is fine. `stale_7d` = grids older than the
 * slowest tier cadence (168h): routes that should have refreshed but didn't.
 */
async function loadGridStats(
  db: Awaited<ReturnType<typeof getDb>>,
  homeOrigins: Set<string>,
): Promise<AdminGridStats> {
  const docs = await db
    .collection("oneway_fares")
    .find(
      {},
      {
        projection: {
          _id: 0,
          origin: 1,
          destination: 1,
          price_count: 1,
          scraped_at: 1,
        },
      },
    )
    .toArray();

  const now = Date.now();
  const DAY = 24 * 3_600_000;
  let outLegs = 0;
  let backLegs = 0;
  let fresh24h = 0;
  let stale7d = 0;
  let oldest: number | null = null;
  let newest: number | null = null;
  const priceCounts: number[] = [];

  for (const d of docs) {
    if (homeOrigins.has(String(d.origin))) outLegs++;
    else if (homeOrigins.has(String(d.destination))) backLegs++;
    if (typeof d.price_count === "number") priceCounts.push(d.price_count);
    const t = toMs(d.scraped_at);
    if (t == null) continue;
    if (now - t <= DAY) fresh24h++;
    if (now - t > 7 * DAY) stale7d++;
    if (oldest == null || t < oldest) oldest = t;
    if (newest == null || t > newest) newest = t;
  }

  priceCounts.sort((a, b) => a - b);
  const median =
    priceCounts.length === 0
      ? null
      : priceCounts[Math.floor(priceCounts.length / 2)];

  return {
    total: docs.length,
    out_legs: outLegs,
    back_legs: backLegs,
    fresh_24h: fresh24h,
    stale_7d: stale7d,
    median_price_count: median,
    oldest_scraped_at: oldest == null ? null : new Date(oldest).toISOString(),
    newest_scraped_at: newest == null ? null : new Date(newest).toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const docs = await db.collection("scrape_targets").find({}).toArray();
  const nowMs = Date.now();

  let enabled = 0;
  let disabled = 0;
  let overdue = 0;
  let neverScraped = 0;
  const byTier: Record<string, number> = { A: 0, B: 0, C: 0 };

  const targets: AdminTargetSummary[] = docs.map((d) => {
    const isEnabled = d.enabled === true;
    const nextDueMs = toMs(d.next_due_at);
    const isOverdue =
      isEnabled && nextDueMs != null && nextDueMs <= nowMs;
    const tier = (d.tier as Tier) ?? "C";

    if (isEnabled) {
      enabled++;
      byTier[tier] = (byTier[tier] ?? 0) + 1;
      if (isOverdue) overdue++;
    } else {
      disabled++;
    }
    if (d.last_scraped_at == null) neverScraped++;

    return {
      route_key: String(d.route_key ?? ""),
      origin: String(d.origin ?? ""),
      destination: String(d.destination ?? ""),
      tier,
      enabled: isEnabled,
      overdue: isOverdue,
      last_scraped_at: toIso(d.last_scraped_at),
      next_due_at: toIso(d.next_due_at),
      last_status: d.last_status != null ? String(d.last_status) : null,
      last_error: d.last_error != null ? String(d.last_error) : null,
      last_flight_count: num(d.last_flight_count),
      total_runs: num(d.total_runs),
      success_runs: num(d.success_runs),
      empty_runs: num(d.empty_runs),
      error_runs: num(d.error_runs),
      consecutive_failures: num(d.consecutive_failures),
      avg_price: numOrNull(d.avg_price),
      price_p50_ewma: numOrNull(d.price_p50_ewma),
      min_price_seen: numOrNull(d.min_price_seen),
    };
  });

  targets.sort((a, b) =>
    a.route_key < b.route_key ? -1 : a.route_key > b.route_key ? 1 : 0,
  );

  const grids = await loadGridStats(
    db,
    new Set(docs.map((d) => String(d.origin ?? ""))),
  );

  const summary = AdminPoolSummarySchema.parse({
    tiles: {
      total: docs.length,
      enabled,
      disabled,
      overdue,
      never_scraped: neverScraped,
      by_tier: {
        A: byTier.A ?? 0,
        B: byTier.B ?? 0,
        C: byTier.C ?? 0,
      },
    },
    grids,
    targets,
  });

  return NextResponse.json(summary);
}
