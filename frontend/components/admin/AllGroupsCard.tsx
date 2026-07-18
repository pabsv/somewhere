"use client";

import Badge from "@/components/ui/Badge";
import type { AdminGroup } from "@/types/api";

/** Roster of every group + its members (RunFeed-style divided list). */
export default function AllGroupsCard({ groups }: { groups: AdminGroup[] }) {
  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
      {groups.length === 0 ? (
        <div className="px-4 py-6 text-sm text-ink-muted">No groups yet.</div>
      ) : (
        <ul className="divide-y divide-line/60">
          {groups.map((g) => (
            <li key={g.group_id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-ink">{g.name}</span>
                <span className="font-mono text-[11px] text-ink-muted">
                  owner {g.owner_name}
                </span>
                <span className="tnum ml-auto font-mono text-xs text-ink-muted">
                  {g.member_count} {g.member_count === 1 ? "member" : "members"}
                </span>
              </div>
              {g.members.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.members.map((m) => (
                    <span
                      key={m.user_id}
                      className="inline-flex items-center gap-1 rounded-tag border border-line bg-paper/60 px-1.5 py-0.5 text-xs text-ink"
                    >
                      {m.name || "—"}
                      {m.role === "owner" && (
                        <Badge variant="neutral">owner</Badge>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
