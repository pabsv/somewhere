"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Trip, DateWindow } from "@/types/api";
import { getTrips, getAvailability, ApiError } from "@/lib/client";
import { useOrigins } from "@/lib/useOrigins";
import { useSavedCities } from "@/lib/saved-cities";
import { promoteFavouriteTier } from "@/lib/score";
import { useUniCalendar } from "@/lib/university/context";
import Chip from "@/components/ui/Chip";
import MonthBlock from "@/components/tripcal/MonthBlock";
import AgendaMonth from "@/components/tripcal/AgendaMonth";
import TripPopover from "@/components/tripcal/TripPopover";
import TripTooltip from "@/components/tripcal/TripTooltip";
import DaySheet from "@/components/tripcal/DaySheet";
import { useStayExtensions } from "@/components/tripcal/useStayExtensions";
import CalendarFilters, {
  type CalendarFilterState,
  EMPTY_FILTERS,
} from "@/components/tripcal/CalendarFilters";
import { useIsMobile } from "@/components/tripcal/useIsMobile";
import {
  monthSpan,
  todayStr,
  addMonths,
  spansMonth,
} from "@/components/tripcal/calendarMath";

const MONTHS = 6;

export default function CalendarPage() {
  const { origins } = useOrigins();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from") ? `from=${searchParams.get("from")}` : "";
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const isMobile = useIsMobile();

  // window bounds — fixed for the session render
  const today = useMemo(() => todayStr(), []);
  const rangeEnd = useMemo(() => addMonths(today, MONTHS), [today]);
  const months = useMemo(() => monthSpan(today, MONTHS), [today]);

  const { saved, signedIn: savedSignedIn } = useSavedCities();
  const { periods: uniPeriods, university } = useUniCalendar();

  const [filters, setFilters] = useState<CalendarFilterState>(EMPTY_FILTERS);
  const [onlyFree, setOnlyFree] = useState(true);
  const [savedOnly, setSavedOnly] = useState(false);

  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [density, setDensity] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [windows, setWindows] = useState<DateWindow[]>([]);

  // hover tooltip + click popover + day sheet
  const [hovered, setHovered] = useState<{
    trip: Trip;
    el: HTMLElement;
  } | null>(null);
  const [popoverTrip, setPopoverTrip] = useState<Trip | null>(null);
  const [daySheet, setDaySheet] = useState<string | null>(null);

  const originsKey = origins.join(",");

  // ─── Build getTrips params from filter state ──────────────────────────────
  const params = useMemo(() => {
    const maxPrice = Number(filters.maxPrice);
    const minNights = Number(filters.minNights);
    const maxNights = Number(filters.maxNights);
    return {
      from: origins,
      start: today,
      end: rangeEnd,
      maxPrice: filters.maxPrice && maxPrice > 0 ? maxPrice : undefined,
      minNights: filters.minNights && minNights > 0 ? minNights : undefined,
      maxNights: filters.maxNights && maxNights > 0 ? maxNights : undefined,
      direct: filters.direct ? true : undefined,
      tier: filters.tier === "all" ? undefined : filters.tier,
      avail: onlyFree && signedIn ? true : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originsKey, today, rangeEnd, filters, onlyFree, signedIn]);

  const paramsKey = JSON.stringify(params);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTrips(params)
      .then((res) => {
        if (cancelled) return;
        setTrips(res.trips);
        setDensity(res.density);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong loading the calendar.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => load(), [load]);

  // ─── Availability underlay (signed-in only) ───────────────────────────────
  useEffect(() => {
    if (!signedIn) {
      setWindows([]);
      return;
    }
    let cancelled = false;
    getAvailability()
      .then((res) => {
        if (!cancelled) setWindows(res.windows);
      })
      .catch(() => {
        if (!cancelled) setWindows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const hasWindows = signedIn && windows.length > 0;

  // Saved-only narrows the loaded trips to starred destinations (client-side;
  // the density underlay still reflects the full set). Favourite bars also get
  // relaxed tier coloring (a "deal" reads as a "steal", etc.).
  // Limitation: the tier filter runs server-side (params.tier) before promotion,
  // so a favourite that's only promoted-to-steal won't appear under a "steal"
  // filter. Cosmetic-only here; a `fav=` param on /api/trips is the follow-up.
  const savedKey = [...saved].sort().join(",");
  const shownTrips = useMemo(() => {
    const all = trips ?? [];
    const scoped = savedOnly
      ? all.filter((t) => saved.has(t.destination))
      : all;
    return scoped.map((t) =>
      saved.has(t.destination)
        ? { ...t, deal_tier: promoteFavouriteTier(t.deal_tier, t.score, t.price) }
        : t,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, savedOnly, savedKey]);

  // Drop the saved-only filter if the last starred city is removed.
  useEffect(() => {
    if (savedOnly && saved.size === 0) setSavedOnly(false);
  }, [savedOnly, saved]);

  // ─── Slice trips per month (a trip can appear in each month it spans) ─────
  const tripsByMonth = useMemo(() => {
    return months.map((spec) =>
      shownTrips.filter((t) =>
        spansMonth(t.outbound_date, t.return_date, spec),
      ),
    );
  }, [shownTrips, months]);

  const totalShown = shownTrips.length;
  const isCold = !loading && !error && trips != null && totalShown === 0;

  // close transient overlays when the popover / sheet opens
  const openPopover = useCallback((t: Trip) => {
    setHovered(null);
    setPopoverTrip(t);
  }, []);

  // ─── "Stay longer" suggestions for the hovered bar ─────────────────────────
  const clampToWindows = signedIn && onlyFree;
  const { extensions } = useStayExtensions(
    hovered?.trip ?? null,
    windows,
    clampToWindows,
  );
  const ghost = useMemo(
    () =>
      hovered && extensions.length > 0
        ? {
            trip: hovered.trip,
            endDate: extensions[extensions.length - 1].return_date,
          }
        : null,
    [hovered, extensions],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {/* ─── Title ─────────────────────────────────────────────────────────── */}
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
          When could you go?
        </h1>
        <p className="mt-2 max-w-xl text-base text-ink-muted">
          Six months of fares from your airports, laid out on the board. Hover a
          bar for details, tap a day for everything spanning it.
        </p>
      </header>

      {/* ─── Controls row ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <CalendarFilters
          value={filters}
          onChange={setFilters}
          extra={
            <>
              {savedSignedIn && saved.size > 0 && (
                <Chip
                  size="sm"
                  selected={savedOnly}
                  onClick={() => setSavedOnly((v) => !v)}
                >
                  ★ Favourites ({saved.size})
                </Chip>
              )}
              {hasWindows && (
                <Chip
                  size="sm"
                  selected={onlyFree}
                  onClick={() => setOnlyFree((v) => !v)}
                >
                  Only my free dates
                </Chip>
              )}
            </>
          }
        />
        {university && uniPeriods.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-uni-exam) 45%, transparent) 0 2px, transparent 2px 4px)",
                }}
              />
              TU/e exams
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-[2px]"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--color-uni-break) 35%, transparent)",
                }}
              />
              TU/e holidays
            </span>
          </div>
        )}
      </div>

      {/* ─── Body ──────────────────────────────────────────────────────────── */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading && trips === null ? (
        <SkeletonMonths />
      ) : isCold ? (
        <ColdState />
      ) : (
        <div className="space-y-5">
          {months.map((spec, i) =>
            isMobile ? (
              <AgendaMonth
                key={spec.label}
                spec={spec}
                trips={tripsByMonth[i]}
                uniPeriods={uniPeriods}
                onPick={openPopover}
              />
            ) : (
              <MonthBlock
                key={spec.label}
                spec={spec}
                trips={tripsByMonth[i]}
                density={density}
                windows={hasWindows && !onlyFree ? windows : []}
                uniPeriods={uniPeriods}
                today={today}
                ghost={ghost}
                onBarHover={(trip, el) =>
                  setHovered(trip && el ? { trip, el } : null)
                }
                onBarClick={openPopover}
                onDayClick={setDaySheet}
              />
            ),
          )}
        </div>
      )}

      {/* ─── Overlays ──────────────────────────────────────────────────────── */}
      {hovered && !popoverTrip && (
        <TripTooltip
          trip={hovered.trip}
          anchor={hovered.el}
          extensions={extensions}
        />
      )}

      <TripPopover
        trip={popoverTrip}
        fromQuery={fromQuery}
        windows={windows}
        clampToWindows={clampToWindows}
        onClose={() => setPopoverTrip(null)}
      />

      <DaySheet
        day={daySheet}
        from={origins}
        onClose={() => setDaySheet(null)}
        onPick={openPopover}
      />
    </div>
  );
}

// ─── State helpers ───────────────────────────────────────────────────────────

function SkeletonMonths() {
  return (
    <div className="space-y-5" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="rounded-card border border-line bg-card p-4 shadow-card"
        >
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-line" />
          <div className="mb-2 h-2.5 w-full animate-pulse rounded bg-line/70" />
          <div className="space-y-1.5">
            {Array.from({ length: 4 }, (_, j) => (
              <div
                key={j}
                className="h-6 animate-pulse rounded-full bg-line"
                style={{ width: `${40 + ((i + j) % 4) * 15}%` }}
              />
            ))}
          </div>
          <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-line/60" />
        </div>
      ))}
    </div>
  );
}

function ColdState() {
  return (
    <div className="rounded-card border border-line bg-card px-6 py-16 text-center shadow-card">
      <p className="font-display text-xl font-semibold text-ink">
        Nothing on the board yet
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Nothing on the board yet — scrapes are still landing. Fresh fares from
        your airports will fill in here over the next hour.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-card border border-alert/30 bg-card px-6 py-16 text-center shadow-card">
      <p className="font-display text-xl font-semibold text-ink">
        Couldn’t load the calendar
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full border border-ink bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
      >
        Retry
      </button>
    </div>
  );
}
