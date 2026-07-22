"use client";

// ─── Add-a-friend combobox — search the directory + send requests inline ─────
// Replaces the old "People" section: one input in the page header. Typing
// filters the directory (name + email, client-side like /api/users expects);
// each match row shows relationship status and the matching action (Add /
// Accept / sent / friends). A query that looks like an email with no directory
// match still gets a "Send request" row, so inviting by exact address works.

import { useMemo, useRef, useState } from "react";
import Avatar from "@/components/friends/Avatar";
import type { DirectoryUser, FriendsResponse } from "@/types/api";

type Status =
  | { kind: "none" }
  | { kind: "friend" }
  | { kind: "outgoing" }
  | { kind: "incoming"; friendshipId: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddFriendSearch({
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
  const [focused, setFocused] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const blurTimer = useRef<number | null>(null);

  const statusById = useMemo(() => {
    const map = new Map<string, Status>();
    for (const f of friendsState.friends) map.set(f.user_id, { kind: "friend" });
    for (const r of friendsState.outgoing)
      map.set(r.user_id, { kind: "outgoing" });
    for (const r of friendsState.incoming)
      map.set(r.user_id, { kind: "incoming", friendshipId: r.friendship_id });
    return map;
  }, [friendsState]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [users, q]);

  const emailFallback =
    EMAIL_RE.test(q) && !users.some((u) => u.email.toLowerCase() === q);

  const run = (key: string, fn: () => Promise<void>) => {
    if (busyKey) return;
    setBusyKey(key);
    setError(null);
    fn()
      .then(() => setQuery(""))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => setBusyKey(null));
  };

  const open = focused && q.length > 0;

  return (
    <div className="relative w-full sm:w-80">
      <div className="flex items-center gap-2 rounded-(--radius-tag) border border-line bg-card px-3 py-2">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-ink-muted"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            setFocused(true);
          }}
          onBlur={() => {
            // Delay so a mousedown on a dropdown row still lands.
            blurTimer.current = window.setTimeout(
              () => setFocused(false),
              150,
            );
          }}
          placeholder="Add a friend by name or email…"
          aria-label="Add a friend by name or email"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
          {matches.length === 0 && !emailFallback ? (
            <p className="px-4 py-3 text-sm text-ink-muted/80">
              No one matches &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {matches.map((u) => {
                const status = statusById.get(u.user_id) ?? { kind: "none" };
                const busy = busyKey === u.user_id;
                return (
                  <li
                    key={u.user_id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <Avatar name={u.name} email={u.email} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {u.name || u.email}
                      </p>
                      {u.name && (
                        <p className="truncate text-xs text-ink-muted/80">
                          {u.email}
                        </p>
                      )}
                    </div>
                    {status.kind === "friend" && (
                      <span className="text-xs text-steal">Friends ✓</span>
                    )}
                    {status.kind === "outgoing" && (
                      <span className="text-xs text-ink-muted/80">Sent</span>
                    )}
                    {status.kind === "incoming" && (
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() =>
                          run(u.user_id, () => onAccept(status.friendshipId))
                        }
                        className="rounded-(--radius-tag) bg-ink px-3 py-1 text-xs font-medium text-paper hover:bg-night disabled:opacity-60"
                      >
                        {busy ? "Accepting…" : "Accept"}
                      </button>
                    )}
                    {status.kind === "none" && (
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() => run(u.user_id, () => onAdd(u.email))}
                        className="rounded-(--radius-tag) bg-ink px-3 py-1 text-xs font-medium text-paper hover:bg-night disabled:opacity-60"
                      >
                        {busy ? "Sending…" : "Add"}
                      </button>
                    )}
                  </li>
                );
              })}
              {emailFallback && (
                <li className="flex items-center gap-3 px-4 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-sm text-ink-muted">
                    Send a request to{" "}
                    <span className="font-medium text-ink">{query.trim()}</span>
                  </p>
                  <button
                    type="button"
                    disabled={busyKey !== null}
                    onClick={() => run("__email__", () => onAdd(q))}
                    className="rounded-(--radius-tag) bg-ink px-3 py-1 text-xs font-medium text-paper hover:bg-night disabled:opacity-60"
                  >
                    {busyKey === "__email__" ? "Sending…" : "Send"}
                  </button>
                </li>
              )}
            </ul>
          )}
          {error && <p className="px-4 py-2 text-xs text-alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
