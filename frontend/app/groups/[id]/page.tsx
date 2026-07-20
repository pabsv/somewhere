"use client";

// ─── /groups/[id] — Group detail (crew view) ─────────────────────────────────
// Client page; middleware handles the sign-in redirect, so this component only
// needs its own not-found/error states. Fetches getGroup + getGroupTrips
// together on mount. Rename only touches `detail` (name doesn't affect trip
// matching). Any membership-affecting mutation (add/remove member) refetches
// BOTH detail + trips, since membership changes the trip-matching
// denominators. Leave/delete navigate away, so neither refetches.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import GroupTripsBoard from "@/components/groups/GroupTripsBoard";
import GroupTripsCalendar from "@/components/groups/GroupTripsCalendar";
import Chip from "@/components/ui/Chip";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import MembersCard from "@/components/groups/MembersCard";
import InviteCard from "@/components/groups/InviteCard";
import {
  ApiError,
  deleteGroup,
  getGroup,
  getGroupTrips,
  leaveGroup,
  removeGroupMember,
  renameGroup,
} from "@/lib/client";
import type { GroupDetailResponse, GroupTripsResponse } from "@/types/api";

type Mode = "loading" | "ready" | "error" | "not-found";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data: session } = useSession();

  const [detail, setDetail] = useState<GroupDetailResponse | null>(null);
  const [trips, setTrips] = useState<GroupTripsResponse | null>(null);
  const [tripsView, setTripsView] = useState<"list" | "calendar">("calendar");
  const [fullOnly, setFullOnly] = useState(true);
  const [infoOpen, setInfoOpen] = useState(true);
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setMode("loading");
    setLoadError(null);
    Promise.all([getGroup(id), getGroupTrips(id)])
      .then(([d, t]) => {
        if (cancelled) return;
        setDetail(d);
        setTrips(t);
        setMode("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setMode("not-found");
        } else {
          setLoadError(
            err instanceof Error ? err.message : "Could not load this group.",
          );
          setMode("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // `load` synchronously calls setMode()/setLoadError() so the Retry button
  // below (which also calls `load` directly) can reset from "error" back to
  // "loading" — running the same function here keeps the mount fetch and the
  // retry on one code path instead of duplicating the fetch logic.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => load(), [load]);

  const refetchAll = useCallback(async () => {
    const [d, t] = await Promise.all([getGroup(id), getGroupTrips(id)]);
    setDetail(d);
    setTrips(t);
  }, [id]);

  const onRename = useCallback(
    async (name: string) => {
      const d = await renameGroup(id, name);
      setDetail(d);
    },
    [id],
  );

  const onRemoveMember = useCallback(
    async (userId: string) => {
      await removeGroupMember(id, userId);
      await refetchAll();
    },
    [id, refetchAll],
  );

  const onLeaveGroup = useCallback(async () => {
    await leaveGroup(id);
    router.push("/groups");
  }, [id, router]);

  const onDeleteGroup = useCallback(async () => {
    await deleteGroup(id);
    router.push("/groups");
  }, [id, router]);

  if (mode === "loading") return <GroupDetailSkeleton />;

  if (mode === "not-found") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-(--radius-card) border border-line bg-card p-8 text-center shadow-(--shadow-card)">
          <p className="font-display text-xl font-semibold text-ink">
            Group not found
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            This group doesn&rsquo;t exist, or you&rsquo;re not a member of
            it.
          </p>
          <Link
            href="/groups"
            className="mt-4 inline-block text-sm text-ink underline underline-offset-2 hover:text-ink-muted"
          >
            ← Back to groups
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "error") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-(--radius-card) border border-alert/30 bg-card p-8 text-center shadow-(--shadow-card)">
          <p className="font-display text-xl font-semibold text-ink">
            Couldn&rsquo;t load this group
          </p>
          <p className="mt-2 text-sm text-ink-muted">{loadError}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 rounded-(--radius-tag) bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-night"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!detail || !trips) return null;

  const isOwner = detail.my_role === "owner";
  const myUserId = session?.user?.id ?? "";
  const hasFullGroup = trips.trips.some((t) => t.full_group);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        ← Groups
      </Link>

      <header className="mb-8 mt-4 flex flex-wrap items-start justify-between gap-3">
        <GroupNameHeader
          name={detail.name}
          editable={isOwner}
          onRename={onRename}
        />
        <span className="mt-1 shrink-0 rounded-(--radius-tag) border border-line bg-card px-2 py-1 font-mono text-xs uppercase tracking-widest text-ink-muted">
          {isOwner ? "Owner" : "Member"}
        </span>
      </header>

      <section className="mb-10">
        {/* Toolbar: view toggle + everyone-free chip on the left, info panel
            toggle on the right — all on one line. */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Chip
            size="sm"
            selected={tripsView === "calendar"}
            onClick={() => setTripsView("calendar")}
          >
            Calendar
          </Chip>
          <Chip
            size="sm"
            selected={tripsView === "list"}
            onClick={() => setTripsView("list")}
          >
            List
          </Chip>
          {hasFullGroup && (
            <Chip
              size="sm"
              selected={fullOnly}
              onClick={() => setFullOnly((v) => !v)}
            >
              Everyone&rsquo;s free only
            </Chip>
          )}
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            aria-expanded={infoOpen}
            className="ml-auto inline-flex items-center gap-1.5 rounded-(--radius-tag) border border-line bg-card px-3 py-1 font-mono text-xs uppercase tracking-widest text-ink-muted transition-colors hover:text-ink"
          >
            {infoOpen ? "Hide info ›" : "‹ Group info"}
          </button>
        </div>

        {/* Un-boxed calendar (matches the main /calendar look) beside a
            collapsible right-hand group-info panel. */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {tripsView === "list" ? (
              <GroupTripsBoard
                trips={trips.trips}
                truncated={trips.truncated}
                knownCount={trips.known_count}
                unknownCount={trips.unknown_count}
                fullOnly={fullOnly}
              />
            ) : (
              <GroupTripsCalendar
                trips={trips.trips}
                sharedWindows={trips.shared_windows}
                fullOnly={fullOnly}
              />
            )}
          </div>

          {infoOpen && (
            <aside className="w-full shrink-0 space-y-6 lg:w-80">
              {/* Each panel collapses independently; open/closed is remembered
                  per user (keyed by user id) across visits and groups. */}
              <CollapsibleSection
                title="Members"
                storageKey={`somewhere:group-info:members:${myUserId}`}
              >
                <MembersCard
                  members={detail.members}
                  myRole={detail.my_role}
                  myUserId={myUserId}
                  onRemove={onRemoveMember}
                  onLeave={onLeaveGroup}
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="Invite people"
                storageKey={`somewhere:group-info:invite:${myUserId}`}
              >
                <InviteCard
                  groupId={id}
                  inviteToken={detail.invite_token}
                  existingMemberIds={detail.members.map((m) => m.user_id)}
                  onMemberAdded={refetchAll}
                />
              </CollapsibleSection>

              {isOwner && (
                <CollapsibleSection
                  title="Danger zone"
                  storageKey={`somewhere:group-info:danger:${myUserId}`}
                  defaultOpen={false}
                  className="rounded-(--radius-card) border border-alert/30 bg-card shadow-(--shadow-card)"
                  titleClassName="font-display text-xl font-semibold text-alert"
                >
                  <DangerZone onDelete={onDeleteGroup} />
                </CollapsibleSection>
              )}
            </aside>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Header: name + inline rename (owner only) ───────────────────────────────

function GroupNameHeader({
  name,
  editable,
  onRename,
}: {
  name: string;
  editable: boolean;
  onRename: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);

  if (!editable) {
    return (
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
        {name}
      </h1>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setEditing(true);
        }}
        title="Click to rename"
        className="rounded font-display text-3xl font-bold tracking-tight text-ink transition-colors hover:text-ink-muted"
      >
        {name}
      </button>
    );
  }

  const save = () => {
    const trimmed = value.trim();
    setEditing(false);
    if (!trimmed || trimmed === name) return;
    onRename(trimmed).catch((err) => {
      setError(
        err instanceof Error ? err.message : "Could not rename group.",
      );
    });
  };

  return (
    <div>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        className="w-full max-w-md rounded-(--radius-tag) border border-ink-muted bg-card px-2 py-1 font-display text-3xl font-bold tracking-tight text-ink focus:outline-none"
      />
      {error && <p className="mt-1 text-sm text-alert">{error}</p>}
    </div>
  );
}

// ─── Danger zone: two-step confirm delete (owner only) ───────────────────────

function DangerZone({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    onDelete().catch((err) => {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    });
  };

  return (
    <div>
      <p className="text-sm text-ink-muted">
        Deleting this group removes it for every member. This can&rsquo;t be
        undone.
      </p>
      <div className="mt-3">
        {confirming ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={del}
              className="rounded-(--radius-tag) bg-alert text-paper hover:opacity-90"
            >
              {busy ? "Deleting…" : "Confirm delete group?"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
            >
              Keep
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setConfirming(true)}
            className="rounded-(--radius-tag) border-alert/50 text-alert hover:bg-transparent hover:text-alert"
          >
            Delete group
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function GroupDetailSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10"
    >
      <div className="h-4 w-16 animate-pulse rounded bg-line" />
      <div className="mt-6 h-9 w-64 animate-pulse rounded bg-line" />
      <div className="mt-10 space-y-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-(--radius-card) bg-line/60"
          />
        ))}
      </div>
    </div>
  );
}
