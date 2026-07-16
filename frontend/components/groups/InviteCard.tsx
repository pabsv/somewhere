"use client";

// ─── Invite — shareable join link + add straight from friends ───────────────
// Section 1: read-only invite link (origin resolved post-mount to dodge SSR
// mismatch) + copy-to-clipboard + a two-step "regenerate" that invalidates
// the old link, mirroring FriendsListCard's confirm-then-fire pattern. The
// rotated token is kept in local state (seeded from the prop, re-synced if
// the prop changes) since the parent's invite_token otherwise wouldn't move
// until its own next refetch.
// Section 2: accepted friends not already in the group, one-click add — adds
// via lib/client then tells the parent to refetch (membership affects trip
// matching, so both detail + trips need a fresh pull).

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { PersonLabel } from "@/components/friends/RequestsCard";
import { addGroupMember, getFriends, rotateGroupInvite } from "@/lib/client";
import type { FriendEntry } from "@/types/api";

export default function InviteCard({
  groupId,
  inviteToken,
  existingMemberIds,
  onMemberAdded,
}: {
  groupId: string;
  inviteToken: string;
  existingMemberIds: string[];
  onMemberAdded: () => void;
}) {
  const [token, setToken] = useState(inviteToken);
  // Re-sync local token with the parent's invite_token whenever it changes
  // (e.g. after the parent's own refetch); rotate() below also writes this
  // state directly when the user regenerates the link.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setToken(inviteToken), [inviteToken]);

  const [origin, setOrigin] = useState("");
  // Read window.location post-mount only, to avoid an SSR/CSR hydration
  // mismatch (the server has no window).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);
  const inviteLink = origin ? `${origin}/join/${token}` : "";

  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    if (!inviteLink) return;
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [inviteLink]);

  const [confirmingRotate, setConfirmingRotate] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  const rotate = () => {
    if (rotating) return;
    setRotating(true);
    setRotateError(null);
    rotateGroupInvite(groupId)
      .then((res) => {
        setToken(res.invite_token);
        setConfirmingRotate(false);
      })
      .catch((err) => {
        setRotateError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      })
      .finally(() => setRotating(false));
  };

  const [friends, setFriends] = useState<FriendEntry[] | null>(null);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFriends()
      .then((res) => {
        if (!cancelled) setFriends(res.friends);
      })
      .catch((err) => {
        if (cancelled) return;
        setFriendsError(
          err instanceof Error ? err.message : "Could not load your friends.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const existing = new Set(existingMemberIds);
  const addable = (friends ?? []).filter((f) => !existing.has(f.user_id));

  const [addingId, setAddingId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const add = (userId: string) => {
    if (addingId) return;
    setAddingId(userId);
    setAddError(null);
    addGroupMember(groupId, userId)
      .then(() => onMemberAdded())
      .catch((err) => {
        setAddError(
          err instanceof Error ? err.message : "Something went wrong.",
        );
      })
      .finally(() => setAddingId(null));
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteLink}
            aria-label="Invite link"
            onFocus={(e) => e.currentTarget.select()}
            className="tnum min-w-0 flex-1 rounded-(--radius-tag) border border-line bg-paper px-3 py-2 font-mono text-sm text-ink-muted focus:border-ink-muted focus:outline-none"
          />
          <Button
            type="button"
            size="sm"
            disabled={!inviteLink}
            onClick={copy}
            className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <div className="mt-3">
          {confirmingRotate ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-muted">
                The old link will stop working.
              </span>
              <Button
                type="button"
                size="sm"
                disabled={rotating}
                onClick={rotate}
                className="rounded-(--radius-tag) bg-alert text-paper hover:opacity-90"
              >
                {rotating ? "Regenerating…" : "Confirm regenerate?"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={rotating}
                onClick={() => setConfirmingRotate(false)}
                className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setConfirmingRotate(true)}
              className="rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
            >
              Regenerate link
            </Button>
          )}
          {rotateError && (
            <p className="mt-2 text-sm text-alert">{rotateError}</p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink-muted">
          Add from friends
        </h3>

        {friendsError ? (
          <p className="text-sm text-alert">{friendsError}</p>
        ) : friends === null ? (
          <p className="text-sm text-ink-muted/80">Loading your friends…</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-ink-muted/80">
            You have no friends to add yet — visit Friends to connect with
            people.
          </p>
        ) : addable.length === 0 ? (
          <p className="text-sm text-ink-muted/80">
            All your friends are already in this group.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {addable.map((f) => (
              <li
                key={f.user_id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <PersonLabel name={f.name} email={f.email} />
                <Button
                  type="button"
                  size="sm"
                  disabled={addingId !== null}
                  onClick={() => add(f.user_id)}
                  className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
                >
                  {addingId === f.user_id ? "Adding…" : "Add"}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {addError && <p className="mt-2 text-sm text-alert">{addError}</p>}
      </section>
    </div>
  );
}
