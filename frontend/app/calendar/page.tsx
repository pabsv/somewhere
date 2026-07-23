"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { CalTrip, Trip, DateWindow, Preferences } from "@/types/api";
import {
  getTrips,
  getAvailability,
  getPreferences,
  putPreferences,
  ApiError,
} from "@/lib/client";
import { useOrigins } from "@/lib/useOrigins";
import { useSavedCities } from "@/lib/saved-cities";
import { favouriteDest, isFavouriteTrip } from "@/lib/favourites";
import { promoteFavouriteTier } from "@/lib/score";
import { useUniCalendar } from "@/lib/university/context";
import Chip from "@/components/ui/Chip";
import MonthBlock, {
  type StretchContext,
  type StretchSelection,
} from "@/components/tripcal/MonthBlock";
import TripRail from "@/components/tripcal/TripRail";
import TripPopover from "@/components/tripcal/TripPopover";
import TripTooltip from "@/components/tripcal/TripTooltip";
import {
  useStayExtensions,
  type StayStretch,
} from "@/components/tripcal/useStayExtensions";
import { formatDelta, formatPrice } from "@/lib/format";
import CalendarFilters, {
  type CalendarFilterState,
  EMPTY_FILTERS,
  PRICE_MAX,
  NIGHTS_MIN,
  NIGHTS_MAX,
} from "@/components/tripcal/CalendarFilters";
import { useIsMobile } from "@/components/tripcal/useIsMobile";
import {
  monthSpan,
  todayStr,
  addMonths,
} from "@/components/tripcal/calendarMath";

