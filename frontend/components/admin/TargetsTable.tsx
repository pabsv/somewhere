"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import type { AdminTargetSummary } from "@/types/api";
import { timeAgo } from "./timeAgo";

interface TargetsTableProps {
  targets: AdminTargetSummary[];
}

type SortKey = "route_key" | "last_scraped_at";
type SortDir = "asc" | "desc";

const RENDER_CAP = 200;

/**
 * Compact mono table of pool targets. Sortable by route_key or last_scraped_at.
 * Caps the DOM to the first RENDER_CAP rows (the pool is ~920 routes) so the
 * page never freezes; shows a "showing N of M" note.
 */
export default function TargetsTable({ targets }: TargetsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("last_scraped_at");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    const copy = [...targets];
    copy.sort((a, b) => {
      let cmp: number;
      if (sortKey === "route_key") {
        cmp = a.route_key.localeCompare(b.route_key);
      } else {
        // nulls (never scraped) sort first when asc (most "overdue" feel)
        const av = a.last_scraped_at ? Date.parse(a.last_scraped_at) : -Infinity;
        const bv = b.last_scraped_at ? Date.parse(b.last_scraped_at) : -Infinity;
        cmp = av - bv;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [targets, sortKey, sortDir]);

  const visible = sorted.slice(0, RENDER_CAP);
  const truncated = sorted.length > RENDER_CAP;

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const arrow = (key: SortKey) =>
    key === sortKey ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <Th onClick={() => toggleSort("route_key")} sortable>
                Route{arrow("route_key")}
              </Th>
              <Th>Tier</Th>
              <Th>On</Th>
              <Th onClick={() => toggleSort("last_scraped_at")} sortable>
                Last scraped{arrow("last_scraped_at")}
              </Th>
              <Th align="right">Fails</Th>
              <Th align="right">p50</Th>
              <Th align="right">Min seen</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr
                key={t.route_key}
                className="border-b border-line/60 last:border-0 hover:bg-paper/60"
              >
                <td className="px-3 py-2 font-mono text-xs text-ink">
                  {t.route_key}
                </td>
                <td className="px-3 py-2">
                  <span className="tnum rounded-tag bg-brand px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-ink">
                    {t.tier}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    aria-label={t.enabled ? "enabled" : "disabled"}
                    title={t.enabled ? "enabled" : "disabled"}
                    className={`inline-block h-2 w-2 rounded-full ${
                      t.enabled ? "bg-steal" : "bg-ink-muted/40"
                    }`}
                  />
                </td>
                <td
                  className="px-3 py-2 font-mono text-xs text-ink-muted"
                  title={t.last_scraped_at ?? "never"}
                >
                  {timeAgo(t.last_scraped_at)}
                </td>
                <td
                  className={`tnum px-3 py-2 text-right font-mono text-xs ${
                    t.consecutive_failures > 0
                      ? "font-semibold text-alert"
                      : "text-ink-muted"
                  }`}
                >
                  {t.consecutive_failures}
                </td>
                <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                  {t.price_p50_ewma != null ? formatPrice(t.price_p50_ewma) : "—"}
                </td>
                <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                  {t.min_price_seen != null ? formatPrice(t.min_price_seen) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {truncated && (
        <div className="border-t border-line px-3 py-2 font-mono text-[11px] text-ink-muted">
          Showing {visible.length} of {sorted.length} targets — sort to bring
          others into view.
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
  sortable = false,
  onClick,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${
        align === "right" ? "text-right" : "text-left"
      } ${sortable ? "cursor-pointer select-none hover:text-ink" : ""}`}
    >
      {children}
    </th>
  );
}

export function TargetsTableSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)"
    >
      <div className="space-y-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="h-6 w-full animate-pulse rounded bg-line" />
        ))}
      </div>
    </div>
  );
}
