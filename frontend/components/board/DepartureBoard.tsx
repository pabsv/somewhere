"use client";

import FlapText from "./FlapText";
import FareTag from "@/components/ui/FareTag";
import Badge from "@/components/ui/Badge";
import type { DealTier } from "@/components/ui/FareTag";

export interface DepartureRow {
  origin: string;
  destination: string;
  city: string;
  /** Pre-formatted display date, e.g. "21 JUN". */
  date: string;
  nights: number;
  price: number;
  tier: DealTier;
}

interface DepartureBoardProps {
  rows: DepartureRow[];
  className?: string;
}

/**
 * The Solari hero shell — ink-night board, yellow header strip, split-flap
 * route codes. `AMS→BCN  BARCELONA  21 JUN  10 NTS  €38  STEAL`.
 */
export default function DepartureBoard({
  rows,
  className = "",
}: DepartureBoardProps) {
  return (
    <section
      className={`overflow-hidden rounded-card bg-night shadow-card ${className}`}
    >
      {/* header strip */}
      <div className="h-1 bg-brand" aria-hidden="true" />
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-brand"
          aria-hidden="true"
        />
        <h2 className="font-mono text-xs tracking-widest text-paper">
          DEPARTURES — BEST FARES RIGHT NOW
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-12 text-center font-mono text-sm text-paper/60">
          The board is warming up — first fares land within the hour.
        </p>
      ) : (
        <ul>
          {rows.map((row, i) => (
            <li
              key={`${row.origin}-${row.destination}-${row.date}`}
              className="grid animate-row-in grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-white/5 px-4 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_3.5rem] sm:gap-x-5 sm:px-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <FlapText text={`${row.origin}→${row.destination}`} size="md" />
              <span className="truncate font-display text-lg text-paper">
                {row.city}
              </span>
              <span className="tnum hidden font-mono text-sm text-paper/70 sm:block">
                {row.date}
              </span>
              <span className="tnum hidden whitespace-nowrap font-mono text-sm text-paper/50 sm:block">
                {row.nights} NTS
              </span>
              <FareTag price={row.price} tier={row.tier} size="md" />
              <span className="hidden justify-self-start sm:inline-flex">
                {row.tier !== "fair" && <Badge variant={row.tier} />}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Loading placeholder matching the board's footprint while fares load. */
export function BoardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-card bg-night shadow-card"
    >
      <div className="h-1 bg-brand" />
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <span className="h-2 w-2 rounded-full bg-brand/60" />
        <span className="font-mono text-xs tracking-widest text-paper/60">
          DEPARTURES — WARMING UP
        </span>
      </div>
      <ul>
        {Array.from({ length: 5 }, (_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-3.5 last:border-b-0 sm:px-5"
          >
            <div className="h-7 w-24 animate-pulse rounded bg-white/10" />
            <div className="hidden h-4 flex-1 animate-pulse rounded bg-white/5 sm:block" />
            <div className="h-6 w-12 animate-pulse rounded bg-white/10" />
          </li>
        ))}
      </ul>
    </div>
  );
}
