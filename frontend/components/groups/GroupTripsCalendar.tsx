"use client";

// ─── Group calendar — the crew as one "overlapped user" ──────────────────────
// Reuses the personal calendar's MonthBlock/AgendaMonth machinery: the group's
// shared availability windows (intersection of every known member) become the
// steal-green underlay, and the matched GroupTrips become the bars. Everything
// is derived from the GroupTripsResponse the detail page already fetched — no
// extra requests. Density is computed client-side from the curated trip set
// (the group endpoint returns no density map); day clicks are a no-op because
// DaySheet's own /api/trips fetch isn't group-aware.

import { useCallback, useMemo, useState } from "react";
import type { DateWindow, GroupTrip, Trip } from "@/types/api";
import Chip from "@/components/ui/Chip";
import MonthBlock from "@/components/tripcal/MonthBlock";
import AgendaMonth from "@/components/tripcal/AgendaMonth";
import TripPopover from "@/components/tripcal/TripPopover";
import TripTooltip from "@/components/tripcal/TripTooltip";
import { useIsMobile } from "@/components/tripcal/useIsMobile";
import { monthSpan, spansMonth, todayStr } from "@/components/tripcal/calendarMath";

const MONTHS = 6;

interface GroupTripsCalendarProps {
  trips: GroupTrip[];
  sharedWindows: { start: string; end: string }[];
}

/** date → trip count over the full (unfiltered) matched set, for the heat strip */
function buildDensity(trips: GroupTrip[]): Record<string, number> {
  const density: Record<string, number> = {};
  for (const t of trips) {
    const start = new Date(`${t.outbound_date}T00:00:00Z`);
    const end = new Date(`${t.return_date}T00:00:00Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    for (
      let d = start;
      d <= end;
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    ) {
      const key = d.toISOString().slice(0, 10);
      density[key] = (density[key] ?? 0) + 1;
    }
  }
  return density;
}

export default function GroupTripsCalendar({
  trips,
  sharedWindows,
}: GroupTripsCalendarProps) {
  const isMobile = useIsMobile();

  const today = useMemo(() => todayStr(), []);
  const months = useMemo(() => monthSpan(today, MONTHS), [today]);

  const [fullOnly, setFullOnly] = useState(false);
  const [hovered, setHovered] = useState<{
    trip: Trip;
    el: HTMLElement;
  } | null>(null);
  const [popoverTrip, setPopoverTrip] = useState<Trip | null>(null);

  const windows = useMemo<DateWindow[]>(
    () =>
      sharedWindows.map((w) => ({ start_date: w.start, end_date: w.end })),
    [sharedWindows],
  );

  const density = useMemo(() => buildDensity(trips), [trips]);

  const hasFullGroup = trips.some((t) => t.full_group);
  const shownTrips = useMemo(
    () => (fullOnly ? trips.filter((t) => t.full_group) : trips),
    [trips, fullOnly],
  );

  const tripsByMonth = useMemo(
    () =>
      months.map((spec) =>
        shownTrips.filter((t) =>
          spansMonth(t.outbound_date, t.return_date, spec),
        ),
      ),
    [shownTrips, months],
  );

  const openPopover = useCallback((t: Trip) => {
    setHovered(null);
    setPopoverTrip(t);
  }, []);

  return (
    <div>
      {hasFullGroup && (
        <div className="mb-4">
          <Chip
            size="sm"
            selected={fullOnly}
            onClick={() => setFullOnly((v) => !v)}
          >
            Everyone&rsquo;s free only
          </Chip>
        </div>
      )}

      <div className="space-y-5">
        {months.map((spec, i) =>
          isMobile ? (
            <AgendaMonth
              key={spec.label}
              spec={spec}
              trips={tripsByMonth[i]}
              onPick={openPopover}
            />
          ) : (
            <MonthBlock
              key={spec.label}
              spec={spec}
              trips={tripsByMonth[i]}
              density={density}
              windows={windows}
              today={today}
              onBarHover={(trip, el) =>
                setHovered(trip && el ? { trip, el } : null)
              }
              onBarClick={openPopover}
              onDayClick={() => {}}
            />
          ),
        )}
      </div>

      {hovered && !popoverTrip && (
        <TripTooltip trip={hovered.trip} anchor={hovered.el} />
      )}

      <TripPopover
        trip={popoverTrip}
        fromQuery=""
        onClose={() => setPopoverTrip(null)}
      />
    </div>
  );
}
