"use client";

import type { ReactNode } from "react";
import Avatar from "@/components/friends/Avatar";
import Sheet from "@/components/ui/Sheet";
import { getDestination } from "@/data/destinations.gen";
import { formatPrice } from "@/lib/format";
import type { AdminGroup, AdminUser, DateWindow } from "@/types/api";
import { setupChecks } from "./SetupMeter";
import { timeAgo } from "./timeAgo";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function UserDetailSheet({
  user,
  users = [],
  groups = [],
  onClose,
  onSelectUser,
  onSelectGroup,
}: {
  user: AdminUser | null;
  users?: AdminUser[];
  groups?: AdminGroup[];
  onClose: () => void;
  onSelectUser?: (user: AdminUser) => void;
  onSelectGroup?: (group: AdminGroup) => void;
}) {
  const p = user?.preferences;
  const usersById = new Map(users.map((entry) => [entry.id, entry]));
  const groupsById = new Map(groups.map((entry) => [entry.group_id, entry]));

  return (
    <Sheet
      open={user != null}
      onClose={onClose}
      title={user?.name || user?.email || "Person"}
      ariaLabel={user ? `${user.name || user.email} details` : "Person details"}
      panelClassName="max-w-[460px]"
      bodyClassName="px-5 py-[18px]"
      header={
        user ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={user.name} email={user.email} size={40} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-lg font-semibold text-ink">
                {user.name || user.email}
              </h2>
              <p className="mt-0.5 truncate font-mono text-[10.5px] font-normal text-ink-muted">
                {user.email} · joined {timeAgo(user.created_at)} · {signupLabel(user)}
              </p>
            </div>
          </div>
        ) : undefined
      }
    >
      {user && p && (
        <div className="space-y-[22px]">
          <section>
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
              Setup checklist
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {setupChecks(user).map((item) => (
                <div
                  key={item.key}
                  className="flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-paper/50 px-[11px] py-[9px]"
                >
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      item.done ? "bg-steal text-white" : "bg-line text-ink-muted"
                    }`}
                    aria-hidden="true"
                  >
                    {item.done ? "✓" : "·"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-ink">
                      {item.label}
                    </span>
                    <span className="block truncate font-mono text-[10.5px] text-ink-muted">
                      {item.detail}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <Section title="Preferences">
            <div className="space-y-1.5">
              <Row
                label="Origins"
                value={p.origins.length ? <ChipRow items={p.origins} /> : <Muted>none</Muted>}
              />
              <Row
                label="Trip length"
                value={
                  p.trip_min_nights != null && p.trip_max_nights != null
                    ? `${p.trip_min_nights}–${p.trip_max_nights} nights`
                    : "—"
                }
              />
              <Row
                label="Max price"
                value={p.max_price != null ? formatPrice(p.max_price) : "any"}
              />
              <Row label="Direct only" value={p.direct_only ? "yes" : "no"} />
              <Row
                label="Busy weekdays"
                value={
                  p.busy_weekdays.length ? (
                    <ChipRow
                      items={p.busy_weekdays
                        .slice()
                        .sort((a, b) => a - b)
                        .map((day) => WEEKDAYS[day - 1] ?? String(day))}
                    />
                  ) : (
                    <Muted>none</Muted>
                  )
                }
              />
              <Row label="Deal alerts" value={p.notify_optin ? "on" : "off"} />
              {p.university && (
                <Row label="University" value={p.university.toUpperCase()} />
              )}
            </div>
          </Section>

          <Section title={`Favourites (${user.saved_cities.length})`}>
            {user.saved_cities.length === 0 ? (
              <Muted>No favourites yet.</Muted>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {user.saved_cities.map((code) => {
                  const destination = getDestination(code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-1 pr-2.5 text-xs text-ink"
                    >
                      <span className="rounded-[5px] bg-brand px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-ink">
                        {code}
                      </span>
                      <span>{destination?.name ?? "Unknown"}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title={`Availability (${user.availability_window_count})`}>
            {user.availability.length === 0 ? (
              <Muted>No availability set.</Muted>
            ) : (
              <div className="divide-y divide-line/60">
                {user.availability.map((window, index) => (
                  <div
                    key={`${window.start_date}-${window.end_date}-${index}`}
                    className="py-1.5"
                  >
                    <span className="font-mono text-[12.5px] text-ink">
                      {formatDate(window.start_date)} → {formatDate(window.end_date)}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-ink-muted">
                      {nights(window)}n
                    </span>
                    {window.label && (
                      <span className="ml-2 text-xs text-ink-muted">{window.label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Friends (${user.friend_count})`}>
            {user.friends.length === 0 ? (
              <Muted>No friends yet.</Muted>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {user.friends.map((friend) => {
                  const fullUser = usersById.get(friend.user_id);
                  return (
                    <button
                      key={friend.user_id}
                      type="button"
                      disabled={!fullUser || !onSelectUser}
                      onClick={() => fullUser && onSelectUser?.(fullUser)}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-2.5 text-xs font-medium text-ink transition-colors hover:border-ink-muted hover:bg-paper/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-default"
                    >
                      <Avatar name={friend.name} email={friend.email} size={26} />
                      {friend.name || friend.email}
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title={`Groups (${user.groups.length})`}>
            {user.groups.length === 0 ? (
              <Muted>Not in any group.</Muted>
            ) : (
              <div className="divide-y divide-line/60 rounded-lg border border-line">
                {user.groups.map((membership) => {
                  const group = groupsById.get(membership.group_id);
                  return (
                    <button
                      key={membership.group_id}
                      type="button"
                      disabled={!group || !onSelectGroup}
                      onClick={() => group && onSelectGroup?.(group)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-paper/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink disabled:cursor-default"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
                        {membership.name}
                      </span>
                      <span className="rounded-[4px] border border-line px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-ink-muted">
                        {membership.my_role}
                      </span>
                      <span className="tnum shrink-0 font-mono text-[11px] text-ink-muted">
                        {group ? `${group.member_count} members` : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
      <span className="shrink-0 text-[13.5px] text-ink-muted">{label}</span>
      <span className="min-w-0 text-right text-[13.5px] text-ink">{value}</span>
    </div>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-[5px] border border-line px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-ink-muted"
        >
          {item}
        </span>
      ))}
    </span>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-sm text-ink-muted/80">{children}</span>;
}

function signupLabel(user: AdminUser): string {
  if (user.has_google && user.has_password) return "Google + password";
  if (user.has_google) return "Google";
  if (user.has_password) return "Password";
  return "no login method";
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

function nights(window: DateWindow): number {
  const start = Date.parse(`${window.start_date}T00:00:00Z`);
  const end = Date.parse(`${window.end_date}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}
