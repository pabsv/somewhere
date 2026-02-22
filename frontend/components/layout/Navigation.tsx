"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Deals" },
  { href: "/deals", label: "List" },
  { href: "/settings", label: "Settings" },
];

export default function Navigation() {
  const pathname = usePathname();

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
        </div>
      </div>
    </nav>
  );
}
