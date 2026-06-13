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

interface NavLink {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

// Minimal 24px stroke icons (currentColor) for the mobile tab bar.
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}
function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 7h11M19 7h1M4 17h1M9 17h11" />
      <circle cx="17" cy="7" r="2.2" />
      <circle cx="7" cy="17" r="2.2" />
    </svg>
  );
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.2 2.9 7.7 7 9 4.1-1.3 7-4.8 7-9V6z" />
    </svg>
  );
}

const LINKS: NavLink[] = [
  { href: "/explore", label: "Explore", icon: CompassIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarIcon },
  { href: "/settings", label: "Settings", icon: SlidersIcon },
];

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();

  const links: NavLink[] =
    user?.role === "admin"
      ? [...LINKS, { href: "/admin", label: "Admin", icon: ShieldIcon }]
      : LINKS;

  return (
    <>
      {/* ─── Top bar ─────────────────────────────────────────────────────────
          Desktop: wordmark + inline links + session. Mobile: wordmark +
          session only (primary nav moves to the bottom tab bar). pt safe-area
          keeps the wordmark clear of the notch when installed full-screen. */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
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

          {/* Primary links — desktop only */}
          <div className="hidden h-full items-center gap-2 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-full items-center px-3 text-sm transition-colors ${
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

      {/* ─── Mobile bottom tab bar ───────────────────────────────────────────
          Thumb-reachable primary nav for phones; hidden at md+. Padded for the
          home-indicator safe area. */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <ul
          className="mx-auto grid max-w-6xl"
          style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}
        >
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                    active ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${active ? "text-brand" : ""}`} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
