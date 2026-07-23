"use client";

import { useCallback, useEffect, useState } from "react";
import AllGroupsCard from "@/components/admin/AllGroupsCard";
import GroupDetailSheet from "@/components/admin/GroupDetailSheet";
import UserDetailSheet from "@/components/admin/UserDetailSheet";
import UsersTable, { UsersTableSkeleton } from "@/components/admin/UsersTable";
import { adminUsers, ApiError } from "@/lib/client";
import type { AdminGroup, AdminUser, AdminUsersResponse } from "@/types/api";

export default function AdminPeoplePage() {
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);

  const requestPeople = useCallback((isCancelled: () => boolean) => {
    return adminUsers()
      .then((response) => {
        if (!isCancelled()) setData(response);
      })
      .catch((cause) => {
        if (isCancelled()) return;
        if (
          cause instanceof ApiError &&
          (cause.status === 401 || cause.status === 403)
        ) {
          setError("Admin only.");
        } else {
          setError(cause instanceof Error ? cause.message : "Could not load people.");
        }
      })
      .finally(() => {
        if (!isCancelled()) setLoading(false);
      });
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void requestPeople(() => false);
  }, [requestPeople]);

  useEffect(() => {
    let cancelled = false;
    void requestPeople(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [requestPeople]);

  function openUser(user: AdminUser) {
    setSelectedGroup(null);
    setSelectedUser(user);
  }

  function openGroup(group: AdminGroup) {
    setSelectedUser(null);
    setSelectedGroup(group);
  }

  if (error) {
    return (
      <div className="rounded-(--radius-card) border border-line bg-card p-6 text-sm text-ink-muted shadow-(--shadow-card)">
        {error}
        {error !== "Admin only." && (
          <button
            type="button"
            onClick={retry}
            className="ml-3 underline underline-offset-2 transition-colors hover:text-ink"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-10">
        <UsersTableSkeleton />
        <GroupsSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        <UsersTable users={data.users} onSelect={openUser} />
        <AllGroupsCard groups={data.groups} users={data.users} onSelect={openGroup} />
      </div>

      <UserDetailSheet
        user={selectedUser}
        users={data.users}
        groups={data.groups}
        onClose={() => setSelectedUser(null)}
        onSelectUser={openUser}
        onSelectGroup={openGroup}
      />
      <GroupDetailSheet
        group={selectedGroup}
        users={data.users}
        onClose={() => setSelectedGroup(null)}
        onSelectUser={openUser}
      />
    </>
  );
}

function GroupsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-3 h-6 w-24 animate-pulse rounded bg-line" />
      <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[148px] animate-pulse rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)"
          />
        ))}
      </div>
    </div>
  );
}
