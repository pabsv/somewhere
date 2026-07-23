"use client";

import type { AdminPoolSummary } from "@/types/api";

interface PoolTilesProps {
  pool: AdminPoolSummary;
}

/**
 * The pool's at-a-glance health row. The old tile grid exposed the same data
 * over several cards; keeping it on one line makes the targets table the main
 * operational surface while detailed grid diagnostics remain in tooltips.
 */
export default function PoolTiles({ pool }: PoolTilesProps) {
  const { tiles, targets, grids } = pool;
  const enabledTargets = targets.filter((target) => target.enabled);
  const withBaseline = enabledTargets.filter(
    (target) => target.price_p50_ewma != null,
  ).length;
  const coveragePct = enabledTargets.length
    ? Math.round((withBaseline / enabledTargets.length) * 100)
    : 0;

  const a = tiles.by_tier.A ?? 0;
  const b = tiles.by_tier.B ?? 0;
  const c = tiles.by_tier.C ?? 0;
  const gridWrite = agoLabel(grids.newest_scraped_at) ?? "never";

  return (
    <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2.5 rounded-(--radius-card) border border-line bg-card px-4 py-3.5 shadow-(--shadow-card)">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        Health
      </span>
      <HealthStat
        label="Enabled"
        value={`${tiles.enabled}/${tiles.total}`}
        title={`${tiles.disabled} disabled · ${tiles.total} total targets`}
      />
      <HealthStat
        label="Overdue"
        value={tiles.overdue}
        alert={tiles.overdue > 0}
        title="Past their tier's scrape interval"
      />
      <HealthStat
        label="Never scraped"
        value={tiles.never_scraped}
        title={`${tiles.never_scraped} targets have no completed scrape yet`}
      />
      <HealthStat
        label="Baseline"
        value={`${coveragePct}%`}
        title={`${withBaseline}/${enabledTargets.length} enabled routes have a p50 baseline`}
      />
      <HealthStat
        label="Tiers A·B·C"
        value={`${a} · ${b} · ${c}`}
        title={`Enabled targets: tier A ${a} · tier B ${b} · tier C ${c}`}
      />
      <HealthStat
        label="Grid write"
        value={gridWrite}
        title={`${grids.total} one-way grids · ${grids.out_legs} outbound · ${grids.back_legs} return · ${grids.fresh_24h} fresh in 24h · ${grids.stale_7d} stale over 7d · median ${grids.median_price_count ?? "—"} dates/grid`}
      />
    </div>
  );
}

function HealthStat({
  label,
  value,
  title,
  alert = false,
}: {
  label: string;
  value: number | string;
  title: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5" title={title}>
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span
        className={`tnum font-mono text-base font-semibold ${
          alert ? "text-alert" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/** "14m ago" / "3h ago" / "2d ago"; null when absent or invalid. */
function agoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const timestamp = Date.parse(iso.endsWith("Z") ? iso : `${iso}Z`);
  if (Number.isNaN(timestamp)) return null;

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PoolTilesSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-wrap items-baseline gap-x-7 gap-y-2.5 rounded-(--radius-card) border border-line bg-card px-4 py-3.5 shadow-(--shadow-card)"
    >
      <div className="h-3 w-12 animate-pulse rounded bg-line" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-baseline gap-2">
          <div className="h-3 w-16 animate-pulse rounded bg-line" />
          <div className="h-4 w-10 animate-pulse rounded bg-line" />
        </div>
      ))}
    </div>
  );
}
