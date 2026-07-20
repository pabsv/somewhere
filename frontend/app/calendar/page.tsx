"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { CalTrip, OpenJawTrip, Trip, DateWindow } from "@/types/api";
import { getTrips, getOpenJaw, getAvailability, ApiError } from "@/lib/client";
import { useOrigins } from "@/lib/useOrigins";
import { useOpenJawPref } from "@/lib/useOpenJawPref";
import { useSavedCities } from "@/lib/saved-cities";
import { promoteFavouriteTier, tierForPrice } from "@/lib/score";
import { useUniCalendar } from "@/lib/university/context";
import Chip from "@/components/ui/Chip";
import MonthBlock, {
  type StretchContext,
  type StretchSelection,
} from "@/components/tripcal/MonthBlock";
import AgendaMonth from "@/components/tripcal/AgendaMonth";
import TripPopover from "@/components/tripcal/TripPopover";
import TripTooltip from "@/components/tripcal/TripTooltip";
import {
  useStayExtensions,
  pickOpenJawExtensions,
  EMPTY_STRETCHES,
  type StayStretch,
  type StretchSet,
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

/**
 * Dress an open-jaw combo as a CalTrip so MonthBlock/TripBar can render it.
 * Tier: absolute price band on the combo total (tierForPrice) so combos colour
 * by cheapness like every other bar. score 0 keeps combos below scored round
 * trips in lane packing.
 */
function toCalTrip(oj: OpenJawTrip): CalTrip {
  const emptyLeg = { dep: "", arr: "", duration: "", stops: 0 };
  return {
    key: `oj:${oj.key}`,
    origin: oj.out.origin,
    destination: oj.destination,
    city: oj.city,
    outbound_date: oj.out.date,
    return_date: oj.back.date,
    duration_days: oj.nights,
    price: oj.total_price,
    currency: "EUR",
    airlines: [],
    is_direct: false,
    score: 0,
    delta_pct: null,
    deal_tier: tierForPrice(oj.total_price),
    outbound: emptyLeg,
    ret: emptyLeg,
    price_points: [],
    search_link: null,
    last_seen_at: oj.scraped_at,
    openjaw: oj,
  };
}

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

  // open-jaw + twin-city combos as bars — behind a chip (default off), gated
  // by the allow_open_jaw preference. Works from a single origin (twin-city
  // trips and two-singles wins don't need an origin pair).
  const allowOpenJaw = useOpenJawPref();
  const [openJawOn, setOpenJawOn] = useState(false);
  const [openJawTrips, setOpenJawTrips] = useState<OpenJawTrip[]>([]);

  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [density, setDensity] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [windows, setWindows] = useState<DateWindow[]>([]);

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
      direct: filters.direct ? true : undefined,
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

  // ─── Open-jaw combos (chip on + pref allows + ≥2 origins) ─────────────────
  // Grids carry no stops data, so combos can't honor "Direct only" — hide
  // them entirely while it's active.
  const openJawActive =
    openJawOn && allowOpenJaw && origins.length >= 1 && !filters.direct;
  useEffect(() => {
    if (!openJawActive) {
      setOpenJawTrips([]);
      return;
    }
    let cancelled = false;
    getOpenJaw({
      from: params.from,
      start: params.start,
      end: params.end,
      min_nights: params.minNights,
      max_nights: params.maxNights,
      max_price: params.maxPrice,
      avail: params.avail,
    })
      .then((res) => {
        if (!cancelled) setOpenJawTrips(res.trips);
      })
      .catch(() => {
        // Sparse grids and transient errors read the same: no combo bars.
        if (!cancelled) setOpenJawTrips([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openJawActive, paramsKey]);

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
    const roundtrips = trips ?? [];
    // Dedupe origin-side combos against round-trip bars: a bar already exists
    // for the same destination + exact dates → skip the combo (no duplicate
    // spans). Twin-city combos are exempt — they're a different trip (a second
    // city) even when the fly-in dest + dates match a round-trip bar.
    const spans = new Set(
      roundtrips.map((t) => `${t.destination}|${t.outbound_date}|${t.return_date}`),
    );
    const combos = openJawActive
      ? openJawTrips
          .filter(
            (oj) =>
              oj.ground != null ||
              !spans.has(`${oj.destination}|${oj.out.date}|${oj.back.date}`),
          )
          .map(toCalTrip)
      : [];
    // A twin-city bar is a favourite when EITHER city is starred — the fly-in
    // city is t.destination, the fly-out city is the combo's back.origin.
    const isFavourite = (t: CalTrip) =>
      saved.has(t.destination) ||
      (t.openjaw?.ground != null && saved.has(t.openjaw.back.origin));
    const all: CalTrip[] = [...roundtrips, ...combos];
    const scoped = savedOnly ? all.filter(isFavourite) : all;
    return scoped.map((t) =>
      isFavourite(t)
        ? { ...t, deal_tier: promoteFavouriteTier(t.deal_tier, t.score, t.price) }
        : t,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, savedOnly, savedKey, openJawActive, openJawTrips]);

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
  // to SPILL_MAX; these are the same flights the previous month spills right.
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
  const clampToWindows = signedIn && onlyFree;
  const { stretches: rtStretches } = useStayExtensions(
    // open-jaw bars ship their extensions inline, near-miss bars sit outside
    // the window — skip the variants fetch for both
    hovered && !hovered.trip.openjaw && !hovered.trip.near_avail
      ? hovered.trip
      : null,
    windows,
    clampToWindows,
  );
  // Open-jaw bars: later back-leg dates come attached to the combo (Phase 6) —
  // shaped client-side with the same window clamping as round-trip variants.
  const stretches = useMemo<StretchSet>(
    () =>
      hovered?.trip.openjaw
        ? {
            ...EMPTY_STRETCHES,
            later: pickOpenJawExtensions(hovered.trip, windows, clampToWindows),
          }
        : rtStretches,
    [hovered, rtStretches, windows, clampToWindows],
  );
  // The availability window the hovered trip sits in — the bubble spans it.
  // Resolved only in clamp mode (matching how the variants are clamped); with
  // no window we fall back to the ±3-day stretch envelope below.
  const hoveredWindow = useMemo(() => {
    if (!hovered || hovered.trip.openjaw || !clampToWindows) return undefined;
    const t = hovered.trip;
    return windows.find(
      (w) => w.start_date <= t.outbound_date && t.return_date <= w.end_date,
    );
  }, [hovered, windows, clampToWindows]);

  // ─── Full-length bubble (design option 2c) for the hovered bar ─────────────
  // One dashed pill over the whole window with a fare on each free day; click a
  // day to swap the trip live. Open-jaw bars are excluded (their extensions are
  // inline and one-sided). Cells come from single-side variants only so each
  // click maps unambiguously to one variant; the full-window variant lives in
  // the popover.
  const stretch = useMemo<StretchContext | null>(() => {
    // near-miss bars sit partly outside the window — no stretch bubble
    if (!hovered || hovered.trip.openjaw || hovered.trip.near_avail) return null;
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
                  selected={onlyFree}
                  onClick={() => setOnlyFree((v) => !v)}
                >
                  Only my free dates
                </Chip>
              )}
              {allowOpenJaw && origins.length >= 1 && (
                <Chip
                  size="sm"
                  selected={openJawOn}
                  onClick={() => setOpenJawOn((v) => !v)}
                  title="Open-jaw & twin-city combos: mixed airports or two cities in one trip — two separate tickets"
                >
                  ⇄ Mix &amp; match
                </Chip>
              )}
            </>
          }
        />
        {openJawOn &&
          allowOpenJaw &&
          origins.length >= 1 &&
          filters.direct && (
            <p className="mt-2 text-xs text-ink-muted">
              Mix &amp; match fares carry no stops data, so they’re hidden
              while “Direct only” is on.
            </p>
          )}
        {/* Edge-hour honesty (Phase 6): grids are date-only, so the "free
            from / back by" hours on availability windows can't constrain
            combo bars — say so instead of silently ignoring them. */}
        {openJawActive &&
          onlyFree &&
          signedIn &&
          windows.some((w) => w.start_time != null || w.end_time != null) && (
            <p className="mt-2 text-xs text-ink-muted">
              Mix &amp; match fares carry no departure times, so the “free
              from / back by” hours on your windows can’t apply to them — only
              the dates do.
            </p>
          )}
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
                inbound={inboundByMonth[i]}
                density={density}
                windows={hasWindows ? windows : []}
                underlay={!onlyFree}
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
            ),
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
