"use client";

import { useMemo, useState } from "react";
import Avatar from "@/components/friends/Avatar";
import type { AdminUser, DateWindow } from "@/types/api";
import SetupMeter, { setupScore, setupState } from "./SetupMeter";
import { timeAgo } from "./timeAgo";

interface UsersTableProps {
  users: AdminUser[];
  onSelect: (user: AdminUser) => void;
}

type Filter = "all" | "set-up" | "partial" | "not-started";
type SortKey = "name" | "created_at" | "setup" | "friend_count" | "group_count";
type SortDir = "asc" | "desc";

export default function UsersTable({ users, onSelect }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filterCounts = useMemo(
    () => ({
      all: users.length,
      "set-up": users.filter((user) => setupState(user) === "set-up").length,
      partial: users.filter((user) => setupState(user) === "partial").length,
      "not-started": users.filter((user) => setupState(user) === "not-started").length,
    }),
    [users],
  );

  const sorted = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === "all" || setupState(user) === filter;
      return matchesQuery && matchesFilter;
    });

    return matches.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "created_at":
          comparison = dateValue(a.created_at) - dateValue(b.created_at);
          break;
        case "setup":
          comparison = setupScore(a) - setupScore(b);
          break;
        case "friend_count":
          comparison = a.friend_count - b.friend_count;
          break;
        case "group_count":
          comparison = a.groups.length - b.groups.length;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [filter, query, sortDir, sortKey, users]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  }

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: `All ${filterCounts.all}` },
    { id: "set-up", label: `Set up ${filterCounts["set-up"]}` },
    { id: "partial", label: `Partial ${filterCounts.partial}` },
    { id: "not-started", label: `Not started ${filterCounts["not-started"]}` },
  ];

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search people…"
          aria-label="Search people"
          className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none min-[720px]:w-[264px]"
        />
        {filters.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-transparent text-ink-muted hover:border-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[11px] text-ink-muted">
          {sorted.length} of {users.length} people
        </span>
      </div>

      <div className="hidden overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card) min-[720px]:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th
                  label="Person"
                  sortKey="name"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <Th
                  label="Joined"
                  sortKey="created_at"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <Th
                  label="Setup"
                  sortKey="setup"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <Th label="Favourite cities" />
                <Th label="Next window" />
                <Th
                  label="Friends"
                  align="right"
                  sortKey="friend_count"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
                <Th
                  label="Groups"
                  align="right"
                  sortKey="group_count"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sorted.map((user) => {
                const next = nextWindow(user);
                return (
                  <tr
                    key={user.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(user)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(user);
                      }
                    }}
                    className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-paper/60 focus-visible:bg-paper/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                  >
                    <td className="px-3 py-[5px]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={user.name} email={user.email} size={30} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">
                            {user.name || user.email}
                          </p>
                          <p className="truncate text-xs text-ink-muted/80">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-[5px] font-mono text-xs text-ink-muted"
                      title={user.created_at ?? "unknown"}
                    >
                      {timeAgo(user.created_at)}
                    </td>
                    <td className="px-3 py-[5px]">
                      <SetupMeter user={user} showScore />
                    </td>
                    <td className="px-3 py-[5px]">
                      <CityChips codes={user.saved_cities} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-[5px]">
                      {next ? <WindowLabel window={next} /> : <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="tnum px-3 py-[5px] text-right font-mono text-xs text-ink">
                      {user.friend_count}
                    </td>
                    <td className="tnum px-3 py-[5px] text-right font-mono text-xs text-ink">
                      {user.groups.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && <EmptyState />}
      </div>

      <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card) min-[720px]:hidden">
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-line/60">
            {sorted.map((user) => {
              const next = nextWindow(user);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => onSelect(user)}
                  className="w-full px-3.5 py-3 text-left transition-colors hover:bg-paper/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
                >
                  <span className="flex items-center gap-2.5">
                    <Avatar name={user.name} email={user.email} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {user.name || user.email}
                      </span>
                      <span className="block truncate text-xs text-ink-muted/80">
                        {user.email}
                      </span>
                    </span>
                    <SetupMeter user={user} />
                  </span>
                  <span className="mt-2 flex min-w-0 items-center gap-2 pl-[42px]">
                    <CityChips codes={user.saved_cities} max={2} />
                    {next && (
                      <span className="min-w-0 truncate font-mono text-[10.5px] text-ink-muted">
                        {formatDate(next.start_date)}–{formatDate(next.end_date)}
                      </span>
                    )}
                    <span className="tnum ml-auto shrink-0 font-mono text-[10.5px] text-ink-muted">
                      {user.friend_count} fr · {user.groups.length} gr
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  label,
  align = "left",
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  align?: "left" | "right";
  sortKey?: SortKey;
  activeKey?: SortKey;
  direction?: SortDir;
  onSort?: (key: SortKey) => void;
}) {
  const active = sortKey != null && sortKey === activeKey;
  const ariaSort = active ? (direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <th
      className={`px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
      aria-sort={sortKey ? ariaSort : undefined}
    >
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="whitespace-nowrap transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {label}
          {active ? (direction === "asc" ? " ↑" : " ↓") : ""}
        </button>
      ) : (
        label
      )}
    </th>
  );
}

function CityChips({ codes, max = 3 }: { codes: string[]; max?: number }) {
  if (codes.length === 0) return <span className="text-ink-muted">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-1">
      {codes.slice(0, max).map((code) => (
        <span
          key={code}
          className="rounded-[5px] bg-brand px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-brand-ink"
        >
          {code}
        </span>
      ))}
      {codes.length > max && (
        <span className="font-mono text-[11px] text-ink-muted">+{codes.length - max}</span>
      )}
    </span>
  );
}

function WindowLabel({ window }: { window: DateWindow }) {
  return (
    <span>
      <span className="font-mono text-xs text-ink">
        {formatDate(window.start_date)} – {formatDate(window.end_date)}
      </span>
      <span className="ml-1.5 font-mono text-[11px] text-ink-muted">
        · {windowNights(window)}n
      </span>
    </span>
  );
}

function EmptyState() {
  return <div className="px-4 py-6 text-sm text-ink-muted">No people match.</div>;
}

function nextWindow(user: AdminUser): DateWindow | null {
  const today = new Date().toISOString().slice(0, 10);
  return (
    [...user.availability]
      .filter((window) => window.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null
  );
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function windowNights(window: DateWindow): number {
  const start = Date.parse(`${window.start_date}T00:00:00Z`);
  const end = Date.parse(`${window.end_date}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function dateValue(value: string | null): number {
  if (!value) return -Infinity;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

export function UsersTableSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="h-9 w-full max-w-xl animate-pulse rounded-lg bg-line" />
      <div className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)">
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-10 w-full animate-pulse rounded bg-line" />
          ))}
        </div>
      </div>
    </div>
  );
}
