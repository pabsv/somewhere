"use client";

import Avatar from "@/components/friends/Avatar";
import type { AdminGroup, AdminUser } from "@/types/api";
import { GroupStatusBadge, groupStatus } from "./GroupDetailSheet";
import { timeAgo } from "./timeAgo";

export default function AllGroupsCard({
  groups,
  users,
  onSelect,
}: {
  groups: AdminGroup[];
  users: AdminUser[];
  onSelect: (group: AdminGroup) => void;
}) {
  const statusCounts = groups.reduce(
    (counts, group) => {
      counts[groupStatus(group)] += 1;
      return counts;
    },
    { active: 0, quiet: 0, empty: 0 },
  );
  const namesById = new Map(users.map((user) => [user.id, user.name]));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-ink">Groups</h2>
        <p className="tnum font-mono text-[11px] text-ink-muted">
          {groups.length} total · {statusCounts.active} active · {statusCounts.quiet} quiet · {statusCounts.empty} empty
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-(--radius-card) border border-line bg-card px-4 py-6 text-sm text-ink-muted shadow-(--shadow-card)">
          No groups yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-3">
          {groups.map((group) => {
            const status = groupStatus(group);
            return (
              <button
                key={group.group_id}
                type="button"
                onClick={() => onSelect(group)}
                className={`min-w-0 rounded-(--radius-card) border bg-card p-4 text-left shadow-(--shadow-card) transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  status === "empty" ? "border-alert/30" : "border-line"
                }`}
              >
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="truncate font-display text-base font-semibold text-ink">
                    {group.name}
                  </span>
                  <GroupStatusBadge status={status} />
                </span>
                <span className="mt-1.5 block truncate text-xs text-ink-muted">
                  {group.member_count} {group.member_count === 1 ? "member" : "members"} · owner {group.owner_name}
                </span>

                <span className="mt-4 flex min-h-8 items-center">
                  {group.members.slice(0, 5).map((member, index) => {
                    const owner = member.role === "owner";
                    return (
                      <span
                        key={member.user_id}
                        className={index > 0 ? "-ml-1.5" : ""}
                        title={`${member.name}${owner ? " · owner" : ""}`}
                      >
                        <Avatar
                          name={member.name || namesById.get(member.user_id) || ""}
                          size={28}
                          className={`ring-2 ring-card ${
                            owner ? "relative z-10 outline-2 outline-offset-0 outline-brand" : ""
                          }`}
                        />
                      </span>
                    );
                  })}
                  {group.members.length > 5 && (
                    <span className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-paper font-mono text-[10px] text-ink-muted ring-2 ring-card">
                      +{group.members.length - 5}
                    </span>
                  )}
                </span>

                <span className="mt-3 block truncate font-mono text-[11px] text-ink-muted">
                  {group.trip_count} {group.trip_count === 1 ? "trip" : "trips"} · {group.shared_favourites_count} shared favourites · {group.last_active_at ? `active ${timeAgo(group.last_active_at)}` : "never active"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
