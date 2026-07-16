"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
];

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19.5c.6-3 2.9-4.75 5.5-4.75s4.9 1.75 5.5 4.75" />
      <path d="M15.5 5.2a3.25 3.25 0 0 1 0 5.6M17.8 15.1c1.5.7 2.4 2.1 2.7 4.4" />
    </svg>
  );
}

function GroupsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="5" />
      <circle cx="15" cy="9" r="5" />
      <circle cx="12" cy="15" r="5" />
    </svg>
  );
}

/**
 * Profile menu — avatar/name button top-right; dropdown holds the
 * account-scoped destinations (Settings, Friends) plus Sign out. Closes on
 * outside click, Escape, and route change.
 */
function ProfileMenu({ user }: { user: { name: string; role?: string } }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close the dropdown whenever the route changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  const itemClass =
    "flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-muted transition-colors hover:bg-paper hover:text-ink";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group flex items-center gap-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-sm font-semibold text-brand">
          {initial}
        </span>
        <span className="hidden text-sm text-ink-muted transition-colors group-hover:text-ink sm:inline">
          {user.name}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-(--radius-card) border border-line bg-card py-1.5 shadow-(--shadow-card)"
        >
          <Link href="/settings" role="menuitem" className={itemClass}>
            <SlidersIcon className="h-4.5 w-4.5" />
            Settings
          </Link>
          <Link href="/friends" role="menuitem" className={itemClass}>
            <UsersIcon className="h-4.5 w-4.5" />
            Friends
          </Link>
          <Link href="/groups" role="menuitem" className={itemClass}>
            <GroupsIcon className="h-4.5 w-4.5" />
            Groups
          </Link>
          <div aria-hidden="true" className="mx-4 my-1.5 border-t border-line" />
          <form action="/api/auth/signout" method="post">
            <button type="submit" role="menuitem" className={`${itemClass} w-full`}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

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
              <ProfileMenu user={user} />
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
