"use client";

// Public invite-landing page — NOT session-gated (middleware's matcher
// deliberately excludes /join). Shows who's inviting you and how big the
// group is, then either prompts sign-in/register or auto-joins if the
// visitor is already signed in.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { ApiError, getJoinInfo, joinGroup } from "@/lib/client";
import type { JoinInfoResponse } from "@/types/api";

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [info, setInfo] = useState<JoinInfoResponse | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const joinedRef = useRef(false);

  // Fetch the (public) invite preview once on mount.
  useEffect(() => {
    let cancelled = false;
    getJoinInfo(token)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInvalid(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Auto-join once we know the invite is valid AND the visitor is signed in.
  // Guarded so it only ever fires once, even under strict-mode re-renders.
  useEffect(() => {
    if (!info || invalid) return;
    if (sessionStatus !== "authenticated") return;
    if (joinedRef.current) return;
    joinedRef.current = true;

    joinGroup(token)
      .then((result) => {
        router.replace(`/groups/${result.group_id}`);
      })
      .catch((err) => {
        setJoinError(
          err instanceof ApiError
            ? err.message
            : "Could not join this group. Try again.",
        );
      });
  }, [info, invalid, sessionStatus, token, router]);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-(--radius-card) border border-line bg-card p-8 shadow-(--shadow-card)">
        {invalid ? (
          <InvalidCard />
        ) : !info ? (
          <LoadingCard />
        ) : joinError ? (
          <JoinFailedCard message={joinError} />
        ) : sessionStatus === "loading" ? (
          <LoadingCard />
        ) : sessionStatus === "unauthenticated" ? (
          <UnauthenticatedCard info={info} token={token} />
        ) : (
          <JoiningCard groupName={info.group_name} />
        )}
      </div>
    </div>
  );
}

function InvalidCard() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Invite not found
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        This invite link is no longer valid.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-ink underline hover:text-night"
      >
        Back to home
      </Link>
    </div>
  );
}

function LoadingCard() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="h-6 w-40 animate-pulse rounded bg-line" />
      <div className="h-4 w-56 animate-pulse rounded bg-line/60" />
      <div className="h-10 w-full animate-pulse rounded-(--radius-tag) bg-line/60" />
    </div>
  );
}

function UnauthenticatedCard({
  info,
  token,
}: {
  info: JoinInfoResponse;
  token: string;
}) {
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/join/${token}`)}`;
  const registerHref = `/register?callbackUrl=${encodeURIComponent(`/join/${token}`)}`;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Join {info.group_name}
      </h1>
      <div className="mt-2 space-y-1 text-sm text-ink-muted">
        {info.inviter_name && <p>{info.inviter_name} invited you</p>}
        <p>
          {info.member_count} member{info.member_count === 1 ? "" : "s"}{" "}
          already in this group.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <Link href={loginHref}>
          <Button
            type="button"
            className="w-full rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
          >
            Sign in to join
          </Button>
        </Link>
        <Link href={registerHref}>
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-(--radius-tag) border-line text-ink-muted hover:bg-transparent hover:text-ink"
          >
            Create an account
          </Button>
        </Link>
      </div>
    </div>
  );
}

function JoiningCard({ groupName }: { groupName: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Joining {groupName}…
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Hang tight, this will only take a second.
      </p>
    </div>
  );
}

function JoinFailedCard({ message }: { message: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Couldn&apos;t join this group
      </h1>
      <p className="mt-2 text-sm text-alert">{message}</p>
      <Link
        href="/groups"
        className="mt-6 inline-block text-sm text-ink underline hover:text-night"
      >
        Back to groups
      </Link>
    </div>
  );
}
