"use client";

// ─── Friends grid — avatar tiles per the "Friends — Final" design ────────────
// Compact tile per friend (initials avatar + first-line name, email in the
// title tooltip). Clicking a tile flips it to a confirm state (Remove / Keep)
// — the design has no visible per-row action, so removal hides behind the
// click. Per-tile busy flag guards double submits.

import { useState } from "react";
import Avatar from "@/components/friends/Avatar";
import type { FriendEntry } from "@/types/api";

export default function FriendsListCard({
  friends,
  onRemove,
}: {
  friends: FriendEntry[];
  onRemove: (friendshipId: string) => Promise<void>;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = (id: string) => {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    onRemove(id)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        setBusyId(null);
        setConfirmId(null);
      });
  };

  if (friends.length === 0) {
    return (
      <p className="text-sm text-ink-muted/80">
        No friends yet — search above to send your first request.
      </p>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {friends.map((f) => {
          const confirming = confirmId === f.friendship_id;
          const busy = busyId === f.friendship_id;
          return (
            <li key={f.friendship_id}>
              {confirming ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-(--radius-card) border border-alert/40 bg-card px-2 py-3.5">
                  <p className="max-w-full truncate text-xs font-medium text-ink">
                    {f.name || f.email}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(f.friendship_id)}
                    className="w-full rounded-(--radius-tag) bg-alert px-2 py-1 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? "Removing…" : "Remove"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmId(null)}
                    className="w-full rounded-(--radius-tag) border border-line px-2 py-1 text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-60"
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  title={f.email}
                  disabled={busyId !== null}
                  onClick={() => setConfirmId(f.friendship_id)}
                  className="flex w-full flex-col items-center gap-2.5 rounded-(--radius-card) border border-line bg-card px-2 pb-3.5 pt-4 transition-colors hover:border-ink-muted disabled:opacity-60"
                >
                  <Avatar name={f.name} email={f.email} size={52} />
                  <span className="max-w-full truncate text-[13px] font-medium text-ink">
                    {f.name || f.email}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}
