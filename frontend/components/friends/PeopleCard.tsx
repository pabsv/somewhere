"use client";

// ─── People directory — browse/search everyone, add from the list ────────────
// Presentational; the parent owns both the directory and the friends state.
// Relationship status per row is derived client-side from FriendsResponse
// (the directory route stays a dumb user list). Search filters name + email
// locally — fine at current scale, same tradeoff as /api/users.

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { PersonLabel } from "@/components/friends/RequestsCard";
import type { DirectoryUser, FriendsResponse } from "@/types/api";

type Status =
  | { kind: "none" }
  | { kind: "friend" }
  | { kind: "outgoing" }
  | { kind: "incoming"; friendshipId: string };

export default function PeopleCard({
  users,
  friendsState,
  onAdd,
  onAccept,
}: {
  users: DirectoryUser[];
  friendsState: FriendsResponse;
  onAdd: (email: string) => Promise<void>;
  onAccept: (friendshipId: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const statusById = useMemo(() => {
    const map = new Map<string, Status>();
    for (const f of friendsState.friends) map.set(f.user_id, { kind: "friend" });
    for (const r of friendsState.outgoing) map.set(r.user_id, { kind: "outgoing" });
    for (const r of friendsState.incoming)
      map.set(r.user_id, { kind: "incoming", friendshipId: r.friendship_id });
    return map;
  }, [friendsState]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  const run = (userId: string, fn: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(userId);
    setError(null);
    fn()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => setBusyId(null));
  };

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email…"
        aria-label="Search people"
        className="mb-1 w-full max-w-sm rounded-(--radius-tag) border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
      />

      {users.length === 0 ? (
        <p className="pt-3 text-sm text-ink-muted/80">
          No one else is here yet.
        </p>
      ) : visible.length === 0 ? (
        <p className="pt-3 text-sm text-ink-muted/80">
          No one matches &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((u) => {
            const status = statusById.get(u.user_id) ?? { kind: "none" };
            const busy = busyId === u.user_id;
            return (
              <li
                key={u.user_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <PersonLabel name={u.name} email={u.email} />
                {status.kind === "friend" && (
                  <span className="text-sm text-steal">Friends ✓</span>
                )}
                {status.kind === "outgoing" && (
                  <span className="text-sm text-ink-muted/80">
                    Request sent
                  </span>
                )}
                {status.kind === "incoming" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId !== null}
                    onClick={() =>
                      run(u.user_id, () => onAccept(status.friendshipId))
                    }
                    className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
                  >
                    {busy ? "Accepting…" : "Accept"}
                  </Button>
                )}
                {status.kind === "none" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId !== null}
                    onClick={() => run(u.user_id, () => onAdd(u.email))}
                    className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
                  >
                    {busy ? "Sending…" : "Add"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}