const MONTHS = 10;

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
  // The board is ALWAYS the user's free dates — showing fares on days someone
  // can't travel was noise, so there is no "all dates" mode any more. The chip
  // that used to toggle it now widens each window by up to two days instead.
  // Missing preference intentionally means ON: new users and existing users
  // who have never touched the chip get the useful, more forgiving view.
  const [nearMiss, setNearMiss] = useState(true);
  const [calendarPreferences, setCalendarPreferences] =
    useState<Preferences | null>(null);
  const [nearMissSaving, setNearMissSaving] = useState(false);
  const [nearMissError, setNearMissError] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);

  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [density, setDensity] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [windows, setWindows] = useState<DateWindow[]>([]);
  // Told apart from "no windows set": the server filters from its own copy, so
  // a failed fetch would otherwise present a filtered board as an unfiltered one.
  const [windowsError, setWindowsError] = useState(false);

  // hover tooltip + click popover + day sheet
  const [hovered, setHovered] = useState<{
    trip: CalTrip;
    el: HTMLElement;
  } | null>(null);
  const [popoverTrip, setPopoverTrip] = useState<CalTrip | null>(null);

  // Committed trip-stretch swaps, keyed by trip.key — persist for the session
  // so a swap survives un-hover (design option 2c). A swapped-but-unhovered bar
  // renders at its new dates; re-hovering it re-opens the bubble around it.
  const [selections, setSelections] = useState<Record<string, StayStretch>>({});

  const originsKey = origins.join(",");
  // Sorted so a favourite set always serializes the same way: this feeds both
  // the request and `paramsKey` below, and raw Set order would churn the
  // refetch effect on every render.
  const savedKey = [...saved].sort().join(",");

  // ─── Build getTrips params from filter state ──────────────────────────────
  const params = useMemo(() => {
    return {
      from: origins,
      start: today,
      end: rangeEnd,
      // Slider bounds mean "no filter"; price at PRICE_MAX means uncapped.
      maxPrice: filters.maxPrice >= PRICE_MAX ? undefined : filters.maxPrice,
      minNights:
        filters.minNights > NIGHTS_MIN ? filters.minNights : undefined,
      maxNights:
        filters.maxNights < NIGHTS_MAX ? filters.maxNights : undefined,
      // Always on for a signed-in user (the server no-ops it when they have no
      // windows). Kept conditional on `signedIn` so an anonymous load doesn't
      // pay for an `auth()` round trip that can only return the same payload.
      avail: signedIn ? true : undefined,
      // "± 2 days". Not gated on hasWindows: that comes from a second async
      // fetch, and adding it here would fire a spurious refetch when it lands —
      // the chip only renders with windows, so this can't be true without them.
      near: signedIn && nearMiss ? true : undefined,
      // Sent whether or not the ★ filter is on: a favourite earns its bigger
      // margin on the normal board too, not only when filtered down to it.
      favs: savedKey ? savedKey.split(",") : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originsKey, today, rangeEnd, filters, nearMiss, signedIn, savedKey]);

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

  // Restore this account's explicit Calendar choice. The API merges stored
  // preferences over a true default, so untouched accounts remain opted in.
  useEffect(() => {
    if (!signedIn) {
      setCalendarPreferences(null);
      setNearMiss(true);
      setNearMissError(null);
      return;
    }

    let cancelled = false;
    getPreferences()
      .then((preferences) => {
        if (cancelled) return;
        setCalendarPreferences(preferences);
        setNearMiss(preferences.calendar_near_miss);
      })
      .catch(() => {
        // Keep the safe default. A later click retries the preference read
        // before saving, so a transient load failure cannot erase other prefs.
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const toggleNearMiss = useCallback(async () => {
    if (nearMissSaving) return;

    const previous = nearMiss;
    const next = !previous;
    setNearMiss(next);
    setNearMissError(null);

    if (!signedIn) return;

    setNearMissSaving(true);
    try {
      // Normally already loaded. Retrying here preserves all other settings
      // if the initial request failed instead of writing a partial document.
      const current = calendarPreferences ?? (await getPreferences());
      const savedPreferences = await putPreferences({
        ...current,
        calendar_near_miss: next,
      });
      setCalendarPreferences(savedPreferences);
      setNearMiss(savedPreferences.calendar_near_miss);
    } catch {
      setNearMiss(previous);
      setNearMissError("Couldn’t save your ± 2 days preference. Try again.");
    } finally {
      setNearMissSaving(false);
    }
  }, [calendarPreferences, nearMiss, nearMissSaving, signedIn]);

  // ─── Availability underlay (signed-in only) ───────────────────────────────
  useEffect(() => {
    if (!signedIn) {
      setWindows([]);
      setWindowsError(false);
      return;
    }
    let cancelled = false;
    getAvailability()
      .then((res) => {
        if (cancelled) return;
        setWindows(res.windows);
        setWindowsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWindows([]);
        setWindowsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const hasWindows = signedIn && windows.length > 0;

  // Saved-only narrows the loaded trips to starred destinations (client-side;
  // the density underlay still reflects the full set). Favourite bars also get
  // relaxed tier coloring (a "deal" reads as a "steal", etc.) and the gold
  // contour, which TripBar/TripRail draw themselves off the favourite scope.
  // The server already gave these destinations a looser price cap and a
  // reserved share of each month (params.favs), so what arrives here is a
  // generous set rather than the same 2-per-month every city gets.
  const shownTrips = useMemo(() => {
    const all: CalTrip[] = trips ?? [];
    const scoped = savedOnly
      ? all.filter((t) => isFavouriteTrip(t, saved))
      : all;
    return scoped.map((t) => {
      // Promote against the city that actually matched: price bands are
      // reach-scaled, so a favourite must relax from its own region's reach.
      const fav = favouriteDest(t, saved);
      return fav
        ? { ...t, deal_tier: promoteFavouriteTier(t.deal_tier, t.score, t.price, fav) }
        : t;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, savedOnly, savedKey]);

  // Drop the saved-only filter if the last starred city is removed.
  useEffect(() => {
    if (savedOnly && saved.size === 0) setSavedOnly(false);
  }, [savedOnly, saved]);

  // ─── Slice trips per month (a trip renders once, in its outbound month; a
  // month-crossing bar clips at the edge and shows a return-date chip) ───────
  const tripsByMonth = useMemo(() => {
    return months.map((spec) =>
      shownTrips.filter(
        (t) => t.outbound_date >= spec.startStr && t.outbound_date <= spec.endStr,
      ),
    );
  }, [shownTrips, months]);

  // Boundary crossings for each month's left "fog" lead-in: trips departing
  // before the month whose return lands inside it. MonthBlock caps the lead-in
  // to PAD; these are the same flights the previous month spills right.
  const inboundByMonth = useMemo(() => {
    return months.map((spec) =>
      shownTrips.filter(
        (t) =>
          t.outbound_date < spec.startStr && t.return_date >= spec.startStr,
      ),
    );
  }, [shownTrips, months]);

  const totalShown = shownTrips.length;
  const isCold = !loading && !error && trips != null && totalShown === 0;

  // close transient overlays when the popover / sheet opens
  const openPopover = useCallback((t: CalTrip) => {
    setHovered(null);
    setPopoverTrip(t);
  }, []);

  // Swap a trip's stored dates/price for its committed stretch selection, so
  // the tooltip, popover, and booking links all reflect what the user picked.
  const applySelection = useCallback(
    (t: CalTrip): CalTrip => {
      const s = selections[t.key];
      if (!s) return t;
      return {
        ...t,
        outbound_date: s.out_date,
        return_date: s.return_date,
        price: s.price,
        duration_days: s.nights,
      };
    },
    [selections],
  );

  // ─── Trip-stretch suggestions for the hovered bar ──────────────────────────
  const clampToWindows = signedIn;
  // ±2-day bars DO fetch: "can I shift this into my window?" is the whole
  // reason to look at one, and they resolve no containing window, so the
  // server falls back to the ±3-day envelope, which is exactly that answer.
  const { stretches } = useStayExtensions(
    hovered ? hovered.trip : null,
    windows,
    clampToWindows,
  );
  // The availability window the hovered trip sits in — the bubble spans it.
  // Resolved only in clamp mode (matching how the variants are clamped); with
  // no window we fall back to the ±3-day stretch envelope below.
  const hoveredWindow = useMemo(() => {
    if (!hovered || !clampToWindows) return undefined;
    const t = hovered.trip;
    return windows.find(
      (w) => w.start_date <= t.outbound_date && t.return_date <= w.end_date,
    );
  }, [hovered, windows, clampToWindows]);

  // ─── Full-length bubble (design option 2c) for the hovered bar ─────────────
  // One dashed pill over the whole window with a fare on each free day; click a
  // day to swap the trip live. Cells come from single-side variants only so each
  // click maps unambiguously to one variant; the full-window variant lives in
  // the popover.
  const stretch = useMemo<StretchContext | null>(() => {
    if (!hovered) return null;
    const base = hovered.trip;
    const sel = selections[base.key] ?? null;

    const cells = [
      ...stretches.earlier.map((s) => ({
        date: s.out_date,
        side: "earlier" as const,
        label: `${s.estimated ? "~" : ""}${formatDelta(s.deltaPrice)}`,
        active: sel != null && sel.out_date <= s.out_date,
      })),
      ...stretches.later.map((s) => ({
        date: s.return_date,
        side: "later" as const,
        label: `${s.estimated ? "~" : ""}${formatDelta(s.deltaPrice)}`,
        active: sel != null && sel.return_date >= s.return_date,
      })),
    ];
    if (cells.length === 0 && !sel) return null;

    // bubble span: the free window when clamping, else the stretch envelope
    const outs = [base.outbound_date, ...stretches.earlier.map((s) => s.out_date)];
    const rets = [base.return_date, ...stretches.later.map((s) => s.return_date)];
    if (sel) {
      outs.push(sel.out_date);
      rets.push(sel.return_date);
    }
    const winStart =
      hoveredWindow?.start_date ?? outs.reduce((a, b) => (b < a ? b : a));
    const winEnd =
      hoveredWindow?.end_date ?? rets.reduce((a, b) => (b > a ? b : a));

    const dayVariant = new Map<string, StayStretch>();
    for (const s of stretches.earlier) dayVariant.set(s.out_date, s);
    for (const s of stretches.later) dayVariant.set(s.return_date, s);

    const price = sel?.price ?? base.price;
    return {
      key: base.key,
      winStart,
      winEnd,
      selOut: sel?.out_date ?? base.outbound_date,
      selRet: sel?.return_date ?? base.return_date,
      barLabel: `${base.destination} ${formatPrice(price)}`,
      deltaLabel: sel ? formatDelta(price - base.price) : null,
      modified: sel != null,
      cells,
      onPickDay: (date: string) => {
        const v = dayVariant.get(date);
        if (!v) return;
        setSelections((prev) => {
          const cur = prev[base.key];
          // clicking the exact current selection toggles back to base
          if (
            cur &&
            cur.out_date === v.out_date &&
            cur.return_date === v.return_date
          ) {
            const rest = { ...prev };
            delete rest[base.key];
            return rest;
          }
          return { ...prev, [base.key]: v };
        });
      },
      onBar: () => {
        if (selections[base.key]) {
          setSelections((prev) => {
            const rest = { ...prev };
            delete rest[base.key];
            return rest;
          });
        } else {
          openPopover(applySelection(base));
        }
      },
    };
  }, [
    hovered,
    stretches,
    hoveredWindow,
    selections,
    openPopover,
    applySelection,
  ]);

  // Committed swaps for MonthBlock — modified bars that aren't hovered render
  // at these dates with a "·+€21" tail.
  const selectionsMap = useMemo(() => {
    const m = new Map<string, StretchSelection>();
    for (const [key, s] of Object.entries(selections)) {
      m.set(key, {
        out_date: s.out_date,
        return_date: s.return_date,
        price: s.price,
        nights: s.nights,
        deltaPrice: s.deltaPrice,
      });
    }
    return m;
  }, [selections]);

  // Tooltip reflects the swapped variant when one is committed.
  const hoveredDisplay = hovered ? applySelection(hovered.trip) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {/* ─── Title ─────────────────────────────────────────────────────────── */}
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
          When could you go?
        </h1>
        <p className="mt-2 max-w-xl text-base text-ink-muted">
          Ten months of fares from your airports, laid out on the board. Hover a
          bar for details, click it to book.
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
                  selected={nearMiss}
                  onClick={toggleNearMiss}
                  disabled={nearMissSaving}
                  className={nearMissSaving ? "cursor-wait opacity-70" : ""}
                  title="Also show trips that spill up to two days outside a free window — leave early, come back late, or a day of each"
                >
                  ± 2 days
                </Chip>
              )}
            </>
          }
        />
        {nearMissError && (
          <p className="mt-2 px-4 text-xs text-alert" role="status">
            {nearMissError}
          </p>
        )}
        {/* What the board is filtered by. The chip used to say this for free;
            with the board permanently on free dates, it has to be written down
            — including for the two cases where the filter silently can't run. */}
        {windowsError ? (
          <p className="mt-2 px-4 text-xs text-ink-muted">
            Couldn’t load your free dates, so this board may not match them.
          </p>
        ) : hasWindows ? (
          <p className="mt-2 px-4 text-xs text-ink-muted">
            Showing fares that fit your free dates.
          </p>
        ) : signedIn ? (
          <p className="mt-2 px-4 text-xs text-ink-muted">
            You haven’t set any free dates, so this is everything.{" "}
            <Link
              href="/settings"
              className="font-medium text-ink underline underline-offset-2"
            >
              Set your availability →
            </Link>
          </p>
        ) : (
          <p className="mt-2 px-4 text-xs text-ink-muted">
            Sign in and set your free dates to filter this board to when you
            could actually go.
          </p>
        )}
        {(signedIn || (university && uniPeriods.length > 0)) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 text-xs text-ink-muted">
            {university && uniPeriods.length > 0 && (
              <>
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
              </>
            )}
            {/* Chip-shaped link (Chip itself is button-only) — the ★ filter
                chip above only toggles, it can't take you to the editor. */}
            {signedIn && (
              <Link
                href="/settings#favourites"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-ink-muted"
              >
                ★ Edit favourite cities
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ─── Body ──────────────────────────────────────────────────────────── */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading && trips === null ? (
        <SkeletonMonths />
      ) : isCold ? (
        // With the board permanently on free dates, "nothing here" usually
        // means the windows or the sliders are too tight — not cold data.
        hasWindows ? (
          <NoFitState
            nearMiss={nearMiss}
            onTryNearMiss={() => setNearMiss(true)}
          />
        ) : (
          <ColdState />
        )
      ) : (
        // A chip toggle is a real round trip and the skeleton only covers the
        // first load, so dim the board rather than looking inert.
        <div
          aria-busy={loading}
          className={loading ? "opacity-60 transition-opacity" : undefined}
        >
          {isMobile ? (
            <TripRail
              trips={shownTrips}
              density={density}
              windows={hasWindows ? windows : []}
              uniPeriods={uniPeriods}
              today={today}
              end={rangeEnd}
              onPick={openPopover}
            />
          ) : (
            <div className="space-y-5">
              {months.map((spec, i) => (
                <MonthBlock
                  key={spec.label}
                  spec={spec}
                  trips={tripsByMonth[i]}
                  inbound={inboundByMonth[i]}
                  density={density}
                  windows={hasWindows ? windows : []}
                  // Every bar now sits inside a window, so the wash is the
                  // cheapest way to show WHERE they are — and it's what makes a
                  // ± 2 days bar visibly hang off the edge.
                  underlay={hasWindows}
                  showFreeStrip={hasWindows}
                  uniPeriods={uniPeriods}
                  today={today}
                  selections={selectionsMap}
                  stretch={stretch}
                  onBarHover={(trip, el) =>
                    setHovered(trip && el ? { trip, el } : null)
                  }
                  onBarClick={(t) => openPopover(applySelection(t))}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Overlays ──────────────────────────────────────────────────────── */}
      {hovered && hoveredDisplay && !popoverTrip && (
        <TripTooltip trip={hoveredDisplay} anchor={hovered.el} />
      )}

      <TripPopover
        trip={popoverTrip}
        fromQuery={fromQuery}
        windows={windows}
        clampToWindows={clampToWindows}
        onClose={() => setPopoverTrip(null)}
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

/**
 * The board is always filtered to the user's free dates now, so an empty board
 * almost always means the windows or the sliders are too tight — not that the
 * scrapes haven't landed. Offer the three real ways out.
 */
function NoFitState({
  nearMiss,
  onTryNearMiss,
}: {
  nearMiss: boolean;
  onTryNearMiss: () => void;
}) {
  return (
    <div className="rounded-card border border-line bg-card px-6 py-16 text-center shadow-card">
      <p className="font-display text-xl font-semibold text-ink">
        No fares fit your free dates
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Nothing in the next ten months lands inside your availability at this
        price. Try raising “Max €”, widening your free dates, or looking a day
        either side.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {!nearMiss && (
          <button
            type="button"
            onClick={onTryNearMiss}
            className="rounded-full border border-ink bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Try ± 2 days
          </button>
        )}
        <Link
          href="/settings"
          className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-line/40"
        >
          Edit your free dates
        </Link>
      </div>
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
