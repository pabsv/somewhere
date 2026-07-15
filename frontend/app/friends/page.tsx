"use client";

// ─── Friends — manage friendships (auth-gated via middleware) ────────────────
// People directory (browse/search everyone) → request + accept flow. The page
// owns one FriendsResponse; every mutation returns the full authoritative
// state, so handlers just replace it (no optimistic updates, no refetch). The
// directory is fetched once and never mutates. Future: match trips against
// friends' availability (lib/friends.ts getAcceptedFriendIds is the hook).

import { useCallback, useEffect, useState } from "react";
import FriendsListCard from "@/components/friends/FriendsListCard";
import PeopleCard from "@/components/friends/PeopleCard";
import RequestsCard from "@/components/friends/RequestsCard";
import {
  ApiError,
  getFriends,
  getUsers,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/lib/client";
import type { DirectoryUser, FriendsResponse } from "@/types/api";

type Mode = "loading" | "ready" | "error";

export default function FriendsPage() {
  const [state, setState] = useState<FriendsResponse | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMode("loading");
    Promise.all([getFriends(), getUsers()])
      .then(([friendsRes, usersRes]) => {
        if (cancelled) return;
        setState(friendsRes);
        setUsers(usersRes.users);
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Friends
        </h1>
      </header>

      {mode === "error" && (
        <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted shadow-(--shadow-card)">
          {loadError}
        </div>
      )}

      {mode === "loading" && <FriendsSkeleton />}

      {mode === "ready" && state && (
        <>
          <section className="mb-12">
            <div className="mb-4">
              <h2 className="font-display text-xl font-semibold text-ink">
                People
              </h2>
            </div>
            <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
              <PeopleCard
                users={users}
                friendsState={state}
                onAdd={onAdd}
                onAccept={(id) => onRespond(id, "accept")}
              />
            </div>
          </section>

          {pendingCount > 0 && (
            <section className="mb-12">
              <div className="mb-4">
                <h2 className="font-display text-xl font-semibold text-ink">
                  Requests
                </h2>
              </div>
              <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
                <RequestsCard
                  incoming={state.incoming}
                  outgoing={state.outgoing}
                  onRespond={onRespond}
                  onCancel={onRemove}
                />
              </div>
            </section>
          )}

          <section className="mb-12">
            <div className="mb-4">
              <h2 className="font-display text-xl font-semibold text-ink">
                Your friends{" "}
                {state.friends.length > 0 && (
                  <span className="text-ink-muted">
                    ({state.friends.length})
                  </span>
                )}
              </h2>
            </div>
            <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
              <FriendsListCard friends={state.friends} onRemove={onRemove} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FriendsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-12">
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i}>
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-line" />
          <div className="h-28 animate-pulse rounded-(--radius-card) bg-line/60" />
        </div>
      ))}
    </div>
  );
}
