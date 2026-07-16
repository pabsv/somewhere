"use client";

// ─── Groups — travel crews (auth-gated via middleware) ───────────────────────
// Mirrors the Friends page structure: the page owns one GroupsResponse; every
// mutation returns the full authoritative state, so handlers just replace it
// (no optimistic updates, no refetch).

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { ApiError, createGroup, getGroups } from "@/lib/client";
import type { GroupsResponse } from "@/types/api";

type Mode = "loading" | "ready" | "error";

export default function GroupsPage() {
  const [state, setState] = useState<GroupsResponse | null>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // mode already starts as "loading" and this effect has no deps (runs
    // once on mount), so re-asserting it here would be a no-op — omitted.
    getGroups()
      .then((res) => {
        if (cancelled) return;
        setState(res);
        setMode("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setLoadError("Sign in to continue.");
        } else {
          setLoadError(
            e instanceof Error ? e.message : "Could not load your groups.",
          );
        }
        setMode("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onCreate = useCallback(async (name: string) => {
    setState(await createGroup(name));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Groups
        </h1>
      </header>

      {mode === "error" && (
        <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted shadow-(--shadow-card)">
          {loadError}
        </div>
      )}

      {mode === "loading" && <GroupsSkeleton />}

      {mode === "ready" && state && (
        <>
          <section className="mb-12">
            <div className="rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) sm:p-6">
              <CreateGroupForm onCreate={onCreate} />
            </div>
          </section>

          <section>
            {state.groups.length === 0 ? (
              <p className="text-sm text-ink-muted/80">
                No groups yet — create one above to start planning a trip
                together.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {state.groups.map((g) => (
                  <li key={g.group_id}>
                    <Link
                      href={`/groups/${g.group_id}`}
                      className="block rounded-(--radius-card) border border-line bg-card p-5 shadow-(--shadow-card) transition-colors hover:border-ink-muted"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="font-display text-lg font-semibold text-ink">
                          {g.name}
                        </h3>
                        <span className="shrink-0 rounded-(--radius-tag) border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                          {g.my_role}
                        </span>
                      </div>
                      {g.member_names.length > 0 && (
                        <p className="mb-1 text-sm text-ink-muted">
                          {g.member_names.join(", ")}
                        </p>
                      )}
                      <p className="text-sm text-ink-muted/80">
                        {g.member_count} member(s)
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function CreateGroupForm({
  onCreate,
}: {
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    onCreate(trimmed)
      .then(() => setName(""))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => setBusy(false));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Group name…"
        aria-label="Group name"
        className="w-full max-w-sm rounded-(--radius-tag) border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
      />
      <Button
        type="submit"
        size="sm"
        disabled={busy || name.trim().length === 0}
        className="rounded-(--radius-tag) bg-ink text-paper hover:bg-night"
      >
        {busy ? "Creating…" : "Create group"}
      </Button>
      {error && <p className="w-full text-sm text-alert">{error}</p>}
    </form>
  );
}

function GroupsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="h-16 animate-pulse rounded-(--radius-card) bg-line/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-(--radius-card) bg-line/60"
          />
        ))}
      </div>
    </div>
  );
}
