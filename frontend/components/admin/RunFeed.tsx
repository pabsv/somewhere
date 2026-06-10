"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminRuns, ApiError } from "@/lib/client";
import type {
  AdminRunsResponse,
  ScrapeRunSummary,
} from "@/types/api";
import { timeAgo } from "./timeAgo";

const REFRESH_MS = 60_000;
const LIMIT = 50;

type Status = ScrapeRunSummary["status"];

const STATUS_STYLE: Record<Status, string> = {
  success: "bg-steal text-white",
  empty: "border border-line bg-transparent text-ink-muted",
  error: "bg-alert text-white",
  running: "bg-brand text-brand-ink",
};

/**
 * Live run feed. 24h stats strip on top (from stats.by_status), reverse-chron
 * rows below. Auto-refreshes every 60s; refreshes are guarded against overlap
 * and cleaned up on unmount.
 */
export default function RunFeed() {
  const [data, setData] = useState<AdminRunsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // guard against overlapping in-flight refreshes
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await adminRuns(LIMIT);
      setData(res);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setError("Admin only.");
      } else {
        setError(e instanceof Error ? e.message : "Could not load runs.");
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load();
    const id = setInterval(() => {
      if (!cancelled) void load();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [load]);

  if (loading && !data) return <RunFeedSkeleton />;

  if (error && !data) {
    return (
      <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { runs, stats } = data;
  const s = (k: Status) => stats.by_status[k]?.count ?? 0;
  const totalFlights = Object.values(stats.by_status).reduce(
    (acc, v) => acc + (v?.total_flights ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* 24h stats strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-(--radius-card) border border-line bg-card px-4 py-3 shadow-(--shadow-card)">
        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
          Last 24h
        </span>
        <Stat label="runs" value={stats.total_runs} />
        <Stat label="success" value={s("success")} tone="steal" />
        <Stat label="empty" value={s("empty")} tone="muted" />
        <Stat label="error" value={s("error")} tone="alert" />
        <Stat label="flights" value={totalFlights} />
        {error && (
          <span className="ml-auto font-mono text-[11px] text-alert">
            refresh failed
          </span>
        )}
      </div>

      {/* run rows */}
      <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
        {runs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-ink-muted">
            No runs recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-line/60">
            {runs.map((r) => (
              <li
                key={`${r.route_key}-${r.started_at}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="w-28 shrink-0 font-mono text-xs text-ink">
                  {r.route_key}
                </span>
                <span
                  className="w-20 shrink-0 font-mono text-xs text-ink-muted"
                  title={r.started_at}
                >
                  {timeAgo(r.started_at)}
                </span>
                <StatusBadge status={r.status} />
                <span className="tnum ml-auto shrink-0 font-mono text-xs text-ink-muted">
                  {r.flight_count} fl
                </span>
                <span className="tnum w-14 shrink-0 text-right font-mono text-xs text-ink-muted">
                  {r.duration_seconds != null
                    ? `${r.duration_seconds.toFixed(1)}s`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "steal" | "alert" | "muted";
}) {
  const color =
    tone === "steal"
      ? "text-steal"
      : tone === "alert"
        ? "text-alert"
        : tone === "muted"
          ? "text-ink-muted"
          : "text-ink";
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`tnum font-mono text-sm font-semibold ${color}`}>
        {value}
      </span>
      <span className="font-mono text-[11px] text-ink-muted">{label}</span>
    </span>
  );
}

export function RunFeedSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="h-12 animate-pulse rounded-(--radius-card) bg-line" />
      <div className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)">
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-6 w-full animate-pulse rounded bg-line" />
          ))}
        </div>
      </div>
    </div>
  );
}
