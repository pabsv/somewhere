"use client";

import type { ReactNode } from "react";
import Sheet from "@/components/ui/Sheet";
import Badge from "@/components/ui/Badge";
import { getDestination } from "@/data/destinations.gen";
import { formatPrice } from "@/lib/format";
import type { AdminUser, DateWindow } from "@/types/api";
import { timeAgo } from "./timeAgo";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function signupLabel(u: AdminUser): string {
  if (u.has_google && u.has_password) return "Google + Password";
  if (u.has_google) return "Google";
  if (u.has_password) return "Password";
  return "—";
}

function windowLabel(w: DateWindow): string {
  const from = w.start_time != null ? ` (from ${w.start_time}:00)` : "";
  const by = w.end_time != null ? ` (back by ${w.end_time}:00)` : "";
  const range = w.start_date === w.end_date ? w.start_date : `${w.start_date} → ${w.end_date}`;
  return `${range}${from}${by}`;
}

export default function UserDetailSheet({
  user,
  onClose,
}: {
  user: AdminUser | null;
  onClose: () => void;
}) {
  const p = user?.preferences;
  return (
    <Sheet
      open={user != null}
      onClose={onClose}
      title={user?.name || user?.email || "User"}
    >
      {user && p && (
        <div className="space-y-6">
          {/* Account */}
          <Section title="Account">
            <Row label="Email" value={user.email} />
            <Row
              label="Role"
              value={
                user.role === "admin" ? (
                  <Badge variant="deal">ADMIN</Badge>
                ) : (
                  <Badge variant="neutral">USER</Badge>
                )
              }
            />
            <Row label="Signup" value={signupLabel(user)} />
            <Row
              label="Joined"
              value={user.created_at ? timeAgo(user.created_at) : "unknown"}
            />
            <Row
              label="Onboarded"
              value={
                user.onboarded
                  ? user.onboarded_at
                    ? timeAgo(user.onboarded_at)
                    : "yes"
                  : "pending"
              }
            />
            <Row
              label="Deal alerts"
              value={p.notify_optin ? "opted in" : "no"}
            />
          </Section>

          {/* Preferences */}
          <Section title="Preferences">
            <Row
              label="Origins"
              value={
                p.origins.length ? (
                  <ChipRow items={p.origins} />
                ) : (
                  <Muted>none</Muted>
                )
              }
            />
            <Row
              label="Trip length"
              value={
                p.trip_min_nights != null && p.trip_max_nights != null
                  ? `${p.trip_min_nights}–${p.trip_max_nights} nights`
                  : "—"
              }
            />
            <Row label="Direct only" value={p.direct_only ? "yes" : "no"} />
            <Row
              label="Max price"
              value={p.max_price != null ? formatPrice(p.max_price) : "any"}
            />
            <Row
              label="Busy weekdays"
              value={
                p.busy_weekdays.length ? (
                  <ChipRow
                    items={p.busy_weekdays
                      .slice()
                      .sort((a, b) => a - b)
                      .map((d) => WEEKDAYS[d - 1] ?? String(d))}
                  />
                ) : (
                  <Muted>none</Muted>
                )
              }
            />
            {p.university && <Row label="University" value={p.university.toUpperCase()} />}
          </Section>

          {/* Favourites */}
          <Section title={`Favourites (${user.saved_cities.length})`}>
            {user.saved_cities.length === 0 ? (
              <Muted>No favourites.</Muted>
            ) : (
              <ul className="space-y-1">
                {user.saved_cities.map((code) => {
                  const dest = getDestination(code);
                  return (
                    <li
                      key={code}
                      className="flex items-baseline gap-2 text-sm text-ink"
                    >
                      <span className="tnum rounded-tag bg-brand px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-ink">
                        {code}
                      </span>
                      <span>{dest?.name ?? "Unknown"}</span>
                      {dest && (
                        <span className="text-xs text-ink-muted">
                          {dest.country}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {/* Availability */}
          <Section title={`Availability (${user.availability_window_count})`}>
            {user.availability.length === 0 ? (
              <Muted>No availability set.</Muted>
            ) : (
              <ul className="space-y-1">
                {user.availability.map((w, i) => (
                  <li
                    key={`${w.start_date}-${w.end_date}-${i}`}
                    className="font-mono text-xs text-ink"
                  >
                    {windowLabel(w)}
                    {w.label && (
                      <span className="ml-2 text-ink-muted">— {w.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Friends */}
          <Section title={`Friends (${user.friend_count})`}>
            {user.friends.length === 0 ? (
              <Muted>No friends yet.</Muted>
            ) : (
              <ul className="space-y-1">
                {user.friends.map((f) => (
                  <li key={f.user_id} className="text-sm text-ink">
                    {f.name || f.email}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Groups */}
          <Section title={`Groups (${user.groups.length})`}>
            {user.groups.length === 0 ? (
              <Muted>Not in any group.</Muted>
            ) : (
              <ul className="space-y-1.5">
                {user.groups.map((g) => (
                  <li
                    key={g.group_id}
                    className="flex items-center gap-2 text-sm text-ink"
                  >
                    <span>{g.name}</span>
                    <Badge variant="neutral">{g.my_role}</Badge>
                  </li>
                ))}
              </ul>
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
      <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-sm text-ink-muted">{label}</span>
      <span className="min-w-0 text-right text-sm text-ink">{value}</span>
    </div>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {items.map((it) => (
        <span
          key={it}
          className="rounded-tag border border-line px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-ink-muted"
        >
          {it}
        </span>
      ))}
    </span>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-sm text-ink-muted/80">{children}</span>;
}
