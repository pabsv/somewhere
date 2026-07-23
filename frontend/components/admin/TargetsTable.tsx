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
type TargetFilter = "all" | "overdue" | "failing" | "disabled";

const RENDER_CAP = 100;

/** Searchable, filterable pool targets with a deliberately bounded DOM. */
export default function TargetsTable({ targets }: TargetsTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TargetFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("last_scraped_at");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const counts = useMemo(
    () => ({
      all: targets.length,
      overdue: targets.filter((target) => target.overdue).length,
      failing: targets.filter((target) => target.consecutive_failures > 0)
        .length,
      disabled: targets.filter((target) => !target.enabled).length,
    }),
    [targets],
  );

  const matching = useMemo(() => {
    const normalizedQuery = query.trim().toUpperCase();
    const filtered = targets.filter((target) => {
      const matchesQuery =
        !normalizedQuery ||
        target.route_key.toUpperCase().includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "overdue" && target.overdue) ||
        (filter === "failing" && target.consecutive_failures > 0) ||
        (filter === "disabled" && !target.enabled);
      return matchesQuery && matchesFilter;
    });

    return filtered.sort((a, b) => {
      let comparison: number;
      if (sortKey === "route_key") {
        comparison = a.route_key.localeCompare(b.route_key);
      } else {
        // Never-scraped targets lead ascending order so operational gaps surface.
        const aTime = a.last_scraped_at
          ? Date.parse(a.last_scraped_at)
          : -Infinity;
        const bTime = b.last_scraped_at
          ? Date.parse(b.last_scraped_at)
          : -Infinity;
        comparison = aTime - bTime;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [filter, query, sortDir, sortKey, targets]);

  const visible = matching.slice(0, RENDER_CAP);
  const truncated = matching.length > RENDER_CAP;

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const arrow = (key: SortKey) =>
    key === sortKey ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const filters: Array<{ id: TargetFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: counts.all },
    { id: "overdue", label: "Overdue", count: counts.overdue },
    { id: "failing", label: "Failing", count: counts.failing },
    { id: "disabled", label: "Disabled", count: counts.disabled },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 font-display text-xl font-semibold text-ink">
          Targets
        </h2>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a route… e.g. EIN-BCN"
          aria-label="Search targets"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-line bg-card px-3 py-[7px] font-mono text-[13px] text-ink outline-none placeholder:text-ink-muted/70 focus:border-ink-muted sm:w-56"
        />
        {filters.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(item.id)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-transparent text-ink-muted hover:border-ink-muted hover:text-ink"
              }`}
            >
              {item.label} {item.count}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th
                  onClick={() => toggleSort("route_key")}
                  sortDirection={
                    sortKey === "route_key" ? sortDir : undefined
                  }
                >
                  Route{arrow("route_key")}
                </Th>
                <Th>Tier</Th>
                <Th>On</Th>
                <Th
                  onClick={() => toggleSort("last_scraped_at")}
                  sortDirection={
                    sortKey === "last_scraped_at" ? sortDir : undefined
                  }
                >
                  Last scraped{arrow("last_scraped_at")}
                </Th>
                <Th align="right">Fails</Th>
                <Th align="right">p50</Th>
                <Th align="right">Min seen</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((target) => (
                <tr
                  key={target.route_key}
                  className="border-b border-line/60 last:border-0 hover:bg-paper/60"
                >
                  <td className="px-3 py-2 font-mono text-xs text-ink">
                    {target.route_key}
                  </td>
                  <td className="px-3 py-2">
                    <span className="tnum rounded-(--radius-tag) bg-brand px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-ink">
                      {target.tier}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      aria-label={target.enabled ? "enabled" : "disabled"}
                      title={target.enabled ? "enabled" : "disabled"}
                      className={`inline-block h-2 w-2 rounded-full ${
                        target.enabled ? "bg-steal" : "bg-ink-muted/40"
                      }`}
                    />
                  </td>
                  <td
                    className={`px-3 py-2 font-mono text-xs ${
                      target.overdue ? "text-alert" : "text-ink-muted"
                    }`}
                    title={target.last_scraped_at ?? "never"}
                  >
                    {timeAgo(target.last_scraped_at)}
                  </td>
                  <td
                    className={`tnum px-3 py-2 text-right font-mono text-xs ${
                      target.consecutive_failures > 0
                        ? "font-semibold text-alert"
                        : "text-ink-muted"
                    }`}
                  >
                    {target.consecutive_failures}
                  </td>
                  <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                    {target.price_p50_ewma != null
                      ? formatPrice(target.price_p50_ewma)
                      : "—"}
                  </td>
                  <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                    {target.min_price_seen != null
                      ? formatPrice(target.min_price_seen)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-3 py-2 font-mono text-[11px] text-ink-muted">
          {truncated
            ? `Showing ${visible.length} of ${matching.length} matching targets — search or sort to narrow.`
            : `${matching.length} matching target${matching.length === 1 ? "" : "s"}.`}
        </div>
      </div>
    </>
  );
}

function Th({
  children,
  align = "left",
  onClick,
  sortDirection,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  onClick?: () => void;
  sortDirection?: SortDir;
}) {
  const contentClass = `block w-full px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${
    align === "right" ? "text-right" : "text-left"
  }`;

  return (
    <th
      aria-sort={
        sortDirection
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
      className={align === "right" ? "text-right" : "text-left"}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`${contentClass} cursor-pointer select-none hover:text-ink`}
        >
          {children}
        </button>
      ) : (
        <span className={contentClass}>{children}</span>
      )}
    </th>
  );
}

export function TargetsTableSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-6 w-20 animate-pulse rounded bg-line" />
        <div className="h-8 w-56 animate-pulse rounded-lg bg-line" />
      </div>
      <div className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)">
        <div className="space-y-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div
              key={index}
              className="h-6 w-full animate-pulse rounded bg-line"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
