"use client";

import { CALENDAR_DEFAULT_MAX_PRICE } from "@/lib/score";
import { useState } from "react";

// Slider bounds. Price at PRICE_MAX and nights at the outer bounds mean
// "no filter" — the page drops those values before the fetch.
export const PRICE_MIN = 30;
export const PRICE_MAX = 400;
export const NIGHTS_MIN = 1;
export const NIGHTS_MAX = 21;

export interface CalendarFilterState {
  /** max round-trip price in EUR (slider) */
  maxPrice: number;
  /** min nights (dual slider, lower thumb) */
  minNights: number;
  /** max nights (dual slider, upper thumb) */
  maxNights: number;
}

export const EMPTY_FILTERS: CalendarFilterState = {
  maxPrice: CALENDAR_DEFAULT_MAX_PRICE,
  minNights: NIGHTS_MIN,
  maxNights: NIGHTS_MAX,
};

interface CalendarFiltersProps {
  value: CalendarFilterState;
  onChange: (next: CalendarFilterState) => void;
  extra?: React.ReactNode;
}

const thumbCls =
  "pointer-events-none absolute inset-x-0 top-1/2 h-0 w-full -translate-y-1/2 appearance-none bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-line [&::-webkit-slider-thumb]:bg-card " +
  "[&::-webkit-slider-thumb]:shadow-card [&::-webkit-slider-thumb]:cursor-pointer " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 " +
  "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-line " +
  "[&::-moz-range-thumb]:bg-card [&::-moz-range-thumb]:cursor-pointer";

/** Single-thumb slider with a filled track up to the thumb. */
function PriceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;
  const formatValue = (price: number) =>
    price >= PRICE_MAX ? "any" : String(price);
  const [draft, setDraft] = useState<string | null>(null);
  const displayedValue = draft ?? formatValue(value);

  function commitDraft(input: string) {
    const raw = input.trim().toLowerCase();
    if (raw === "" || raw === "any") {
      onChange(PRICE_MAX);
      setDraft(null);
      return;
    }

    const parsed = Number(raw.replace(/[€\s]/g, ""));
    if (!Number.isFinite(parsed)) {
      setDraft(null);
      return;
    }

    const next = Math.min(PRICE_MAX, Math.max(PRICE_MIN, Math.round(parsed)));
    onChange(next);
    setDraft(null);
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs font-medium text-ink-muted">
        Max
      </span>
      <div className="relative h-4 flex-1 sm:w-36 sm:flex-none">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line">
          <div
            className="h-full rounded-full bg-ink-muted"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={10}
          value={value}
          aria-label="Max price (EUR)"
          onChange={(e) => onChange(Number(e.target.value))}
          className={thumbCls}
        />
      </div>
      <div className="relative w-14 shrink-0">
        {displayedValue.toLowerCase() !== "any" && displayedValue !== "" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-muted"
          >
            €
          </span>
        ) : null}
        <input
          type="text"
          inputMode="numeric"
          value={displayedValue}
          aria-label="Maximum price in euros"
          title={`Enter €${PRICE_MIN}–€${PRICE_MAX - 1}, or leave blank for any price`}
          onFocus={(e) => {
            if (displayedValue === "any") setDraft("");
            else e.currentTarget.select();
          }}
          onChange={(e) => {
            const nextDraft = e.target.value.replace(/[^0-9]/g, "");
            setDraft(nextDraft);
            const next = Number(nextDraft);
            if (nextDraft !== "" && next >= PRICE_MIN && next <= PRICE_MAX) {
              onChange(next);
            }
          }}
          onBlur={(e) => commitDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={`tnum w-full rounded-md border border-transparent bg-transparent py-1 text-right font-mono text-sm text-ink outline-none transition-colors hover:border-line focus:border-ink-muted focus:bg-card ${
            displayedValue.toLowerCase() !== "any" && displayedValue !== "" ? "pl-4 pr-1" : "px-1"
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Dual-thumb nights slider — two overlaid native range inputs; the filled
 * segment spans [min, max]. Thumbs can't cross (each clamps at the other).
 */
function NightsSlider({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const span = NIGHTS_MAX - NIGHTS_MIN;
  const loPct = ((min - NIGHTS_MIN) / span) * 100;
  const hiPct = ((max - NIGHTS_MIN) / span) * 100;
  const label =
    min === NIGHTS_MIN && max === NIGHTS_MAX
      ? "any"
      : `${min}–${max === NIGHTS_MAX ? `${NIGHTS_MAX}+` : max}`;
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs font-medium text-ink-muted">
        Nights
      </span>
      <div className="relative h-4 flex-1 sm:w-36 sm:flex-none">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line">
          <div
            className="absolute h-full rounded-full bg-ink-muted"
            style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
          />
        </div>
        <input
          type="range"
          min={NIGHTS_MIN}
          max={NIGHTS_MAX}
          step={1}
          value={min}
          aria-label="Min nights"
          onChange={(e) =>
            onChange(Math.min(Number(e.target.value), max), max)
          }
          className={thumbCls}
        />
        <input
          type="range"
          min={NIGHTS_MIN}
          max={NIGHTS_MAX}
          step={1}
          value={max}
          aria-label="Max nights"
          onChange={(e) =>
            onChange(min, Math.max(Number(e.target.value), min))
          }
          className={thumbCls}
        />
      </div>
      <span className="tnum w-12 shrink-0 text-right font-mono text-sm text-ink sm:text-left">
        {label}
      </span>
    </div>
  );
}

/**
 * Calendar filter row: price slider, dual nights slider, plus whatever chips
 * the page passes in `extra`.
 * Price at PRICE_MAX and nights at the outer bounds mean "no filter" — the
 * page maps those to undefined before the fetch (otherwise the price slider
 * value IS the cap, defaulting to CALENDAR_DEFAULT_MAX_PRICE).
 */
export default function CalendarFilters({
  value,
  onChange,
  extra,
}: CalendarFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-card sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
      <PriceSlider
        value={value.maxPrice}
        onChange={(v) => onChange({ ...value, maxPrice: v })}
      />

      <NightsSlider
        min={value.minNights}
        max={value.maxNights}
        onChange={(minNights, maxNights) =>
          onChange({ ...value, minNights, maxNights })
        }
      />

      {/* Chips group so they wrap as a block on phones instead of trailing
          the sliders one per line. Dropped entirely when there are no chips so
          the row doesn't carry an empty flex gap. */}
      {extra ? (
        <div className="flex flex-wrap items-center gap-2">{extra}</div>
      ) : null}
    </div>
  );
}
