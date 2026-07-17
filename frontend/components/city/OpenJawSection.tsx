"use client";

// ─── OpenJawSection — "MIX & MATCH" block on the City detail (Phase 2) ────────
// Fetches GET /api/openjaw for this destination and the selected origins,
// renders OpenJawRow combos. Only meaningful with ≥2 origins selected (the
// origin-side flavor needs a pair to mix); hidden entirely otherwise, and when
// no combos exist yet (sparse grids are normal — they densify with pool
// cycles). direct_only can never be honored (grids carry no stops data), so
// when that filter is on we show a note instead of silently-wrong rows.
// Spec: docs/MULTICITY_PLAN.md Phase 2.

import { useEffect, useMemo, useState } from "react";
import type { OpenJawTrip } from "@/types/api";
import { getOpenJaw } from "@/lib/client";
import OpenJawRow from "./OpenJawRow";

const SHOW_COLLAPSED = 5;

interface OpenJawSectionProps {
  dest: string;
  origins: string[];
  directOnly: boolean;
}

/** "2026-07-17T09:12:00" (naive UTC from Python) → hours-ago label. */
function checkedAgo(iso: string): string | null {
  const t = Date.parse(iso.endsWith("Z") ? iso : iso + "Z");
  if (Number.isNaN(t)) return null;
  const hours = Math.max(0, Math.floor((Date.now() - t) / 3_600_000));
  if (hours < 1) return "checked within the hour";
  if (hours < 48) return `checked ${hours}h ago`;
  return `checked ${Math.floor(hours / 24)}d ago`;
}

export default function OpenJawSection({
  dest,
  origins,
  directOnly,
}: OpenJawSectionProps) {
  const [trips, setTrips] = useState<OpenJawTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const originsKey = origins.join(",");
  const enabled = origins.length >= 2;

  useEffect(() => {
    if (!enabled) {
      setTrips([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getOpenJaw({ dest, from: origins })
      .then((res) => {
        if (!cancelled) setTrips(res.trips);
      })
      .catch(() => {
        // Sparse/missing grids and transient errors read the same to the user:
        // no section. Mirrors the "stay longer" silent-empty convention.
        if (!cancelled) setTrips([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest, originsKey, enabled]);

  const asOf = useMemo(() => {
    if (trips.length === 0) return null;
    const oldest = trips.reduce(
      (min, t) => (t.scraped_at < min ? t.scraped_at : min),
      trips[0].scraped_at,
    );
    return checkedAgo(oldest);
  }, [trips]);

  if (!enabled || loading || trips.length === 0) return null;

  const visible = expanded ? trips : trips.slice(0, SHOW_COLLAPSED);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          Mix &amp; match
        </h2>
        <span className="tnum font-mono text-xs text-ink-muted">
          {trips.length} {trips.length === 1 ? "combo" : "combos"}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Fly out of one airport, back into another — two separate tickets,
        priced as their sum.
      </p>

      {directOnly ? (
        <p className="mt-4 text-sm text-ink-muted">
          Mix &amp; match fares don’t carry stops data, so they can’t honor
          “Direct only”. Toggle it off to see them.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {visible.map((t) => (
              <OpenJawRow key={t.key} trip={t} />
            ))}
          </div>

          {trips.length > SHOW_COLLAPSED ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {expanded
                ? "Show fewer"
                : `Show all ${trips.length} combos`}
            </button>
          ) : null}

          <p className="mt-3 text-xs leading-snug text-ink-muted/70">
            One-way fares{asOf ? ` ${asOf}` : ""} — confirm each ticket via its
            Google Flights link before booking.
          </p>
        </>
      )}
    </section>
  );
}
