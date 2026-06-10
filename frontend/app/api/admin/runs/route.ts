// ─── /api/admin/runs — recent scrape runs + 24h stats (admin only) ──────────
// ?limit= (default 50, max 200). Stats grouped by status over the last 24h.
// Role re-checked server-side (defense in depth). Spec: docs/DESIGN_V1.md D+E.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/mongodb";
import {
  AdminRunsResponseSchema,
  type ScrapeRunSummary,
  type Tier,
} from "@/types/api";

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toIso(v: unknown): string | null {
  const d = toDate(v);
  return d ? d.toISOString() : null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

const VALID_STATUS = new Set(["running", "success", "empty", "error"]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawLimit = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 200)
    : 50;

  const db = await getDb();
  const docs = await db
    .collection("scrape_runs")
    .find({})
    .sort({ started_at: -1 })
    .limit(limit)
    .toArray();

  const runs: ScrapeRunSummary[] = docs.map((d) => {
    const started = toDate(d.started_at);
    const finished = toDate(d.finished_at);
    const duration =
      started && finished
        ? (finished.getTime() - started.getTime()) / 1000
        : null;
    const status = VALID_STATUS.has(String(d.status))
      ? (d.status as ScrapeRunSummary["status"])
      : "error";

    return {
      route_key: String(d.route_key ?? ""),
      origin: String(d.origin ?? ""),
      destination: String(d.destination ?? ""),
      tier: (d.tier as Tier) ?? "C",
      started_at: toIso(d.started_at) ?? new Date(0).toISOString(),
      finished_at: toIso(d.finished_at),
      status,
      flight_count: num(d.flight_count),
      api_calls: num(d.api_calls),
      cheapest_price: numOrNull(d.cheapest_price),
      error_message: d.error_message != null ? String(d.error_message) : null,
      duration_seconds: duration,
    };
  });

  // 24h stats grouped by status, computed over runs started in the last 24h.
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = runs.filter((r) => {
    const t = new Date(r.started_at).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });

  const byStatus: Record<
    string,
    {
      count: number;
      avg_duration: number | null;
      total_flights: number;
      total_api_calls: number;
    }
  > = {};
  const durationSums: Record<string, { sum: number; n: number }> = {};

  for (const r of recent) {
    const s = (byStatus[r.status] ??= {
      count: 0,
      avg_duration: null,
      total_flights: 0,
      total_api_calls: 0,
    });
    s.count++;
    s.total_flights += r.flight_count;
    s.total_api_calls += r.api_calls;
    if (r.duration_seconds != null) {
      const agg = (durationSums[r.status] ??= { sum: 0, n: 0 });
      agg.sum += r.duration_seconds;
      agg.n++;
    }
  }
  for (const status of Object.keys(byStatus)) {
    const agg = durationSums[status];
    byStatus[status].avg_duration = agg && agg.n > 0 ? agg.sum / agg.n : null;
  }

  const response = AdminRunsResponseSchema.parse({
    runs,
    stats: {
      total_runs: recent.length,
      by_status: byStatus,
    },
  });

  return NextResponse.json(response);
}
