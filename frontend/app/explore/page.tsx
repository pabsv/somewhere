"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import DepartureBoard, {
  BoardSkeleton,
  type DepartureRow,
} from "@/components/board/DepartureBoard";
import CityCard, { CityCardSkeleton } from "@/components/explore/CityCard";
import ExploreControls from "@/components/explore/ExploreControls";
import PriceDisclaimer from "@/components/ui/PriceDisclaimer";
import { type SearchSelection } from "@/components/explore/SearchCombobox";
import { countryName } from "@/components/explore/countries";
import { getCities, getAvailability, ApiError } from "@/lib/client";
import { useOrigins } from "@/lib/useOrigins";
import { useSavedCities } from "@/lib/saved-cities";
import { formatDateBoard } from "@/lib/format";
import type { CitySummary } from "@/types/api";

const SKELETON_COUNT = 12;

/** Narrow a city against the active search selection (none → keep all). */
function matchesSelection(
  c: CitySummary,
  sel: SearchSelection | null,
): boolean {
  if (!sel) return true;
  switch (sel.kind) {
    case "region":
      return c.region === sel.value;
    case "country":
      return c.country === sel.value;
    case "city":
      return c.code === sel.value;
    case "text": {
      const q = sel.value.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        countryName(c.country).toLowerCase().includes(q)
      );
    }
  }
}

export default function ExplorePage() {
  const { origins } = useOrigins();
  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("from");
  // Forward only the origin filter to /city links; keeps URLs clean.
  const cityQuery = fromQuery ? `from=${fromQuery}` : "";

  const [cities, setCities] = useState<CitySummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // grid control — one search selection (city / country / region / text)
  const [selection, setSelection] = useState<SearchSelection | null>(null);

  // saved "interest" cities — pinned to the top of the grid, optional filter
  const { saved, signedIn: savedSignedIn } = useSavedCities();
  const [savedOnly, setSavedOnly] = useState(false);

  // "Only my free dates" — mirrors the Calendar chip (signed-in + has windows)
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [hasWindows, setHasWindows] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);

  useEffect(() => {
    if (!signedIn) {
      setHasWindows(false);
      setOnlyFree(false);
      return;
    }
    let cancelled = false;
    getAvailability()
      .then((res) => {
        if (!cancelled) setHasWindows(res.windows.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasWindows(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const originsKey = origins.join(",");
  const availActive = onlyFree && signedIn;

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCities({ from: origins, avail: availActive ? true : undefined })
      .then((res) => {
        if (cancelled) return;
        setCities(res.cities);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong loading the board.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originsKey, availActive]);

  useEffect(() => load(), [load]);

  // Drop the saved-only filter if the last starred city is removed, so the
  // grid doesn't strand the user on an empty "Saved" view.
  useEffect(() => {
    if (savedOnly && saved.size === 0) setSavedOnly(false);
  }, [savedOnly, saved]);

  // ─── Hero board: 5 cheapest steals ──────────────────────────────────────────
  const boardRows: DepartureRow[] = useMemo(() => {
    if (!cities) return [];
    return cities
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
      }));
  }, [cities]);

  // ─── Grid: filter by selection (+ optional saved-only), sort cheapest, then
  // pin saved cities to the top (stable: price order is preserved within each
  // group). ────────────────────────────────────────────────────────────────
  const savedKey = [...saved].sort().join(",");
  const visibleCities = useMemo(() => {
    if (!cities) return [];
    return cities
      .filter((c) => matchesSelection(c, selection))
      .filter((c) => !savedOnly || saved.has(c.code))
      .sort((a, b) => {
        const ra = saved.has(a.code) ? 0 : 1;
        const rb = saved.has(b.code) ? 0 : 1;
        if (ra !== rb) return ra - rb;
        return a.best.price - b.best.price;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, selection, savedOnly, savedKey]);

  const isCold = !loading && !error && cities != null && cities.length === 0;
  const noMatches =
    !loading && !error && !isCold && visibleCities.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* ─── Title ───────────────────────────────────────────────────────────── */}
      <header className="mb-6">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
          Fly somewhere. Cheap.
        </h1>
        <p className="mt-2 max-w-xl text-base text-ink-muted">
          Where could you go, cheap? Pick your airports, scan the board.
        </p>
      </header>

      {/* ─── Hero board ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        {loading && cities === null ? (
          <BoardSkeleton />
        ) : (
          <DepartureBoard rows={boardRows} />
        )}
      </div>

      {/* ─── Controls ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <ExploreControls
          cities={cities ?? []}
          selection={selection}
          onSelect={setSelection}
          showFree={hasWindows}
          onlyFree={onlyFree}
          onToggleFree={() => setOnlyFree((v) => !v)}
          showSaved={savedSignedIn && saved.size > 0}
          savedOnly={savedOnly}
          savedCount={saved.size}
          onToggleSaved={() => setSavedOnly((v) => !v)}
        />
      </div>

      {/* ─── Grid / states ───────────────────────────────────────────────────── */}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading && cities === null ? (
        <CityGrid>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <CityCardSkeleton key={i} />
          ))}
        </CityGrid>
      ) : isCold ? (
        <ColdState />
      ) : noMatches ? (
        <NoMatchesState onReset={() => setSelection(null)} />
      ) : (
        <>
          <CityGrid>
            {visibleCities.map((c) => (
              <CityCard key={c.code} city={c} query={cityQuery} />
            ))}
          </CityGrid>
          <PriceDisclaimer className="mt-6 text-center" />
        </>
      )}
    </div>
  );
}

// ─── Layout + state helpers ────────────────────────────────────────────────

function CityGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

function ColdState() {
  return (
    <div className="rounded-card border border-line bg-card px-6 py-16 text-center shadow-card">
      <p className="font-display text-xl font-semibold text-ink">
        The board is warming up
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        First scrapes land within the hour. Check back soon — fresh fares from
        your airports will appear here.
      </p>
    </div>
  );
}

function NoMatchesState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-card border border-line bg-card px-6 py-16 text-center shadow-card">
      <p className="font-display text-xl font-semibold text-ink">
        No cities match that search
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        Try a different city, country, or region.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-full border border-ink bg-ink px-4 py-1.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
      >
        Clear search
      </button>
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
        Couldn’t load the board
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
