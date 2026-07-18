"use client";

import type { AdminPoolSummary } from "@/types/api";

interface PoolTilesProps {
  pool: AdminPoolSummary;
}

/**
 * Top-of-admin tile row: pool health counts + tier breakdown + baseline
 * coverage (% of enabled targets that have a price_p50_ewma baseline). All
 * numbers mono/tabular on card surfaces.
 */
export default function PoolTiles({ pool }: PoolTilesProps) {
  const { tiles, targets } = pool;

  const enabledTargets = targets.filter((t) => t.enabled);
  const withBaseline = enabledTargets.filter(
    (t) => t.price_p50_ewma != null,
  ).length;
  const coveragePct =
    enabledTargets.length === 0
      ? 0
      : Math.round((withBaseline / enabledTargets.length) * 100);

  const a = tiles.by_tier.A ?? 0;
  const b = tiles.by_tier.B ?? 0;
  const c = tiles.by_tier.C ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Tile label="Total" value={tiles.total} />
      <Tile label="Enabled" value={tiles.enabled} accent="steal" />
      <Tile
        label="Disabled"
        value={tiles.disabled}
        accent={tiles.disabled > 0 ? "alert" : undefined}
      />
      <Tile
        label="Overdue"
        value={tiles.overdue}
        accent={tiles.overdue > 0 ? "alert" : undefined}
      />
      <Tile label="Never scraped" value={tiles.never_scraped} />
      <Tile
        label="Baseline cov."
        value={`${coveragePct}%`}
        sub={`${withBaseline}/${enabledTargets.length}`}
      />

      {/* tier breakdown spans full width below */}
      <div className="col-span-2 rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card) sm:col-span-3 lg:col-span-6">
        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
          By tier
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          <TierStat tier="A" value={a} />
          <TierStat tier="B" value={b} />
          <TierStat tier="C" value={c} />
        </div>
      </div>

      <GridStatsCard grids={pool.grids} />
    </div>
  );
}

/** "3h ago" / "2d ago" from an ISO timestamp; null when unparseable. */
function agoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso.endsWith("Z") ? iso : iso + "Z");
  if (Number.isNaN(t)) return null;
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * One-way fare grid coverage (open-jaw Phase 6): the data behind every
 * Mix & match / Twin city surface. "Last write" going old is the "grids
 * stopped refreshing" alarm — the pool writes grids every few minutes when
 * healthy, so anything past 24h is flagged.
 */
function GridStatsCard({ grids }: { grids: AdminPoolSummary["grids"] }) {
  const newestMs = grids.newest_scraped_at
    ? Date.parse(
        grids.newest_scraped_at.endsWith("Z")
          ? grids.newest_scraped_at
          : grids.newest_scraped_at + "Z",
      )
    : NaN;
  const writesStalled =
    grids.total === 0 ||
    Number.isNaN(newestMs) ||
    Date.now() - newestMs > 24 * 3_600_000;

  return (
    <div className="col-span-2 rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card) sm:col-span-3 lg:col-span-6">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        One-way grids (mix &amp; match data)
      </span>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <GridStat label="Grids" value={grids.total} alert={grids.total === 0} />
        <GridStat label="Out / back" value={`${grids.out_legs} / ${grids.back_legs}`} />
        <GridStat label="Fresh 24h" value={grids.fresh_24h} />
        <GridStat
          label="Stale >7d"
          value={grids.stale_7d}
          alert={grids.stale_7d > 0}
        />
        <GridStat
          label="Dates/grid (med)"
          value={grids.median_price_count ?? "—"}
        />
        <GridStat
          label="Last write"
          value={agoLabel(grids.newest_scraped_at) ?? "never"}
          alert={writesStalled}
        />
      </div>
    </div>
  );
}

function GridStat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number | string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span
        className={`tnum font-mono text-lg font-semibold ${
          alert ? "text-alert" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "steal" | "alert";
}) {
  const valueColor =
    accent === "steal"
      ? "text-steal"
      : accent === "alert"
        ? "text-alert"
        : "text-ink";
  return (
    <div className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)">
      <div className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={`tnum font-mono text-2xl font-semibold ${valueColor}`}>
          {value}
        </span>
        {sub && (
          <span className="tnum font-mono text-xs text-ink-muted">{sub}</span>
        )}
      </div>
    </div>
  );
}

function TierStat({ tier, value }: { tier: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="tnum rounded-tag bg-brand px-1.5 py-px font-mono text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
        {tier}
      </span>
      <span className="tnum font-mono text-lg font-semibold text-ink">
        {value}
      </span>
    </div>
  );
}

export function PoolTilesSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)"
        >
          <div className="h-3 w-16 animate-pulse rounded bg-line" />
          <div className="mt-2 h-7 w-12 animate-pulse rounded bg-line" />
        </div>
      ))}
      <div className="col-span-2 h-16 animate-pulse rounded-(--radius-card) bg-line sm:col-span-3 lg:col-span-6" />
    </div>
  );
}
