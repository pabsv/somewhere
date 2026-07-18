"use client";

import type { AdminUsersResponse } from "@/types/api";

type Tiles = AdminUsersResponse["tiles"];

/** People rollup KPI row — same Tile idiom as PoolTiles. */
export default function UsersTiles({ tiles }: { tiles: Tiles }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Tile label="Users" value={tiles.total_users} />
      <Tile
        label="Admins"
        value={tiles.admins}
        accent={tiles.admins > 0 ? "steal" : undefined}
      />
      <Tile
        label="Onboarded"
        value={tiles.onboarded}
        sub={`of ${tiles.total_users}`}
      />
      <Tile label="With availability" value={tiles.with_availability} />
      <Tile label="With favourites" value={tiles.with_favourites} />
      <Tile label="In a group" value={tiles.in_a_group} />
      <Tile label="Groups" value={tiles.total_groups} />
      <Tile label="Friendships" value={tiles.accepted_friendships} />
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

export function UsersTilesSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)"
        >
          <div className="h-3 w-20 animate-pulse rounded bg-line" />
          <div className="mt-2 h-7 w-12 animate-pulse rounded bg-line" />
        </div>
      ))}
    </div>
  );
}
