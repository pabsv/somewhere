"use client";

import { useCallback, useEffect, useState } from "react";
import AllGroupsCard from "@/components/admin/AllGroupsCard";
import UserDetailSheet from "@/components/admin/UserDetailSheet";
import UsersTable, {
  UsersTableSkeleton,
} from "@/components/admin/UsersTable";
import UsersTiles, { UsersTilesSkeleton } from "@/components/admin/UsersTiles";
import { adminUsers, ApiError } from "@/lib/client";
import type { AdminUser, AdminUsersResponse } from "@/types/api";

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminUsers()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setError("Admin only.");
        } else {
          setError(e instanceof Error ? e.message : "Could not load users.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <>
      <p className="mb-8 max-w-xl text-base text-ink-muted">
        Everyone who&apos;s signed up — favourites, availability, friends and
        groups. Read-only.
      </p>

      {error ? (
        <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted">
          {error}
          {error !== "Admin only." && (
            <button
              type="button"
              onClick={load}
              className="ml-3 underline underline-offset-2 hover:text-ink"
            >
              Retry
            </button>
          )}
        </div>
      ) : loading || !data ? (
        <div className="space-y-8">
          <UsersTilesSkeleton />
          <UsersTableSkeleton />
        </div>
      ) : (
        <div className="space-y-10">
          <section className="space-y-6">
            <UsersTiles tiles={data.tiles} />
            <UsersTable users={data.users} onSelect={setSelected} />
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-ink">
              All groups ({data.groups.length})
            </h2>
            <AllGroupsCard groups={data.groups} />
          </section>
        </div>
      )}

      <UserDetailSheet user={selected} onClose={() => setSelected(null)} />
    </>
  );
}
