// ─── /api/admin/pool — read-only pool health (admin only) ───────────────────
// Tiles (totals/enabled/overdue/never-scraped/by-tier) + per-target summaries.
// Role re-checked server-side (defense in depth). Spec: docs/DESIGN_V1.md D+E.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  AdminPoolSummarySchema,
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

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const docs = await db.collection("scrape_targets").find({}).toArray();
  const now = new Date();

  let enabled = 0;
  let disabled = 0;
  let overdue = 0;
  let neverScraped = 0;
  const byTier: Record<string, number> = { A: 0, B: 0, C: 0 };

  const targets: AdminTargetSummary[] = docs.map((d) => {
    const isEnabled = d.enabled === true;
    const nextDue = d.next_due_at instanceof Date ? d.next_due_at : null;
    const tier = (d.tier as Tier) ?? "C";

    if (isEnabled) {
      enabled++;
      byTier[tier] = (byTier[tier] ?? 0) + 1;
      if (nextDue && nextDue <= now) overdue++;
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
    targets,
  });

  return NextResponse.json(summary);
}
