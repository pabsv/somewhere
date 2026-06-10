"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import FareTag from "@/components/ui/FareTag";
import type { Trip } from "@/types/api";
import { getTrips, ApiError } from "@/lib/client";
import { getDestination } from "@/data/destinations.gen";
import { formatDateShort, formatRange, nightsLabel } from "@/lib/format";

interface DaySheetProps {
  /** the clicked day as YYYY-MM-DD, or null when closed */
  day: string | null;
  /** origin codes currently selected */
  from: string[];
  onClose: () => void;
  /** open the trip popover for a chosen row */
  onPick: (trip: Trip) => void;
}

/**
 * Side panel listing every trip whose [outbound,return] interval spans the
 * clicked day. Fetches its own slice (getTrips with start=end=day) so the list
 * isn't limited to the curated bars on the gantt. Sorted by score desc; each
 * row is a tappable FareTag line that opens the full popover.
 */
export default function DaySheet({ day, from, onClose, onPick }: DaySheetProps) {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!day) {
      setTrips(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTrips({ from, start: day, end: day })
      .then((res) => {
        if (cancelled) return;
        const sorted = [...res.trips].sort((a, b) => b.score - a.score);
        setTrips(sorted);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn’t load trips for this day.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [day, from]);

  const title = day ? `Trips spanning ${formatDateShort(day)}` : undefined;

  return (
    <Sheet open={day != null} onClose={onClose} title={title}>
      {loading && (
        <ul className="space-y-2" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li
              key={i}
              className="h-14 animate-pulse rounded-card border border-line bg-paper"
            />
          ))}
        </ul>
      )}

      {!loading && error && (
        <p className="rounded-card border border-alert/30 bg-card px-4 py-6 text-center text-sm text-ink-muted">
          {error}
        </p>
      )}

      {!loading && !error && trips && trips.length === 0 && (
        <p className="rounded-card border border-line bg-card px-4 py-10 text-center text-sm text-ink-muted">
          No trips span this day yet.
        </p>
      )}

      {!loading && !error && trips && trips.length > 0 && (
        <ul className="space-y-2">
          {trips.map((trip) => {
            const city =
              getDestination(trip.destination)?.name ?? trip.city;
            return (
              <li key={trip.key}>
                <button
                  type="button"
                  onClick={() => onPick(trip)}
                  className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-card px-3 py-2.5 text-left transition-colors hover:border-ink-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-ink">
                      {city}
                    </p>
                    <p className="tnum mt-0.5 truncate font-mono text-[11px] text-ink-muted">
                      {trip.origin} → {trip.destination} ·{" "}
                      {formatRange(trip.outbound_date, trip.return_date)} ·{" "}
                      {nightsLabel(trip.duration_days)}
                    </p>
                  </div>
                  <FareTag
                    price={trip.price}
                    tier={trip.deal_tier}
                    size="md"
                    className="shrink-0"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
