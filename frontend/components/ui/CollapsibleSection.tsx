"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Persists open/closed per storageKey so the user's choice sticks across visits. */
export default function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = true,
  className,
  titleClassName,
  children,
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  /** Override the outer card shell (border/tone). Falls back to the neutral card. */
  className?: string;
  /** Override the heading colour (e.g. alert tone for a danger zone). */
  titleClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "open" || stored === "closed") setOpen(stored === "open");
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, open ? "open" : "closed");
  }, [open, hydrated, storageKey]);

  return (
    <div
      className={
        className ??
        "rounded-(--radius-card) border border-line bg-card shadow-(--shadow-card)"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
      >
        <h2
          className={
            titleClassName ??
            "font-display text-xl font-semibold text-ink"
          }
        >
          {title}
        </h2>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="M5 7.5L10 12.5L15 7.5" />
        </svg>
      </button>
      {open && (
        <div className="space-y-6 px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
      )}
    </div>
  );
}
