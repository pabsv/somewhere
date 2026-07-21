"use client";

import Link from "next/link";
import Sheet from "@/components/ui/Sheet";
import FareTag from "@/components/ui/FareTag";
import Badge from "@/components/ui/Badge";
import Spark from "@/components/ui/Spark";
import PriceDisclaimer from "@/components/ui/PriceDisclaimer";
import type { CalTrip, DateWindow, Trip } from "@/types/api";
import { getDestination } from "@/data/destinations.gen";
import { getSearchUrl } from "@/lib/searchUrl";
import {
  formatDateShort,
  formatDelta,
  formatRange,
  nearMissPhrase,
  nightsLabel,
  formatPrice,
} from "@/lib/format";
import CountryFlag from "@/components/ui/CountryFlag";
import { useIsMobile } from "./useIsMobile";
import {
  useStayExtensions,
  stretchCount,
  type StayStretch,
} from "./useStayExtensions";

interface TripPopoverProps {
  trip: CalTrip | null;
  /** current ?from= query string (no leading ?), forwarded to the city link */
  fromQuery: string;
  /** availability windows for "stay longer" clamping; omit to skip clamping */
  windows?: DateWindow[];
  /** true → clamp suggestions to the window containing the trip */
  clampToWindows?: boolean;
  onClose: () => void;
}

const TIER_BADGE: Record<Trip["deal_tier"], "steal" | "deal" | "neutral"> = {
  steal: "steal",
  deal: "deal",
  fair: "neutral",
};

/** One stretch row: label (children) → Google Flights for the shifted dates. */
function StretchLink({
  trip,
  s,
  children,
}: {
  trip: Trip;
  s: StayStretch;
  children: React.ReactNode;
}) {
  return (
    <a
      href={getSearchUrl({
        origin: trip.origin,
        destination: trip.destination,
        outbound_date: s.out_date,
        return_date: s.return_date,
        duration_days: s.nights,
        search_link: s.search_link,
      })}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0 transition-colors hover:bg-paper"
    >
      <span className="tnum font-mono text-xs text-ink">{children}</span>
      <span className="tnum font-mono text-xs text-ink">
        {s.estimated ? "~" : ""}
        {formatPrice(s.price)}
        <span
          className={`ml-2 ${
            Math.round(s.deltaPrice) > 0
              ? "text-ink-muted"
              : "font-medium text-steal"
          }`}
        >
          {formatDelta(s.deltaPrice)}
        </span>
      </span>
    </a>
  );
}

function LegRow({
  label,
  dep,
  arr,
  duration,
  stops,
}: {
  label: string;
  dep: string;
  arr: string;
  duration: string;
  stops: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="tnum font-mono text-xs text-ink">
        {dep} → {arr}
        <span className="ml-2 text-ink-muted">
          {duration} · {stops === 0 ? "direct" : `${stops} stop${stops > 1 ? "s" : ""}`}
        </span>
      </span>
    </div>
  );
}

/**
 * Click-through trip detail in a side Sheet: full itinerary, the fare with its
 * price-band badge, the airlines, a price sparkline from trip.price_points, a
 * Google Flights deep link (new tab), and a "More trips to {city} →" link to
 * /city/[code] (preserving ?from=).
 */
