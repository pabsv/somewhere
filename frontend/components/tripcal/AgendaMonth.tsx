"use client";

import { useMemo } from "react";
import type { Trip } from "@/types/api";
import { periodsInRange, type UniPeriod } from "@/lib/university/tue";
import FareTag from "@/components/ui/FareTag";
import { getDestination } from "@/data/destinations.gen";
import { formatDateShort, formatRange, nightsLabel } from "@/lib/format";
import { type MonthSpec, dayStr } from "./calendarMath";

interface AgendaMonthProps {
  spec: MonthSpec;
  /** trips intersecting this month, already sliced by the page */
  trips: Trip[];
  /** academic periods (exams/breaks) noted under the month heading */
  uniPeriods?: UniPeriod[];
  onPick: (trip: Trip) => void;
}

interface WeekGroup {
  label: string;
  trips: Trip[];
}

/**
 * Mobile (<768px) agenda view of one month: trips grouped into ISO-ish weeks by
 * their outbound day-of-month, each a stacked tappable FareTag row. No gantt —
 * just a scannable list. Click opens the same TripPopover as the desktop bars.
 */
export default function AgendaMonth({
  spec,
  trips,
  uniPeriods,
  onPick,
}: AgendaMonthProps) {
  // "Exams Q1 26 Oct – 7 Nov · Christmas recess 21 Dec – 1 Jan"
  const uniNote = useMemo(() => {
    const overlapping = periodsInRange(
      uniPeriods ?? [],
      spec.startStr,
      spec.endStr,
    );
    return overlapping
      .map(
        (p) =>
          `${p.label} ${
            p.start === p.end
              ? formatDateShort(p.start)
              : formatRange(p.start, p.end)
          }`,
      )
      .join(" · ");
  }, [uniPeriods, spec]);

  const weeks = useMemo<WeekGroup[]>(() => {
    // bucket by week-of-month based on outbound day (clamped to this month)
    const buckets = new Map<number, Trip[]>();
    for (const t of trips) {
      const outDay =
        t.outbound_date < spec.startStr
          ? 1
          : t.outbound_date > spec.endStr
            ? spec.days
            : Number(t.outbound_date.slice(8, 10));
      const wk = Math.floor((outDay - 1) / 7); // 0..4
      const arr = buckets.get(wk) ?? [];
      arr.push(t);
      buckets.set(wk, arr);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([wk, ts]) => {
        const startDay = wk * 7 + 1;
        const endDay = Math.min(startDay + 6, spec.days);
        return {
          label: `${dayStr(spec.year, spec.month, startDay).slice(8)}–${dayStr(spec.year, spec.month, endDay).slice(8)}`,
          trips: ts.sort((x, y) => x.price - y.price),
        };
      });
  }, [trips, spec]);

  return (
    <section className="rounded-card border border-line bg-card p-4 shadow-card">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {spec.label}
        </h2>
        <span className="tnum font-mono text-[11px] text-ink-muted">
          {trips.length} {trips.length === 1 ? "trip" : "trips"}
        </span>
      </div>

      {uniNote && (
        <p className="tnum -mt-2 mb-3 font-mono text-[11px] text-ink-muted/80">
          TU/e: {uniNote}
        </p>
      )}

      {weeks.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          Nothing on the board this month.
        </p>
      ) : (
        <div className="space-y-4">
          {weeks.map((week) => (
            <div key={week.label}>
              <p className="tnum mb-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted/70">
                {week.label} {spec.label.split(" ")[0]}
              </p>
              <ul className="space-y-2">
                {week.trips.map((trip) => {
                  const city =
                    getDestination(trip.destination)?.name ?? trip.city;
                  return (
                    <li key={trip.key}>
                      <button
                        type="button"
                        onClick={() => onPick(trip)}
                        className={`flex w-full items-center justify-between gap-3 rounded-card border bg-card px-3 py-2.5 text-left transition-colors ${
                          trip.near_avail
                            ? "border-dashed border-nearmiss hover:border-nearmiss-ink"
                            : "border-line hover:border-ink-muted"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold text-ink">
                            {city}
                          </p>
                          <p className="tnum mt-0.5 truncate font-mono text-[11px] text-ink-muted">
                            {trip.origin} → {trip.destination} ·{" "}
                            {formatRange(
                              trip.outbound_date,
                              trip.return_date,
                            )}{" "}
                            · {nightsLabel(trip.duration_days)}
                          </p>
                          {trip.near_avail && (
                            <p className="mt-0.5 text-[11px] font-medium text-nearmiss-ink">
                              ⚠{" "}
                              {trip.near_avail.out_spill > 0
                                ? `−${trip.near_avail.out_spill}d before your free window`
                                : `+${trip.near_avail.ret_spill}d after your free window`}
                            </p>
                          )}
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
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
