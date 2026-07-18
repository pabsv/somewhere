"use client";

import { useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import { PersonLabel } from "@/components/friends/RequestsCard";
import type { AdminUser } from "@/types/api";
import { timeAgo } from "./timeAgo";

interface UsersTableProps {
  users: AdminUser[];
  onSelect: (user: AdminUser) => void;
}

type SortKey =
  | "name"
  | "created_at"
  | "friend_count"
  | "group_count"
  | "avail_count";
type SortDir = "asc" | "desc";

function signupLabel(u: AdminUser): string {
  if (u.has_google && u.has_password) return "Both";
  if (u.has_google) return "Google";
  if (u.has_password) return "Password";
  return "—";
}

export default function UsersTable({ users, onSelect }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "created_at": {
          const av = a.created_at ? Date.parse(a.created_at) : -Infinity;
          const bv = b.created_at ? Date.parse(b.created_at) : -Infinity;
          cmp = av - bv;
          break;
        }
        case "friend_count":
          cmp = a.friend_count - b.friend_count;
          break;
        case "group_count":
          cmp = a.groups.length - b.groups.length;
          break;
        case "avail_count":
          cmp = a.availability_window_count - b.availability_window_count;
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const arrow = (key: SortKey) =>
    key === sortKey ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email…"
        aria-label="Search users"
        className="w-full max-w-sm rounded-(--radius-tag) border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
      />

      <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <Th onClick={() => toggleSort("name")} sortable>
                  User{arrow("name")}
                </Th>
                <Th>Role</Th>
                <Th>Signup</Th>
                <Th onClick={() => toggleSort("created_at")} sortable>
                  Joined{arrow("created_at")}
                </Th>
                <Th>Onboarded</Th>
                <Th align="right">Fav</Th>
                <Th
                  align="right"
                  onClick={() => toggleSort("avail_count")}
                  sortable
                >
                  Avail{arrow("avail_count")}
                </Th>
                <Th
                  align="right"
                  onClick={() => toggleSort("friend_count")}
                  sortable
                >
                  Friends{arrow("friend_count")}
                </Th>
                <Th
                  align="right"
                  onClick={() => toggleSort("group_count")}
                  sortable
                >
                  Groups{arrow("group_count")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => onSelect(u)}
                  className="cursor-pointer border-b border-line/60 last:border-0 hover:bg-paper/60"
                >
                  <td className="px-3 py-2">
                    <PersonLabel name={u.name} email={u.email} />
                  </td>
                  <td className="px-3 py-2">
                    {u.role === "admin" ? (
                      <Badge variant="deal">ADMIN</Badge>
                    ) : (
                      <Badge variant="neutral">USER</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-ink-muted">
                    {signupLabel(u)}
                  </td>
                  <td
                    className="px-3 py-2 font-mono text-xs text-ink-muted"
                    title={u.created_at ?? "unknown"}
                  >
                    {timeAgo(u.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    {u.onboarded ? (
                      <span
                        aria-label="onboarded"
                        title="onboarded"
                        className="font-mono text-xs text-steal"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        aria-label="onboarding pending"
                        title="onboarding pending"
                        className="font-mono text-xs text-ink-muted"
                      >
                        pending
                      </span>
                    )}
                  </td>
                  <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                    {u.saved_cities.length}
                  </td>
                  <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                    {u.availability_window_count}
                  </td>
                  <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                    {u.friend_count}
                  </td>
                  <td className="tnum px-3 py-2 text-right font-mono text-xs text-ink">
                    {u.groups.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && (
          <div className="px-4 py-6 text-sm text-ink-muted">
            {query ? "No users match that search." : "No users yet."}
          </div>
        )}
      </div>
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

export function UsersTableSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)"
    >
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-8 w-full animate-pulse rounded bg-line" />
        ))}
      </div>
    </div>
  );
}