export default function TripPopover({
  trip,
  fromQuery,
  windows = [],
  clampToWindows = false,
  onClose,
}: TripPopoverProps) {
  const open = trip != null;
  const isMobile = useIsMobile();
  const { stretches, loading: stretchesLoading } = useStayExtensions(
    trip,
    windows,
    clampToWindows,
  );
  const dest = trip ? getDestination(trip.destination) : undefined;
  const city = dest?.name ?? trip?.city ?? "";
  const title = trip ? (
    <>
      <CountryFlag code={dest?.country} className="mr-1.5" />
      {city}
    </>
  ) : undefined;
  const cityHref = trip
    ? fromQuery
      ? `/city/${trip.destination}?${fromQuery}`
      : `/city/${trip.destination}`
    : "#";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      ariaLabel={city || undefined}
      // Phones put the dismiss control top-left (and you can also just swipe
      // the panel back to the right); desktop keeps the side-panel ✕.
      closeSide={isMobile ? "left" : "right"}
    >
      {trip && (
        <div className="space-y-5">
          {/* ─── Headline ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="tnum font-mono text-sm font-semibold uppercase tracking-wide text-ink">
                {trip.origin} → {trip.destination}
              </p>
              <p className="tnum mt-1 font-mono text-xs text-ink-muted">
                {formatRange(trip.outbound_date, trip.return_date)} ·{" "}
                {nightsLabel(trip.duration_days)}
              </p>
              {trip.near_avail && (
                <p className="tnum mt-1 font-mono text-[11px] text-nearmiss-ink">
                  ⚠ Outside your availability — {nearMissPhrase(trip.near_avail)}
                  . Shown by “± 2 days”.
                </p>
              )}
              {trip.auto_extended && (
                <p className="tnum mt-1 font-mono text-[11px] text-steal">
                  Auto-stretched +{trip.auto_extended.extra_nights}d — same
                  route was → {formatDateShort(trip.auto_extended.base_return_date)}{" "}
                  for {formatPrice(trip.auto_extended.base_price)} (
                  {formatDelta(trip.auto_extended.delta_price)})
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <FareTag price={trip.price} tier={trip.deal_tier} size="lg" />
              {trip.deal_tier !== "fair" && (
                <Badge variant={TIER_BADGE[trip.deal_tier]} />
              )}
            </div>
          </div>

          {/* ─── Airlines + sparkline ─────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-paper px-3 py-2.5">
            <div className="min-w-0">
              <p className="tnum font-mono text-[11px] text-ink-muted">
                {trip.airlines.length > 0 ? trip.airlines.join(", ") : "—"}
              </p>
            </div>
            {trip.price_points.length > 1 && (
              <Spark
                points={trip.price_points.map((pt) => ({
                  p: pt.p,
                  at: pt.at,
                }))}
                width={88}
                height={28}
              />
            )}
          </div>

          {/* ─── Itinerary legs ───────────────────────────────────────── */}
          <div className="rounded-card border border-line bg-card px-3">
            <LegRow
              label="Out"
              dep={trip.outbound.dep}
              arr={trip.outbound.arr}
              duration={trip.outbound.duration}
              stops={trip.outbound.stops}
            />
            <LegRow
              label="Back"
              dep={trip.ret.dep}
              arr={trip.ret.arr}
              duration={trip.ret.duration}
              stops={trip.ret.stops}
            />
          </div>

          {/* ─── Stretch this trip ────────────────────────────────────── */}
          {!stretchesLoading && (
            <div className="rounded-card border border-line bg-card px-3">
              <p className="border-b border-line py-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                Stretch this trip
              </p>
              {stretchCount(stretches) > 0 ? (
                <>
                  {stretches.earlier.map((s) => (
                    <StretchLink key={`e${s.out_date}`} trip={trip} s={s}>
                      ←{s.daysEarlier}d earlier
                      <span className="ml-2 text-ink-muted">
                        dep {formatDateShort(s.out_date)}
                      </span>
                    </StretchLink>
                  ))}
                  {stretches.later.map((s) => (
                    <StretchLink key={`l${s.return_date}`} trip={trip} s={s}>
                      +{s.daysLater}d longer
                      <span className="ml-2 text-ink-muted">
                        → {formatDateShort(s.return_date)}
                      </span>
                    </StretchLink>
                  ))}
                  {stretches.fullWindow && (
                    <StretchLink key="full" trip={trip} s={stretches.fullWindow}>
                      Full window
                      <span className="ml-2 text-ink-muted">
                        {formatRange(
                          stretches.fullWindow.out_date,
                          stretches.fullWindow.return_date,
                        )}
                      </span>
                    </StretchLink>
                  )}
                  {(stretches.earlier.some((s) => s.estimated) ||
                    stretches.later.some((s) => s.estimated) ||
                    stretches.fullWindow?.estimated) && (
                    <p className="py-2 font-mono text-[11px] text-ink-muted">
                      ~ prices are two-single estimates from one-way fares —
                      the round-trip fare may differ.
                    </p>
                  )}
                </>
              ) : (
                <p className="py-2 font-mono text-xs text-ink-muted">
                  No stretch options seen yet for these dates.
                </p>
              )}
            </div>
          )}

          {/* ─── Actions ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <a
              href={getSearchUrl(trip)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
            >
              Open on Google Flights
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3h7v7M13 3L7 9M11 9v3.5A1.5 1.5 0 0 1 9.5 14h-6A1.5 1.5 0 0 1 2 12.5v-6A1.5 1.5 0 0 1 3.5 5H7" />
              </svg>
            </a>
            <Link
              href={cityHref}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-muted"
            >
              More trips to {city} →
            </Link>
            <PriceDisclaimer className="pt-1 text-center">
              Snapshot fare — confirm the live price on Google Flights.
            </PriceDisclaimer>
          </div>
        </div>
      )}
    </Sheet>
  );
}
