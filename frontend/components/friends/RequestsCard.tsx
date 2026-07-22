"use client";

// ─── Pending requests — one card: incoming rows + sent footer strip ──────────
// Design "Friends — Final": mono REQUESTS label + brand count badge, each
// incoming request as an avatar row with Accept/Decline, and outgoing requests
// as muted footer strips ("waiting on X" + Cancel). Self-contained card chrome
// — the parent mounts it bare. Per-row busy flag guards double submits.
// PersonLabel stays exported here — groups + admin tables import it.

import { useState } from "react";
import Avatar from "@/components/friends/Avatar";
import type { FriendEntry } from "@/types/api";

export default function RequestsCard({
  incoming,
  outgoing,
  onRespond,
  onCancel,
}: {
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  onRespond: (friendshipId: string, action: "accept" | "decline") => Promise<void>;
  onCancel: (friendshipId: string) => Promise<void>;
}) {
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
      .finally(() => setBusyId(null));
  };

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)">
      <div className="flex items-center gap-2.5 px-5 py-3">
        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
          Requests
        </span>
        {incoming.length > 0 && (
          <span className="rounded-full bg-brand px-2 py-px font-mono text-[11px] font-medium text-brand-ink">
            {incoming.length}
          </span>
        )}
      </div>

      {incoming.map((r) => (
        <div
          key={r.friendship_id}
          className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3"
        >
          <Avatar name={r.name} email={r.email} size={36} />
          <p className="min-w-0 flex-1 text-sm text-ink-muted">
            <span className="font-medium text-ink">{r.name || r.email}</span>{" "}
            wants to be friends
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busyId === r.friendship_id}
              onClick={() =>
                run(r.friendship_id, () => onRespond(r.friendship_id, "accept"))
              }
              className="rounded-(--radius-tag) bg-ink px-3.5 py-1.5 text-sm font-medium text-paper hover:bg-night disabled:opacity-60"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busyId === r.friendship_id}
              onClick={() =>
                run(r.friendship_id, () =>
                  onRespond(r.friendship_id, "decline"),
                )
              }
              className="rounded-(--radius-tag) border border-line px-3.5 py-1.5 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        </div>
      ))}

      {outgoing.map((r) => (
        <div
          key={r.friendship_id}
          className="flex items-center gap-2 border-t border-line bg-paper px-5 py-2.5"
        >
          <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted/80">
            Sent — waiting on{" "}
            <span className="font-medium text-ink-muted">
              {r.name || r.email}
            </span>
          </p>
          <button
            type="button"
            disabled={busyId === r.friendship_id}
            onClick={() => run(r.friendship_id, () => onCancel(r.friendship_id))}
            className="text-[13px] text-ink-muted underline hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ))}

      {error && <p className="px-5 py-2 text-sm text-alert">{error}</p>}
    </div>
  );
}

export function PersonLabel({ name, email }: { name: string; email: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-ink">{name || email}</p>
      {name && <p className="truncate text-sm text-ink-muted/80">{email}</p>}
    </div>
  );
}
