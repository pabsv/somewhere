"use client";

import { useState } from "react";
import { destinations, regions, getDestinationsByRegion } from "@/data/destinations";
import Chip from "@/components/ui/Chip";

interface DestinationPickerProps {
  selected: string[];
  onChange: (codes: string[]) => void;
}

export default function DestinationPicker({
  selected,
  onChange,
}: DestinationPickerProps) {
  const [search, setSearch] = useState("");

  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const selectRegion = (region: string) => {
    const regionCodes = getDestinationsByRegion(region).map((d) => d.code);
    const allSelected = regionCodes.every((c) => selected.includes(c));
    if (allSelected) {
      onChange(selected.filter((c) => !regionCodes.includes(c)));
    } else {
      onChange([...new Set([...selected, ...regionCodes])]);
    }
  };

  const clearAll = () => onChange([]);

  const filteredDestinations = search
    ? destinations.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          d.code.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">
          {selected.length} selected
        </span>
        {selected.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search destinations..."
        className="w-full px-3 py-2 border border-neutral-300 text-sm"
      />

      {/* Search results */}
      {filteredDestinations && (
        <div className="flex flex-wrap gap-2 pb-4 border-b border-neutral-200">
          {filteredDestinations.length === 0 ? (
            <span className="text-sm text-neutral-500">No results</span>
          ) : (
            filteredDestinations.map((d) => (
              <Chip
                key={d.code}
                selected={selected.includes(d.code)}
                onClick={() => toggle(d.code)}
                size="sm"
              >
                {d.name}
              </Chip>
            ))
          )}
        </div>
      )}

      {/* Regions */}
      {!search && (
        <div className="space-y-4">
          {regions.map((region) => {
            const regionDests = getDestinationsByRegion(region);
            const allSelected = regionDests.every((d) =>
              selected.includes(d.code)
            );

            return (
              <div key={region}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                    {region}
                  </span>
                  <button
                    onClick={() => selectRegion(region)}
                    className="text-xs text-neutral-400 hover:text-neutral-700"
                  >
                    {allSelected ? "clear" : "all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {regionDests.map((d) => (
                    <Chip
                      key={d.code}
                      selected={selected.includes(d.code)}
                      onClick={() => toggle(d.code)}
                      size="sm"
                    >
                      {d.name}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
