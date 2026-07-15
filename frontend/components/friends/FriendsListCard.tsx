"use client";

// ─── Friends list — accepted friendships with two-step remove ────────────────
// Remove flips to "Confirm remove?" before firing; clicking elsewhere or
// another row resets it. Per-row busy flag guards double submits.

import { useState } from "react";
import Button from "@/components/ui/Button";
import { PersonLabel } from "@/components/friends/RequestsCard";
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
        No friends yet — send a request above to get started.
      </p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {friends.map((f) => (
          <li
            key={f.friendship_id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <PersonLabel name={f.name} email={f.email} />
            {confirmId === f.friendship_id ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === f.friendship_id}
                  onClick={() => remove(f.friendship_id)}
                  className="rounded-(--radius-tag) bg-alert text-paper hover:opacity-90"
                >
                  {busyId === f.friendship_id ? "Removing…" : "Confirm remove?"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId === f.friendship_id}
                  onClick={() => setConfirmId(null)}
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
                disabled={busyId !== null}
                onClick={() => setConfirmId(f.friendship_id)}
                className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}
