"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DepartureBoard, {
  BoardSkeleton,
  type DepartureRow,
} from "@/components/board/DepartureBoard";
import { getCities } from "@/lib/client";
import { formatDateBoard } from "@/lib/format";

/**
 * Landing page — the one-line pitch plus a live "best fares right now" board.
 * Purely promotional: the actual filtering/browsing lives on /explore. The
 * board mirrors Explore's hero (5 cheapest steals across all origins).
 */
export default function LandingPage() {
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [rows, setRows] = useState<DepartureRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCities({})
      .then((res) => {
        if (cancelled) return;
        setRows(
          res.cities
            .filter((c) => c.best.deal_tier === "steal")
            .sort((a, b) => a.best.price - b.best.price)
            .slice(0, 5)
            .map((c) => ({
              origin: c.best.origin,
              destination: c.code,
              city: c.name,
              date: formatDateBoard(c.best.outbound_date),
              nights: c.best.nights,
              price: c.best.price,
              tier: c.best.deal_tier,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      {/* ─── Pitch ───────────────────────────────────────────────────────────── */}
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Open to go anywhere,
          <br />
          on any free day.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">
          We&rsquo;ll find you cheap flights — wherever&rsquo;s cheapest,
          whenever you&rsquo;re free.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!signedIn && (
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
            >
              Get started
              <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link
            href="/explore"
            className={
              signedIn
                ? "inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
                : "inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-muted"
            }
          >
            Explore deals
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {/* ─── Live board ──────────────────────────────────────────────────────── */}
      <div className="mt-10">
        {rows === null ? <BoardSkeleton /> : <DepartureBoard rows={rows} />}
      </div>

      {/* ─── How it works — one line ─────────────────────────────────────────── */}
      <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest text-ink-muted/70">
        Pick your airports · Mark your free days · We watch the prices
      </p>
    </div>
  );
}
