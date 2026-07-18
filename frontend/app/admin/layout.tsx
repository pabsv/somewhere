import type { ReactNode } from "react";
import AdminTabs from "@/components/admin/AdminTabs";

// Shared admin shell: container + "Admin" header + Pool | Users tab strip.
// Both /admin (pool) and /admin/users render inside {children}. All /admin/*
// paths are already middleware-gated to role === "admin" (auth.config.ts).

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
          Admin
        </h1>
      </header>
      <AdminTabs />
      {children}
    </div>
  );
}
