"use client";

import type { ReactNode } from "react";
import Avatar from "@/components/friends/Avatar";
import Sheet from "@/components/ui/Sheet";
import { DESTINATIONS } from "@/data/destinations.gen";
import type { AdminGroup, AdminUser } from "@/types/api";
import SetupMeter, { setupScore } from "./SetupMeter";
import { timeAgo } from "./timeAgo";

export type GroupStatus = "active" | "quiet" | "empty";

const cityNames = new Map(DESTINATIONS.map((city) => [city.code, city.name]));

export function groupStatus(group: AdminGroup): GroupStatus {
  if (group.member_count <= 1) return "empty";
  if (!group.last_active_at) return "quiet";
  const lastActive = Date.parse(group.last_active_at);
  if (Number.isNaN(lastActive)) return "quiet";
  return Date.now() - lastActive > 7 * 86_400_000 ? "quiet" : "active";
}

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  const classes =
    status === "active"
      ? "bg-steal text-white border-transparent"
      : status === "empty"
        ? "border-alert/35 bg-alert/[0.08] text-alert"
        : "border-line bg-transparent text-ink-muted";
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-widest ${classes}`}
    >
      {status}
    </span>
  );
}

export default function GroupDetailSheet({
  group,
  users,
  onClose,
  onSelectUser,
}: {
  group: AdminGroup | null;
  users: AdminUser[];
  onClose: () => void;
  onSelectUser: (user: AdminUser) => void;
}) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const status = group ? groupStatus(group) : "quiet";

  return (
    <Sheet
      open={group != null}
      onClose={onClose}
      title={group?.name ?? "Group"}
      ariaLabel={group ? `${group.name} group details` : "Group details"}
      panelClassName="max-w-[460px]"
      bodyClassName="px-5 py-[18px]"
      header={
        group ? (
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <h2 className="truncate font-display text-lg font-semibold text-ink">
                {group.name}
              </h2>
              <GroupStatusBadge status={status} />
            </div>
            <p className="mt-0.5 truncate font-mono text-[10.5px] font-normal text-ink-muted">
              created {timeAgo(group.created_at)} · owner {group.owner_name}
            </p>
          </div>
        ) : undefined
      }
    >
      {group && (
        <div className="space-y-[22px]">
          {status === "empty" && (
            <div className="rounded-lg border border-alert/25 bg-alert/[0.06] px-3 py-2.5 text-[13px] leading-relaxed text-alert">
              Only the owner is in this group — it was never used. A nudge or
              cleanup candidate.
            </div>
          )}
          {status === "quiet" && (
            <div className="rounded-lg border border-line bg-paper/50 px-3 py-2.5 text-[13px] leading-relaxed text-ink-muted">
              No activity in over a week.
            </div>
          )}

          <Section title={`Members (${group.member_count})`}>
            <div className="divide-y divide-line/60">
              {group.members.map((member) => {
                const user = usersById.get(member.user_id);
                const owner = member.role === "owner";
                return (
                  <button
                    key={member.user_id}
                    type="button"
                    disabled={!user}
                    onClick={() => user && onSelectUser(user)}
                    className="flex w-full items-center gap-3 rounded-md py-2 text-left transition-colors hover:bg-paper/70 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    <Avatar
                      name={member.name}
                      size={32}
                      className={owner ? "ring-2 ring-brand ring-offset-2 ring-offset-card" : ""}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-ink">
                          {member.name || "Unknown member"}
                        </span>
                        {owner && (
                          <span className="rounded-[4px] bg-brand px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-brand-ink">
                            owner
                          </span>
                        )}
                      </span>
                      <span className="block truncate font-mono text-[10.5px] text-ink-muted">
                        {user
                          ? `${setupScore(user)}/4 set up · ${
                              user.onboarded
                                ? `joined app ${timeAgo(user.created_at)}`
                                : "still onboarding"
                            }`
                          : "account unavailable"}
                      </span>
                    </span>
                    {user && <SetupMeter user={user} size={8} />}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={`Trips on the board (${group.trip_count})`}>
            {group.trips.length === 0 ? (
              <Muted>No trips on the board yet.</Muted>
            ) : (
              <div className="divide-y divide-line/60">
                {group.trips.map((trip, index) => {
                  const addedBy = usersById.get(trip.added_by)?.name ?? trip.added_by;
                  return (
                    <div
                      key={`${trip.code}-${trip.start}-${trip.end}-${index}`}
                      className="flex items-center gap-2.5 py-2"
                    >
                      <span className="w-[38px] shrink-0 rounded-(--radius-tag) bg-brand py-0.5 text-center font-mono text-[10px] font-semibold tracking-wide text-brand-ink">
                        {trip.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {cityNames.get(trip.code) ?? trip.code}
                        </span>
                        <span className="block truncate font-mono text-[10.5px] text-ink-muted">
                          {formatDate(trip.start)} → {formatDate(trip.end)} · by {addedBy || "unknown"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title="Activity">
            <div className="space-y-1.5">
              <Row label="Last active" value={group.last_active_at ? timeAgo(group.last_active_at) : "never"} />
              <Row label="Shared favourites" value={group.shared_favourites_count} />
              <Row label="Trips planned" value={group.trip_count} />
              <Row label="Created" value={timeAgo(group.created_at)} />
            </div>
          </Section>
        </div>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[13.5px] text-ink-muted">{label}</span>
      <span className="tnum text-right font-mono text-xs text-ink">{value}</span>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-muted/80">{children}</p>;
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
