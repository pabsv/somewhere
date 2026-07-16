"use client";

// ─── Members — group roster with remove/leave two-step confirm ──────────────
// Owner sees "Remove" on every other row; whichever row IS me shows "Leave
// group" instead (the parent's leave handler already carries the
// last-member-deletes-the-group semantics server-side). Mirrors
// FriendsListCard's confirm-then-fire pattern; per-row busy flag guards
// double submits.

import { useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { PersonLabel } from "@/components/friends/RequestsCard";
import type { GroupMemberEntry, GroupRole } from "@/types/api";

export default function MembersCard({
  members,
  myRole,
  myUserId,
  onRemove,
  onLeave,
}: {
  members: GroupMemberEntry[];
  myRole: GroupRole;
  myUserId: string;
  onRemove: (userId: string) => Promise<void>;
  onLeave: () => Promise<void>;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (id: string, fn: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    fn()
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        setBusyId(null);
        setConfirmId(null);
      });
  };

  return (
    <div>
      <ul className="divide-y divide-line">
        {members.map((m) => {
          const isSelf = m.user_id === myUserId;
          const confirming = confirmId === m.user_id;
          const busy = busyId === m.user_id;
          const canRemove = !isSelf && myRole === "owner";

          return (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <PersonLabel name={m.name} email={m.email} />
                <Badge variant="neutral">
                  {m.role === "owner" ? "Owner" : "Member"}
                </Badge>
                {!m.has_availability && (
                  <Badge variant="neutral">No dates yet</Badge>
                )}
              </div>

              {confirming ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(m.user_id, () =>
                        isSelf ? onLeave() : onRemove(m.user_id),
                      )
                    }
                    className="rounded-(--radius-tag) bg-alert text-paper hover:opacity-90"
                  >
                    {busy
                      ? "Working…"
                      : isSelf
                        ? "Confirm leave?"
                        : "Confirm remove?"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setConfirmId(null)}
                    className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
                  >
                    Keep
                  </Button>
                </div>
              ) : isSelf ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() => setConfirmId(m.user_id)}
                  className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
                >
                  Leave group
                </Button>
              ) : canRemove ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId !== null}
                  onClick={() => setConfirmId(m.user_id)}
                  className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
                >
                  Remove
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    </div>
  );
}
