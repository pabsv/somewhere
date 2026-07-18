"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Tab strip for the admin area. Pool = the exact /admin path; Users = anything
// under /admin/users. Token-native underline tabs (mono, uppercase).

const TABS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/admin", label: "Pool", match: (p) => p === "/admin" },
  { href: "/admin/users", label: "Users", match: (p) => p.startsWith("/admin/users") },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex gap-1 border-b border-line">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
              active
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
