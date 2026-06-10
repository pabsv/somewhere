"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationProps {
  /**
   * Session user — wired in later via middleware/session. When absent the
   * bar shows a "Sign in" link; when present, name + sign-out + (admin) link.
   */
  user?: { name: string; role?: string } | null;
}

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/calendar", label: "Calendar" },
  { href: "/settings", label: "Settings" },
];

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();

  const links =
    user?.role === "admin"
      ? [...LINKS, { href: "/admin", label: "Admin" }]
      : LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Wordmark */}
        <Link href="/" className="group flex shrink-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-4 w-5 rounded-[2px] bg-brand [clip-path:polygon(0%_0%,72%_0%,100%_50%,72%_100%,0%_100%)] transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
          />
          <span className="font-display text-xl font-bold lowercase leading-none tracking-tight">
            somewhere
          </span>
        </Link>

        {/* Primary links */}
        <div className="flex h-full items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full items-center px-2.5 text-sm transition-colors sm:px-3 ${
                  active
                    ? "font-medium text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-brand"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Session slot */}
        <div className="flex shrink-0 items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-ink-muted sm:inline">
                {user.name}
              </span>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-ink transition-colors hover:text-ink-muted"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
