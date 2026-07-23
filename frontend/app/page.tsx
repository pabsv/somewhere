"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import DepartureBoard, {
  BoardSkeleton,
  type DepartureRow,
} from "@/components/board/DepartureBoard";
import HowItWorks from "@/components/landing/HowItWorks";
import WaitlistSignup from "@/components/landing/WaitlistSignup";
import { getCities } from "@/lib/client";
import { formatDateBoard } from "@/lib/format";

/**
 * Landing page — the one-line pitch plus a live "best fares right now" board.
 * Purely promotional: the actual filtering/browsing lives on /explore. The
 * board mirrors Explore's hero (6 cheapest steals across all origins).
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
            .slice(0, 6)
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
      <header>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
          Open to go{" "}
          <span className="whitespace-nowrap">
            <span
              aria-hidden="true"
              className="mr-[0.26em] inline-block h-[0.55em] w-[0.7em] rounded-[0.1em] bg-brand align-middle [clip-path:polygon(0%_0%,72%_0%,100%_50%,72%_100%,0%_100%)]"
            />
            somewhere
          </span>{" "}
          cheap?
        </h1>
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
        </div>
      </header>

      {/* ─── Live board ──────────────────────────────────────────────────────── */}
      <div className="mt-10">
        {rows === null ? <BoardSkeleton /> : <DepartureBoard rows={rows} />}
      </div>

      <HowItWorks />

      {/* ─── Waitlist ────────────────────────────────────────────────────────── */}
      <div className="mt-12">
        <WaitlistSignup />
      </div>

      {/* ─── Feedback link ───────────────────────────────────────────────────── */}
      <p className="mt-8 text-center">
        <Link
          href="/feedback"
          className="font-mono text-xs uppercase tracking-widest text-ink-muted/70 underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Spotted a bug? Send feedback →
        </Link>
      </p>
    </div>
  );
}
