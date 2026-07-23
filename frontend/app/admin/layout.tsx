import type { ReactNode } from "react";
import AdminTabs from "@/components/admin/AdminTabs";

// Shared admin shell. Every /admin/* path is already middleware-gated to
// role === "admin" (auth.config.ts); the data routes repeat that check.

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-baseline gap-4">
        <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.025em] text-ink min-[720px]:text-4xl">
          Admin
        </h1>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-muted">
          Read-only
        </span>
      </header>
      <AdminTabs />
      {children}
    </div>
  );
}
