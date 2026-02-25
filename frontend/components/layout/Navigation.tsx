"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, clearStoredUser } from "@/lib/auth";

const links = [
  { href: "/", label: "Deals" },
  { href: "/deals", label: "List" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();

  function handleLogout() {
    clearStoredUser();
    router.push("/login");
  }

  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-neutral-200">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="text-sm font-semibold text-neutral-900">
            FlightDeals
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm ${
                  pathname === link.href
                    ? "text-neutral-900 font-medium"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User */}
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-neutral-400 hover:text-neutral-900"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
