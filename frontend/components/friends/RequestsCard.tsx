"use client";

// ─── Pending requests — incoming (accept/decline) + outgoing (cancel) ────────
// Presentational; the parent owns state and passes async handlers. A per-row
// busy flag disables that row's buttons mid-flight (double-submit guard).

import { useState } from "react";
import Button from "@/components/ui/Button";
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
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          Incoming
        </h3>
        {incoming.length === 0 ? (
          <p className="text-sm text-ink-muted/80">No incoming requests.</p>
        ) : (
          <ul className="divide-y divide-line">
            {incoming.map((r) => (
              <li
                key={r.friendship_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <PersonLabel name={r.name} email={r.email} />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === r.friendship_id}
                    onClick={() =>
                      run(r.friendship_id, () =>
                        onRespond(r.friendship_id, "accept"),
                      )
                    }
                    className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busyId === r.friendship_id}
                    onClick={() =>
                      run(r.friendship_id, () =>
                        onRespond(r.friendship_id, "decline"),
                      )
                    }
                    className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          Sent
        </h3>
        {outgoing.length === 0 ? (
          <p className="text-sm text-ink-muted/80">No pending requests sent.</p>
        ) : (
          <ul className="divide-y divide-line">
            {outgoing.map((r) => (
              <li
                key={r.friendship_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <PersonLabel name={r.name} email={r.email} />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId === r.friendship_id}
                  onClick={() =>
                    run(r.friendship_id, () => onCancel(r.friendship_id))
                  }
                  className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="text-sm text-alert">{error}</p>}
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
