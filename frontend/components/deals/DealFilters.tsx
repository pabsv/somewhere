"use client";

import { DealFilters as FilterState } from "@/types";
import { airports } from "@/data/airports";
import { destinations } from "@/data/destinations";

interface DealFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  resultCount: number;
  totalCount: number;
}

export default function DealFilters({
  filters,
  onChange,
  resultCount,
  totalCount,
}: DealFiltersProps) {
  const update = (partial: Partial<FilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const clearAll = () => {
    onChange({
      origin: null,
      destination: null,
      max_price: null,
      direct_only: false,
      date_from: null,
      date_to: null,
    });
  };

  const hasFilters =
    filters.origin ||
    filters.destination ||
    filters.max_price ||
    filters.direct_only ||
    filters.date_from ||
    filters.date_to;

  return (
    <div className="flex items-center gap-4 flex-wrap text-sm">
      {/* Origin */}
      <select
        value={filters.origin || ""}
        onChange={(e) => update({ origin: e.target.value || null })}
        className="px-2 py-1.5 border border-neutral-300 bg-white text-neutral-900"
      >
        <option value="">Any origin</option>
        {airports.slice(0, 5).map((a) => (
          <option key={a.code} value={a.code}>
            {a.code}
          </option>
        ))}
      </select>

      {/* Destination */}
      <select
        value={filters.destination || ""}
        onChange={(e) => update({ destination: e.target.value || null })}
        className="px-2 py-1.5 border border-neutral-300 bg-white text-neutral-900"
      >
        <option value="">Any destination</option>
        {destinations.map((d) => (
          <option key={d.code} value={d.code}>
            {d.name}
          </option>
        ))}
      </select>

      {/* Max price */}
      <div className="flex items-center gap-1">
        <span className="text-neutral-500">Max €</span>
        <input
          type="number"
          value={filters.max_price || ""}
          onChange={(e) =>
            update({ max_price: e.target.value ? parseInt(e.target.value) : null })
          }
          placeholder="—"
          className="w-16 px-2 py-1.5 border border-neutral-300 bg-white"
        />
      </div>

      {/* Direct only */}
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={filters.direct_only}
          onChange={(e) => update({ direct_only: e.target.checked })}
          className="w-3.5 h-3.5"
        />
        <span className="text-neutral-700">Direct</span>
      </label>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-neutral-500 hover:text-neutral-900"
        >
          Clear
        </button>
      )}

      {/* Count */}
      <span className="ml-auto text-neutral-500">
        {resultCount} of {totalCount}
      </span>
    </div>
  );
}
