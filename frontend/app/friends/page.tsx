"use client";

// ─── Friends — social hub per the "Friends — Final" design ───────────────────
// Layout: header (h1 + add-a-friend combobox) → Requests card (only when
// pending) → Groups grid ("+ New group" toggles an inline create form) →
// friends tile grid with a header-level filter. The page owns a
// FriendsResponse and a GroupsResponse; every mutation returns the full
// authoritative state, so handlers just replace it (no optimistic updates, no
// refetch). The people directory is fetched once and feeds the combobox.
// Future: match trips against friends' availability (lib/friends.ts
// getAcceptedFriendIds is the hook).

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AddFriendSearch from "@/components/friends/AddFriendSearch";
import { initialsOf } from "@/components/friends/Avatar";
import FriendsListCard from "@/components/friends/FriendsListCard";
import RequestsCard from "@/components/friends/RequestsCard";
import {
  ApiError,
  createGroup,
  getFriends,
  getGroups,
  getUsers,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/lib/client";
import type {
  DirectoryUser,
  FriendsResponse,
  GroupsResponse,
  GroupSummary,
} from "@/types/api";

type Mode = "loading" | "ready" | "error";

const STACK_MAX = 3;

export default function FriendsPage() {
  const [state, setState] = useState<FriendsResponse | null>(null);
  const [groups, setGroups] = useState<GroupsResponse | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFriends(), getUsers(), getGroups()])
      .then(([friendsRes, usersRes, groupsRes]) => {
        if (cancelled) return;
        setState(friendsRes);
        setUsers(usersRes.users);
        setGroups(groupsRes);
        setMode("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError("Sign in to continue.");
        } else {
          setLoadError(
            e instanceof Error ? e.message : "Could not load your friends.",
          );
        }
        setMode("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onCreateGroup = useCallback(async (name: string) => {
    setGroups(await createGroup(name));
    setShowCreate(false);
  }, []);

  const onAdd = useCallback(async (email: string) => {
    setState(await sendFriendRequest(email));
  }, []);

  const onRespond = useCallback(
    async (id: string, action: "accept" | "decline") => {
      setState(await respondToFriendRequest(id, action));
    },
    [],
  );

  const onRemove = useCallback(async (id: string) => {
    setState(await removeFriend(id));
  }, []);

  const pendingCount = state ? state.incoming.length + state.outgoing.length : 0;

  const visibleFriends = useMemo(() => {
    if (!state) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return state.friends;
    return state.friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q),
    );
  }, [state, filter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Friends
        </h1>
        {mode === "ready" && state && (
          <AddFriendSearch
            users={users}
            friendsState={state}
            onAdd={onAdd}
            onAccept={(id) => onRespond(id, "accept")}
          />
        )}
      </header>

      {mode === "error" && (
        <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted shadow-(--shadow-card)">
          {loadError}
        </div>
      )}

      {mode === "loading" && <FriendsSkeleton />}

      {mode === "ready" && state && groups && (
        <>
          {pendingCount > 0 && (
            <section className="mb-12">
              <RequestsCard
                incoming={state.incoming}
                outgoing={state.outgoing}
                onRespond={onRespond}
                onCancel={onRemove}
              />
            </section>
          )}

          {/* ─── Groups ───────────────────────────────────────────────────── */}
          <section className="mb-12">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-semibold text-ink">
                Groups{" "}
                {groups.groups.length > 0 && (
                  <span className="font-mono text-sm font-normal text-ink-muted">
                    · {groups.groups.length}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="rounded-(--radius-tag) border border-line px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink"
              >
                {showCreate ? "Close" : "+ New group"}
              </button>
            </div>
            {showCreate && (
              <div className="mb-4 rounded-(--radius-card) border border-line bg-card p-4 shadow-(--shadow-card)">
                <CreateGroupForm onCreate={onCreateGroup} />
              </div>
            )}
            {groups.groups.length === 0 ? (
              <p className="text-sm text-ink-muted/80">
                No groups yet — create one to start planning a trip together.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.groups.map((g) => (
                  <li key={g.group_id}>
                    <GroupCard group={g} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Your friends ─────────────────────────────────────────────── */}
          <section className="mb-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-ink">
                Your friends{" "}
                {state.friends.length > 0 && (
                  <span className="font-mono text-sm font-normal text-ink-muted">
                    · {state.friends.length}
                  </span>
                )}
              </h2>
              {state.friends.length > 0 && (
                <div className="flex items-center gap-2 rounded-(--radius-tag) border border-line bg-card px-3 py-1.5">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5 text-ink-muted"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="search"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter…"
                    aria-label="Filter friends"
                    className="w-32 bg-transparent text-[13px] text-ink placeholder:text-ink-muted/50 focus:outline-none"
                  />
                </div>
              )}
            </div>
            {state.friends.length > 0 && visibleFriends.length === 0 ? (
              <p className="text-sm text-ink-muted/80">
                No friend matches &ldquo;{filter.trim()}&rdquo;.
              </p>
            ) : (
              <FriendsListCard friends={visibleFriends} onRemove={onRemove} />
            )}
          </section>
        </>
      )}
    </div>
  );
}

function GroupCard({ group }: { group: GroupSummary }) {
  const stack = group.member_names.slice(0, STACK_MAX);
  const extra = group.member_count - stack.length;
  return (
    <Link
      href={`/groups/${group.group_id}`}
      className="block rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) transition-colors hover:border-ink-muted"
    >
      <div className="mb-3.5 flex items-start justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-ink">
          {group.name}
        </h3>
        {group.my_role === "owner" && (
          <span className="shrink-0 rounded-(--radius-tag) border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
            owner
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex pl-2">
          {stack.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-line/60 text-[10px] font-semibold text-ink-muted"
            >
              {initialsOf(name)}
            </span>
          ))}
          {extra > 0 && (
            <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-line text-[10px] font-semibold text-ink-muted">
              +{extra}
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-ink-muted">
          {group.member_count} {group.member_count === 1 ? "person" : "people"}
        </span>
      </div>
    </Link>
  );
}

function CreateGroupForm({
  onCreate,
}: {
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    onCreate(trimmed)
      .then(() => setName(""))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Group name…"
        aria-label="Group name"
        autoFocus
        className="w-full max-w-sm rounded-(--radius-tag) border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={busy || name.trim().length === 0}
        className="rounded-(--radius-tag) bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-night disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create group"}
      </button>
      {error && <p className="w-full text-sm text-alert">{error}</p>}
    </form>
  );
}

function FriendsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-12">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i}>
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-line" />
          <div className="h-28 animate-pulse rounded-(--radius-card) bg-line/60" />
        </div>
      ))}
    </div>
  );
}
