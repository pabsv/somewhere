"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminRuns, ApiError } from "@/lib/client";
import type { ScrapeRunSummary } from "@/types/api";
import { timeAgo } from "./timeAgo";

const REFRESH_MS = 10_000;
const LIMIT = 12;

// A "running" run older than this is presumed dead (crashed mid-run and never
// finished) — the scheduler's per-route work takes well under 5 minutes.
const STALE_RUNNING_MS = 5 * 60 * 1000;

/**
 * Live scrape board. Polls recent runs every 10s and answers one question at
 * a glance: what is the scheduler doing right now? Three states:
 * scraping (pulsing route), idle between slots, asleep outside 07–23.
 * Read-only — no actions.
 */
export default function LiveBoard() {
  const [runs, setRuns] = useState<ScrapeRunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await adminRuns(LIMIT);
      setRuns(res.runs);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setError("Admin only.");
      } else {
        setError(e instanceof Error ? e.message : "Could not load runs.");
      }
    } finally {
      inFlight.current = false;
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

  if (error && !runs) {
    return (
      <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted">
        {error}
      </div>
    );
  }

  if (!runs) return <LiveBoardSkeleton />;

  const now = Date.now();
  const current = runs.find(
    (r) =>
      r.status === "running" &&
      now - Date.parse(r.started_at) < STALE_RUNNING_MS,
  );
  const lastDone = runs.find((r) => r.status !== "running");
  const recent = runs.filter((r) => r !== current).slice(0, 6);

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
      {/* now line */}
      <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3.5">
        {current ? (
          <>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              Now scraping
            </span>
            <span className="font-mono text-sm font-semibold text-ink">
              {current.origin} → {current.destination}
            </span>
            <span className="font-mono text-[11px] text-ink-muted">
              tier {current.tier} · started {timeAgo(current.started_at)}
            </span>
          </>
        ) : (
          <>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-line" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              Idle
            </span>
            {lastDone && (
              <span className="font-mono text-[11px] text-ink-muted">
                last run {lastDone.origin} → {lastDone.destination}{" "}
                {timeAgo(lastDone.started_at)}
                {lastDone.status === "success" &&
                  ` · ${lastDone.flight_count} flights`}
              </span>
            )}
          </>
        )}
        {error && (
          <span className="ml-auto font-mono text-[11px] text-alert">
            refresh failed
          </span>
        )}
      </div>

      {/* recent ticker */}
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-2.5">
        {recent.map((r) => (
          <li
            key={`${r.route_key}-${r.started_at}`}
            className="flex items-center gap-1.5 font-mono text-[11px]"
            title={`${r.status} · ${timeAgo(r.started_at)} · ${
              r.flight_count
            } flights`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                r.status === "success"
                  ? "bg-steal"
                  : r.status === "error"
                    ? "bg-alert"
                    : "bg-line"
              }`}
            />
            <span className="text-ink">{r.route_key}</span>
            <span className="text-ink-muted">{timeAgo(r.started_at)}</span>
          </li>
        ))}
        {recent.length === 0 && (
          <li className="font-mono text-[11px] text-ink-muted">
            No runs recorded yet.
          </li>
        )}
      </ul>
    </div>
  );
}

export function LiveBoardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-24 animate-pulse rounded-(--radius-card) bg-line"
    />
  );
}
