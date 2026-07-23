"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@/components/friends/Avatar";
import { DESTINATIONS } from "@/data/destinations.gen";
import { adminPool, adminRuns, adminUsers, ApiError } from "@/lib/client";
import type {
  AdminGroup,
  AdminPoolSummary,
  AdminRunsResponse,
  AdminUser,
  AdminUsersResponse,
} from "@/types/api";
import GroupDetailSheet from "./GroupDetailSheet";
import SetupMeter, { setupScore } from "./SetupMeter";
import UserDetailSheet from "./UserDetailSheet";
import { timeAgo } from "./timeAgo";

const WEEK_MS = 7 * 86_400_000;
const cityNames = new Map(DESTINATIONS.map((city) => [city.code, city.name]));

interface OverviewData {
  people: AdminUsersResponse;
  pool: AdminPoolSummary;
  runs: AdminRunsResponse;
  now: number;
}

export default function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);

  const requestOverview = useCallback((isCancelled: () => boolean) => {
    return Promise.all([adminUsers(), adminPool(), adminRuns(12)])
      .then(([people, pool, runs]) => {
        if (!isCancelled()) setData({ people, pool, runs, now: Date.now() });
      })
      .catch((cause) => {
        if (isCancelled()) return;
        if (
          cause instanceof ApiError &&
          (cause.status === 401 || cause.status === 403)
        ) {
          setError("Admin only.");
        } else {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load the admin overview.",
          );
        }
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false);
      });
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void requestOverview(() => false);
  }, [requestOverview]);

  useEffect(() => {
    let cancelled = false;
    void requestOverview(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [requestOverview]);

  function openUser(user: AdminUser) {
    setSelectedGroup(null);
    setSelectedUser(user);
  }

  function openGroup(group: AdminGroup) {
    setSelectedUser(null);
    setSelectedGroup(group);
  }

  if (error && !data) {
    return (
      <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted shadow-(--shadow-card)">
        {error}
        {error !== "Admin only." && (
          <button
            type="button"
            onClick={retry}
            className="ml-3 underline underline-offset-2 transition-colors hover:text-ink"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if ((loading && !data) || !data) return <OverviewSkeleton />;

  const { people, pool, runs } = data;
  const users = people.users;
  const total = users.length;
  const onboarded = users.filter((user) => user.onboarded).length;
  const fullySetUp = users.filter((user) => setupScore(user) === 4).length;
  const fourWeeksAgo = data.now - 4 * WEEK_MS;
  const newLastFourWeeks = users.filter((user) => {
    const created = user.created_at ? Date.parse(user.created_at) : NaN;
    return !Number.isNaN(created) && created >= fourWeeksAgo;
  }).length;
  const current = runs.runs.find((run) => run.status === "running") ?? runs.runs[0];
  const scraperRoute = current
    ? `${current.origin} → ${current.destination}`
    : "Waiting for next route";
  const scraperHealth =
    pool.tiles.overdue > 0
      ? `${pool.tiles.overdue} routes overdue · ${pool.tiles.enabled} enabled`
      : `healthy · ${pool.tiles.enabled} routes enabled`;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
        <HeroCard
          label="People"
          value={total}
          sub="signed up"
          note={`+${newLastFourWeeks} in the last 4 weeks`}
          noteClassName="text-steal"
        />
        <HeroCard
          label="Onboarded"
          value={`${total === 0 ? 0 : Math.round((onboarded / total) * 100)}%`}
          sub={`${onboarded} of ${total}`}
          note={`${total - onboarded} still in onboarding`}
          noteClassName={total === onboarded ? "text-steal" : "text-ink-muted"}
        />
        <HeroCard
          label="Fully set up"
          value={fullySetUp}
          sub={`of ${total}`}
          note="availability + favourites + social"
          noteClassName="text-ink-muted"
        />
        <Link
          href="/admin/pool"
          className="group rounded-(--radius-card) border border-line bg-night px-4 py-[18px] shadow-(--shadow-card) transition-colors hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.05em] text-paper/55">
              Scraper
            </span>
            <span className="font-mono text-[10px] text-paper/40 transition-colors group-hover:text-paper/65">
              → pool
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="relative flex h-[9px] w-[9px] shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-[9px] w-[9px] rounded-full bg-brand" />
            </span>
            <span className="truncate font-mono text-sm font-semibold text-paper">
              {scraperRoute}
            </span>
          </div>
          <div
            className={`mt-[9px] font-mono text-xs ${
              pool.tiles.overdue > 0 ? "text-brand" : "text-paper/55"
            }`}
          >
            {scraperHealth}
          </div>
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
        <SignupsCard users={users} now={data.now} />
        <FunnelCard users={users} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
        <TopCitiesCard users={users} />
        <RecentPeopleCard users={users} onSelect={openUser} />
      </div>

      <UserDetailSheet
        user={selectedUser}
        users={users}
        groups={people.groups}
        onClose={() => setSelectedUser(null)}
        onSelectUser={openUser}
        onSelectGroup={openGroup}
      />
      <GroupDetailSheet
        group={selectedGroup}
        users={users}
        onClose={() => setSelectedGroup(null)}
        onSelectUser={openUser}
      />
    </>
  );
}

function HeroCard({
  label,
  value,
  sub,
  note,
  noteClassName,
}: {
  label: string;
  value: number | string;
  sub: string;
  note: string;
  noteClassName: string;
}) {
  return (
    <div className="rounded-(--radius-card) border border-line bg-card px-4 py-[18px] shadow-(--shadow-card)">
      <div className="font-mono text-[11px] uppercase tracking-[0.05em] text-ink-muted">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="tnum font-mono text-[30px] font-semibold leading-none text-ink">
          {value}
        </span>
        <span className="font-mono text-xs text-ink-muted">{sub}</span>
      </div>
      <div className={`mt-2 text-[13px] ${noteClassName}`}>{note}</div>
    </div>
  );
}

function CardHeading({ title, context }: { title: string; context: string }) {
  return (
    <div className="mb-[18px] flex items-baseline justify-between gap-3">
      <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.05em] text-ink-muted">
        {context}
      </span>
    </div>
  );
}

function SignupsCard({ users, now }: { users: AdminUser[]; now: number }) {
  const buckets = Array.from({ length: 16 }, () => 0);
  for (const user of users) {
    const created = user.created_at ? Date.parse(user.created_at) : NaN;
    if (Number.isNaN(created)) continue;
    const weeksAgo = Math.floor((now - created) / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < 16) buckets[15 - weeksAgo] += 1;
  }
  const max = Math.max(...buckets, 1);
  const firstDate = new Date(now - 15 * WEEK_MS).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <section className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card)">
      <CardHeading title="Signups" context="last 16 weeks" />
      <div className="flex h-[104px] items-end gap-[5px]" aria-label="Weekly signups">
        {buckets.map((count, index) => {
          const height = count === 0 ? 3 : Math.round(10 + (count / max) * 84);
          return (
            <div
              key={index}
              aria-label={`${count} ${count === 1 ? "signup" : "signups"}`}
              tabIndex={0}
              className="group relative flex h-full flex-1 flex-col justify-end outline-none"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-card opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
                style={{ bottom: height + 7 }}
              >
                {count}
              </span>
              <div
                className={`rounded-t-[3px] ${
                  index === 15
                    ? "bg-brand"
                    : count === 0
                      ? "bg-line/70"
                      : "bg-ink"
                }`}
                style={{ height }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-muted">
        <span>{firstDate}</span>
        <span>this week</span>
      </div>
    </section>
  );
}

function FunnelCard({ users }: { users: AdminUser[] }) {
  const total = users.length;
  const stages = [
    ["Signed up", total],
    ["Finished onboarding", users.filter((user) => user.onboarded).length],
    ["Saved favourites", users.filter((user) => user.saved_cities.length > 0).length],
    [
      "Set availability",
      users.filter((user) => user.availability_window_count > 0).length,
    ],
    ["Joined a group", users.filter((user) => user.groups.length > 0).length],
  ] as const;

  return (
    <section className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card)">
      <CardHeading title="Engagement funnel" context="all time" />
      <div className="space-y-[11px]">
        {stages.map(([label, count]) => {
          const percent = total === 0 ? 0 : Math.round((count / total) * 100);
          return (
            <div key={label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-ink">{label}</span>
                <span className="tnum shrink-0 font-mono text-xs text-ink-muted">
                  <strong className="font-semibold text-ink">{count}</strong> · {percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-[4px] bg-line/60">
                <div
                  className={`h-full rounded-[4px] ${
                    percent >= 60 ? "bg-ink" : "bg-[#b9b09b]"
                  }`}
                  style={{ width: `${Math.max(percent, count > 0 ? 2 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopCitiesCard({ users }: { users: AdminUser[] }) {
  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of users) {
      for (const rawCode of user.saved_cities) {
        const code = rawCode.toUpperCase();
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6);
  }, [users]);
  const max = cities[0]?.[1] ?? 1;

  return (
    <section className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card)">
      <CardHeading title="Most-wanted cities" context="favourites" />
      {cities.length === 0 ? (
        <p className="text-sm text-ink-muted">No favourites saved yet.</p>
      ) : (
        <div className="space-y-2.5">
          {cities.map(([code, count]) => (
            <div key={code} className="flex items-center gap-2.5">
              <span className="w-[38px] shrink-0 rounded-(--radius-tag) bg-brand py-0.5 text-center font-mono text-[10px] font-semibold tracking-[0.05em] text-brand-ink">
                {code}
              </span>
              <span className="w-24 shrink-0 truncate text-[13px] text-ink">
                {cityNames.get(code) ?? "Unknown"}
              </span>
              <div className="h-[7px] flex-1 overflow-hidden rounded-[4px] bg-line/60">
                <div
                  className="h-full rounded-[4px] bg-ink"
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </div>
              <span className="tnum w-[22px] text-right font-mono text-xs font-semibold text-ink">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentPeopleCard({
  users,
  onSelect,
}: {
  users: AdminUser[];
  onSelect: (user: AdminUser) => void;
}) {
  const recent = [...users]
    .sort((a, b) => {
      const av = a.created_at ? Date.parse(a.created_at) : -Infinity;
      const bv = b.created_at ? Date.parse(b.created_at) : -Infinity;
      return bv - av;
    })
    .slice(0, 5);

  return (
    <section className="rounded-(--radius-card) border border-line bg-card px-5 pb-3 pt-5 shadow-(--shadow-card)">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink">
          Recently joined
        </h2>
        <Link
          href="/admin/people"
          className="shrink-0 font-mono text-[11px] uppercase tracking-[0.05em] text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          all people →
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="py-4 text-sm text-ink-muted">No people yet.</p>
      ) : (
        <div>
          {recent.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              className="flex w-full items-center gap-3 rounded-md border-b border-line/50 px-1 py-[9px] text-left transition-colors last:border-0 hover:bg-paper/80 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
            >
              <Avatar name={user.name} email={user.email} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {user.name || user.email}
                </span>
                <span className="block truncate font-mono text-[11px] text-ink-muted">
                  {timeAgo(user.created_at)} · {signupLabel(user)}
                  {!user.onboarded ? " · still onboarding" : ""}
                </span>
              </span>
              <SetupMeter user={user} size={9} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function signupLabel(user: AdminUser): string {
  if (user.has_google && user.has_password) return "Google + password";
  if (user.has_google) return "Google";
  if (user.has_password) return "Password";
  return "No login method";
}

function OverviewSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 min-[720px]:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-[111px] animate-pulse rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)"
          />
        ))}
      </div>
      {Array.from({ length: 2 }, (_, row) => (
        <div key={row} className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
          <div className="h-[210px] animate-pulse rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)" />
          <div className="h-[210px] animate-pulse rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)" />
        </div>
      ))}
    </div>
  );
}
