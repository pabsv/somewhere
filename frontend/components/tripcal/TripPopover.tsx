"use client";

import { Fragment } from "react";
import Link from "next/link";
import Sheet from "@/components/ui/Sheet";
import FareTag from "@/components/ui/FareTag";
import Badge from "@/components/ui/Badge";
import Spark from "@/components/ui/Spark";
import PriceDisclaimer from "@/components/ui/PriceDisclaimer";
import type { CalTrip, DateWindow, Trip } from "@/types/api";
import { getDestination } from "@/data/destinations.gen";
import { getSearchUrl, buildGoogleFlightsOneWayUrl } from "@/lib/searchUrl";
import {
  formatDateShort,
  formatDelta,
  formatRange,
  nightsLabel,
  formatPrice,
} from "@/lib/format";
import CountryFlag from "@/components/ui/CountryFlag";
import {
  useStayExtensions,
  pickOpenJawExtensions,
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
  const oj = trip?.openjaw ?? null;
  // Open-jaw combos ship their extensions inline — skip the variants fetch.
  const { stretches, loading: stretchesLoading } = useStayExtensions(
    oj ? null : trip,
    windows,
    clampToWindows,
  );
  // Later back-leg dates attached to the combo (Phase 6), same clamping as
  // the round-trip path. Empty = section hidden (sparse grids are normal).
  const ojExtensions =
    trip && oj ? pickOpenJawExtensions(trip, windows, clampToWindows) : [];
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
    <Sheet open={open} onClose={onClose} title={title} ariaLabel={city || undefined}>
      {trip && (
        <div className="space-y-5">
          {/* ─── Headline ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="tnum font-mono text-sm font-semibold uppercase tracking-wide text-ink">
                {oj
                  ? oj.ground
                    ? `${oj.out.origin} → ${oj.out.destination} ⇢ ${oj.back.origin} → ${oj.back.destination}`
                    : `${oj.out.origin} → ${trip.destination} → ${oj.back.destination}`
                  : `${trip.origin} → ${trip.destination}`}
              </p>
              <p className="tnum mt-1 font-mono text-xs text-ink-muted">
                {formatRange(trip.outbound_date, trip.return_date)} ·{" "}
                {nightsLabel(trip.duration_days)}
              </p>
              {trip.near_avail && (
                <p className="tnum mt-1 font-mono text-[11px] text-nearmiss-ink">
                  ⚠ Outside your availability —{" "}
                  {trip.near_avail.out_spill > 0
                    ? `leaves ${trip.near_avail.out_spill} day before your free window opens`
                    : `returns ${trip.near_avail.ret_spill} day after your free window ends`}
                  . Shown because it&apos;s a bargain.
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

          {/* ─── Open-jaw: combo summary + legs with booking links ─────── */}
          {oj && (
            <>
              <div className="rounded-card border border-line bg-paper px-3 py-2.5">
                <p className="font-mono text-xs text-ink">
                  {oj.ground
                    ? `Twin city — fly into ${oj.out.destination}, home from ${oj.back.origin}. Two separate one-way tickets; the overland hop is on you.`
                    : `Mix & match — ${
                        oj.same_origin
                          ? "two one-way singles instead of a return ticket"
                          : "two separate one-way tickets"
                      }`}
                </p>
                <p className="tnum mt-0.5 font-mono text-[11px] text-ink-muted">
                  {oj.vs_roundtrip != null && oj.vs_roundtrip > 0 ? (
                    <span className="font-medium text-steal">
                      €{Math.round(oj.vs_roundtrip)} under the stored round trip
                    </span>
                  ) : (
                    "no round trip stored for these exact dates"
                  )}
                </p>
              </div>
              <div className="rounded-card border border-line bg-card px-3">
                {[oj.out, oj.back].map((leg, i) => (
                  <Fragment key={i}>
                    {/* Twin-city trips: overland hop between the two flights */}
                    {i === 1 && oj.ground && (
                      <div className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                          Overland
                        </span>
                        <span className="tnum font-mono text-xs text-ink-muted">
                          {oj.ground.from} ⇢ {oj.ground.to} · ~{oj.ground.hours}
                          h
                        </span>
                      </div>
                    )}
                    <a
                      href={buildGoogleFlightsOneWayUrl(
                        leg.origin,
                        leg.destination,
                        leg.date,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0 transition-colors hover:bg-paper"
                      title={`Book one-way ${leg.origin} → ${leg.destination} on Google Flights`}
                    >
                      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                        {i === 0 ? "Out" : "Back"}
                      </span>
                      <span className="tnum font-mono text-xs text-ink">
                        {leg.origin} → {leg.destination}
                        <span className="ml-2 text-ink-muted">
                          {formatDateShort(leg.date)}
                        </span>
                        <span className="ml-2">{formatPrice(leg.price)}</span>
                        <span aria-hidden="true" className="ml-1 text-ink-muted/50">
                          ↗
                        </span>
                      </span>
                    </a>
                  </Fragment>
                ))}
              </div>
            </>
          )}

          {/* ─── Airlines + sparkline ─────────────────────────────────── */}
          {!oj && (
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
          )}

          {/* ─── Itinerary legs ───────────────────────────────────────── */}
          {!oj && (
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
          )}

          {/* ─── Stay longer (open-jaw): move the back ticket later ───── */}
          {oj && ojExtensions.length > 0 && (
            <div className="rounded-card border border-line bg-card px-3">
              <p className="border-b border-line py-2 font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                Stay longer
              </p>
              {ojExtensions.map((ext) => (
                <a
                  key={ext.return_date}
                  href={buildGoogleFlightsOneWayUrl(
                    oj.back.origin,
                    oj.back.destination,
                    ext.return_date,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Book the later one-way back ticket, ${oj.back.origin} → ${oj.back.destination}`}
                  className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0 transition-colors hover:bg-paper"
                >
                  <span className="tnum font-mono text-xs text-ink">
                    → {formatDateShort(ext.return_date)}
                    <span className="ml-2 text-ink-muted">
                      {nightsLabel(ext.nights)}
                    </span>
                  </span>
                  <span className="tnum font-mono text-xs text-ink">
                    {formatPrice(ext.price)}
                    <span
                      className={`ml-2 ${
                        Math.round(ext.deltaPrice) > 0
                          ? "text-ink-muted"
                          : "font-medium text-steal"
                      }`}
                    >
                      {formatDelta(ext.deltaPrice)}
                    </span>
                  </span>
                </a>
              ))}
              <p className="py-2 font-mono text-[11px] text-ink-muted">
                New combo total — only the back ticket moves; the link books
                that one-way.
              </p>
            </div>
          )}

          {/* ─── Stretch this trip ────────────────────────────────────── */}
          {!oj && !stretchesLoading && (
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
            {!oj && (
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
            )}
            <Link
              href={cityHref}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink-muted"
            >
              More trips to {city} →
            </Link>
            <PriceDisclaimer className="pt-1 text-center">
              {oj
                ? "Snapshot one-way fares — confirm each ticket on Google Flights before booking."
                : "Snapshot fare — confirm the live price on Google Flights."}
            </PriceDisclaimer>
          </div>
        </div>
      )}
    </Sheet>
  );
}
