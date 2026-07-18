"use client";

import Chip from "@/components/ui/Chip";
import { CALENDAR_DEFAULT_MAX_PRICE } from "@/lib/score";

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
  direct: boolean;
}

export const EMPTY_FILTERS: CalendarFilterState = {
  maxPrice: CALENDAR_DEFAULT_MAX_PRICE,
  minNights: NIGHTS_MIN,
  maxNights: NIGHTS_MAX,
  direct: false,
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
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-ink-muted">Max</span>
      <div className="relative h-4 w-36">
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
      <span className="tnum w-12 font-mono text-sm text-ink">
        {value >= PRICE_MAX ? "any" : `€${value}`}
      </span>
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
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-ink-muted">Nights</span>
      <div className="relative h-4 w-36">
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
      <span className="tnum w-12 font-mono text-sm text-ink">{label}</span>
    </div>
  );
}

/**
 * Calendar filter row: price slider, dual nights slider, Direct only chip.
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
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-line bg-card px-4 py-3 shadow-card">
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

      <Chip
        size="sm"
        selected={value.direct}
        onClick={() => onChange({ ...value, direct: !value.direct })}
      >
        Direct only
      </Chip>

      {extra}
    </div>
  );
}
