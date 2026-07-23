"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Token-native underline tabs for the three admin views.

const TABS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/admin", label: "Overview", match: (p) => p === "/admin" },
  {
    href: "/admin/people",
    label: "People",
    match: (p) => p.startsWith("/admin/people") || p.startsWith("/admin/users"),
  },
  { href: "/admin/pool", label: "Pool", match: (p) => p.startsWith("/admin/pool") },
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
