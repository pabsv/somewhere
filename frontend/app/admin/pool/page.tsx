"use client";

import { useCallback, useEffect, useState } from "react";
import DangerZone from "@/components/admin/DangerZone";
import LiveBoard from "@/components/admin/LiveBoard";
import PoolTiles, { PoolTilesSkeleton } from "@/components/admin/PoolTiles";
import RunFeed from "@/components/admin/RunFeed";
import TargetsTable, {
  TargetsTableSkeleton,
} from "@/components/admin/TargetsTable";
import { adminPool, ApiError } from "@/lib/client";
import type { AdminPoolSummary } from "@/types/api";

export default function AdminPoolPage() {
  const [pool, setPool] = useState<AdminPoolSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestPool = useCallback((isCancelled: () => boolean) => {
    return adminPool()
      .then((res) => {
        if (!isCancelled()) setPool(res);
      })
      .catch((e) => {
        if (isCancelled()) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setError("Admin only.");
        } else {
          setError(e instanceof Error ? e.message : "Could not load the pool.");
        }
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false);
      });
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void requestPool(() => false);
  }, [requestPool]);

  useEffect(() => {
    let cancelled = false;
    void requestPool(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [requestPool]);

  return (
    <>
      {/* LiveBoard keeps its own 10-second refresh loop. */}
      <section className="mb-3" aria-label="Live scraper activity">
        <LiveBoard />
      </section>

      {error ? (
        <div className="mb-10 rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted">
          {error}
          {error !== "Admin only." && (
            <button
              type="button"
              onClick={retry}
              className="ml-3 underline underline-offset-2 hover:text-ink"
            >
              Retry
            </button>
          )}
        </div>
      ) : loading || !pool ? (
        <div className="mb-10 space-y-6">
          <PoolTilesSkeleton />
          <TargetsTableSkeleton />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <PoolTiles pool={pool} />
          </div>
          <section className="mb-10">
            <TargetsTable targets={pool.targets} />
          </section>
        </>
      )}

      {/* RunFeed keeps its own 60-second refresh loop. */}
      <section className="mb-10 space-y-3">
        <h2 className="font-display text-xl font-semibold text-ink">
          Recent runs
        </h2>
        <RunFeed />
      </section>

      <DangerZone />
    </>
  );
}
