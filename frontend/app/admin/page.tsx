"use client";

import { useCallback, useEffect, useState } from "react";
import DangerZone from "@/components/admin/DangerZone";
import PoolTiles, { PoolTilesSkeleton } from "@/components/admin/PoolTiles";
import RunFeed from "@/components/admin/RunFeed";
import TargetsTable, {
  TargetsTableSkeleton,
} from "@/components/admin/TargetsTable";
import { adminPool, ApiError } from "@/lib/client";
import type { AdminPoolSummary } from "@/types/api";

export default function AdminPage() {
  const [pool, setPool] = useState<AdminPoolSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminPool()
      .then((res) => {
        if (cancelled) return;
        setPool(res);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setError("Admin only.");
        } else {
          setError(e instanceof Error ? e.message : "Could not load the pool.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Admin
        </h1>
        <p className="mt-2 max-w-xl text-base text-ink-muted">
          Read-only pool health and the live scrape feed.
        </p>
      </header>

      {/* Pool tiles + targets */}
      <section className="mb-10 space-y-6">
        <h2 className="font-display text-xl font-semibold text-ink">Pool</h2>
        {error ? (
          <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted">
            {error}
            {error !== "Admin only." && (
              <button
                type="button"
                onClick={load}
                className="ml-3 underline underline-offset-2 hover:text-ink"
              >
                Retry
              </button>
            )}
          </div>
        ) : loading || !pool ? (
          <>
            <PoolTilesSkeleton />
            <TargetsTableSkeleton />
          </>
        ) : (
          <>
            <PoolTiles pool={pool} />
            <TargetsTable targets={pool.targets} />
          </>
        )}
      </section>

      {/* Run feed (self-loading, auto-refreshing) */}
      <section className="mb-10 space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink">
          Recent runs
        </h2>
        <RunFeed />
      </section>

      {/* Danger zone */}
      <section className="mb-10">
        <DangerZone />
      </section>
    </div>
  );
}
