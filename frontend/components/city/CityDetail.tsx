"use client";

// ─── CityDetail — City detail page body (Track E) ────────────────────────────
// Client child of /city/[code]. Fetches getCity(code, {from: origins}), renders
// the header, best-per-month strip, and the scored upcoming-trips list (grouped
// by origin when several are selected). Origin Chips + a direct-only Chip narrow
// client-side. States: skeleton · unknown code (404) · cold/empty · error.
// Spec: docs/DESIGN_V1.md sections A, D, F.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CityDetailResponse, Trip } from "@/types/api";
import { getCity, ApiError } from "@/lib/client";
import { useOrigins } from "@/lib/useOrigins";
import { useSavedCities } from "@/lib/saved-cities";
import { getDestination } from "@/data/destinations.gen";
import { ORIGINS } from "@/data/airports.gen";
import Chip from "@/components/ui/Chip";
import StarButton from "@/components/ui/StarButton";
import PriceDisclaimer from "@/components/ui/PriceDisclaimer";
import CityHeader from "./CityHeader";
import BestPerMonth from "./BestPerMonth";
import TripRow, { TripRowSkeleton } from "./TripRow";

interface CityDetailProps {
  code: string;
}

const ORIGIN_NAME = new Map(ORIGINS.map((o) => [o.code, o.name]));

export default function CityDetail({ code }: CityDetailProps) {
  const { origins, toggle, isSelected } = useOrigins();
  const {
    signedIn: savedSignedIn,
    isSaved,
    toggle: toggleSaved,
  } = useSavedCities();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from");
  // Back link preserves the origin filter.
  const exploreHref = fromQuery ? `/explore?from=${fromQuery}` : "/explore";

  const [data, setData] = useState<CityDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [directOnly, setDirectOnly] = useState(false);

  const originsKey = origins.join(",");

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getCity(code, { from: origins })
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err instanceof ApiError
              ? err.message
              : "Something went wrong loading this city.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, originsKey]);

  useEffect(() => load(), [load]);

  // Trips come pre-sorted by score desc from the API; direct-only is a pure
  // client-side filter that preserves that order.
  const visibleTrips = useMemo(() => {
    const trips = data?.trips ?? [];
    return directOnly ? trips.filter((t) => t.is_direct) : trips;
  }, [data, directOnly]);

  // Group by origin only when more than one origin is selected; keep the
  // score order within each group. Origins ordered as in the selection.
  const grouped = useMemo(() => {
    if (origins.length <= 1) return null;
    const byOrigin = new Map<string, Trip[]>();
    for (const t of visibleTrips) {
      const list = byOrigin.get(t.origin);
      if (list) list.push(t);
      else byOrigin.set(t.origin, [t]);
    }
    return origins
      .map((o) => ({ origin: o, trips: byOrigin.get(o) ?? [] }))
      .filter((g) => g.trips.length > 0);
  }, [visibleTrips, origins]);

  // ─── States ────────────────────────────────────────────────────────────────

  if (loading && data === null && !notFound && !error) {
    return <CityDetailFallback />;
  }

  if (notFound) {
    return (
      <Shell exploreHref={exploreHref}>
        <EmptyState
          title="We don’t track this place yet."
          body="This destination isn’t in the pool. Browse the board for places we do cover."
        />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell exploreHref={exploreHref}>
        <ErrorState message={error} onRetry={load} />
      </Shell>
    );
  }

  if (!data) return null;

  const { city, baseline } = data;
  // Prefer the API's city name; fall back to generated data, then the raw code.
  const displayName = city.name || getDestination(code)?.name || code;

  const hasTrips = visibleTrips.length > 0;
  const coldEmpty = (data.trips.length === 0);

  return (
    <Shell exploreHref={exploreHref}>
      <CityHeader
        name={displayName}
        code={city.code}
        country={city.country}
        region={city.region}
        baseline={baseline}
        action={
          savedSignedIn ? (
            <StarButton
              active={isSaved(city.code)}
              onToggle={() => toggleSaved(city.code)}
              label={displayName}
              size="md"
            />
          ) : null
        }
      />

      {/* ─── Origin + direct-only filters ─────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {ORIGINS.map((o) => (
          <Chip
            key={o.code}
            size="sm"
            selected={isSelected(o.code)}
            onClick={() => toggle(o.code)}
            title={ORIGIN_NAME.get(o.code) ?? o.code}
          >
            <span className="font-mono uppercase tracking-wide">{o.code}</span>
          </Chip>
        ))}
        <span aria-hidden="true" className="mx-1 h-4 w-px bg-line" />
        <Chip
          size="sm"
          selected={directOnly}
          onClick={() => setDirectOnly((v) => !v)}
        >
          Direct only
        </Chip>
      </div>

      {coldEmpty ? (
        <div className="mt-8">
          <EmptyState
            title={`No trips on the board yet for ${displayName}.`}
            body="We haven’t found fares to this destination yet. Check back soon — the pool re-scrapes regularly."
          />
        </div>
      ) : (
        <>
          <div className="mt-8">
            <BestPerMonth trips={data.trips} />
          </div>

          <section className="mt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-ink">
                All upcoming trips
              </h2>
              <span className="tnum font-mono text-xs text-ink-muted">
                {visibleTrips.length}{" "}
                {visibleTrips.length === 1 ? "trip" : "trips"}
              </span>
            </div>

            {!hasTrips ? (
              <p className="mt-4 text-sm text-ink-muted">
                No direct flights on the board right now. Toggle “Direct only”
                off to see connections.
              </p>
            ) : grouped ? (
              <div className="mt-4 space-y-6">
                {grouped.map((g) => (
                  <div key={g.origin}>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                      <span className="tnum rounded-tag bg-brand px-1.5 py-px font-mono text-[11px] font-semibold tracking-wide text-brand-ink">
                        {g.origin}
                      </span>
                      <span>{ORIGIN_NAME.get(g.origin) ?? g.origin}</span>
                    </h3>
                    <div className="space-y-2">
                      {g.trips.map((t) => (
                        <TripRow key={t.key} trip={t} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {visibleTrips.map((t) => (
                  <TripRow key={t.key} trip={t} />
                ))}
              </div>
            )}

            <PriceDisclaimer className="mt-6" />
          </section>
        </>
      )}
    </Shell>
  );
}

// ─── Page chrome ───────────────────────────────────────────────────────────

function Shell({
  exploreHref,
  children,
}: {
  exploreHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={exploreHref}
        className="inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        ← Explore
      </Link>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

export function CityDetailFallback() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="h-4 w-20 animate-pulse rounded bg-line" />
      <div className="mt-6 space-y-3 border-b border-line pb-6">
        <div className="h-10 w-1/2 animate-pulse rounded bg-line" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-line" />
      </div>
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-7 w-14 animate-pulse rounded-full bg-line" />
        ))}
      </div>
      <div className="mt-8 flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-28 w-32 shrink-0 animate-pulse rounded-card bg-line"
          />
        ))}
      </div>
      <div className="mt-10 space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <TripRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── State panels ────────────────────────────────────────────────────────────

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-card border border-line bg-card px-6 py-16 text-center shadow-card">
      <p className="font-display text-xl font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{body}</p>
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
        Couldn’t load this city
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
