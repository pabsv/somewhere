"use client";

import Chip from "@/components/ui/Chip";

export type TierFilter = "all" | "steal" | "deal";

export interface CalendarFilterState {
  maxPrice: string;
  minNights: string;
  maxNights: string;
  direct: boolean;
  tier: TierFilter;
}

export const EMPTY_FILTERS: CalendarFilterState = {
  maxPrice: "",
  minNights: "",
  maxNights: "",
  direct: false,
  tier: "all",
};

interface CalendarFiltersProps {
  value: CalendarFilterState;
  onChange: (next: CalendarFilterState) => void;
  extra?: React.ReactNode;
}

const TIERS: { key: TierFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "steal", label: "Steals" },
  { key: "deal", label: "Deals" },
];

// Plain numeric input styled to the Somewhere system (the frozen Input
// primitive uses neutral-* colors that clash with paper; for a mono numeric
// field we style locally and keep the primitive for prose forms).
function NumField({
  label,
  value,
  onChange,
  width = "w-20",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  width?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`tnum rounded-tag border border-line bg-card px-2 py-1 font-mono text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none ${width}`}
      />
    </label>
  );
}

/**
 * Calendar filter row. All fields map straight onto getTrips params upstream:
 * maxPrice, minNights, maxNights, direct, tier. Empty / "all" values mean
 * "no filter" and are dropped before the fetch — except maxPrice, where an
 * empty field falls back to CALENDAR_DEFAULT_MAX_PRICE upstream (type a
 * bigger number to see pricier trips).
 */
export default function CalendarFilters({
  value,
  onChange,
  extra,
}: CalendarFiltersProps) {
  const set = <K extends keyof CalendarFilterState>(
    key: K,
    v: CalendarFilterState[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card border border-line bg-card px-4 py-3 shadow-card">
      <NumField
        label="Max €"
        value={value.maxPrice}
        onChange={(v) => set("maxPrice", v)}
        width="w-24"
        placeholder="200"
      />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-ink-muted">Nights</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.minNights}
          placeholder="min"
          onChange={(e) => set("minNights", e.target.value)}
          className="tnum w-16 rounded-tag border border-line bg-card px-2 py-1 font-mono text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
        />
        <span className="text-ink-muted/60">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={value.maxNights}
          placeholder="max"
          onChange={(e) => set("maxNights", e.target.value)}
          className="tnum w-16 rounded-tag border border-line bg-card px-2 py-1 font-mono text-sm text-ink placeholder:text-ink-muted/50 focus:border-ink-muted focus:outline-none"
        />
      </div>

      <Chip
        size="sm"
        selected={value.direct}
        onClick={() => set("direct", !value.direct)}
      >
        Direct only
      </Chip>

      <div className="flex items-center gap-1.5">
        {TIERS.map((t) => (
          <Chip
            key={t.key}
            size="sm"
            selected={value.tier === t.key}
            onClick={() => set("tier", t.key)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {extra}
    </div>
  );
}
