"use client";

import { useState, useRef, useEffect } from "react";
import { destinations } from "@/data/destinations";
import { Destination } from "@/types";

const COUNTRY_NAMES: Record<string, string> = {
  ES: "spain", PT: "portugal", IT: "italy", GR: "greece", HU: "hungary",
  CZ: "czechia czech", PL: "poland", AT: "austria", HR: "croatia",
  RS: "serbia", BG: "bulgaria", RO: "romania", DK: "denmark", SE: "sweden",
  NO: "norway", FI: "finland", IS: "iceland", IE: "ireland", GB: "uk united kingdom england",
  MA: "morocco", MT: "malta", FR: "france", DE: "germany", NL: "netherlands", BE: "belgium",
};

interface DestinationPickerProps {
  selected: string[];
  onChange: (codes: string[]) => void;
}

export default function DestinationPicker({ selected, onChange }: DestinationPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = destinations.filter((d) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      d.code.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      (COUNTRY_NAMES[d.country] ?? "").includes(q)
    );
  });

  const toggle = (dest: Destination) => {
    if (selected.includes(dest.code)) {
      onChange(selected.filter((c) => c !== dest.code));
    } else {
      onChange([...selected, dest.code]);
    }
    // Keep dropdown open and query intact so the user can keep picking
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="space-y-3">

      {/* Selected destinations — above the search so they're always visible */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((code) => {
            const dest = destinations.find((d) => d.code === code);
            return (
              <span
                key={code}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-neutral-200 bg-neutral-50 text-neutral-800"
              >
                <span>{dest?.name ?? code}</span>
                <button
                  onClick={() => onChange(selected.filter((c) => c !== code))}
                  className="text-neutral-300 hover:text-neutral-700 leading-none"
                  aria-label={`Remove ${dest?.name ?? code}`}
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            onClick={() => onChange([])}
            className="text-xs text-neutral-400 hover:text-neutral-700 px-1 py-1.5"
          >
            Clear all
          </button>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">No destinations added yet. Search below to add one.</p>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by city, country or code…"
          className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-neutral-500"
        />

        {isOpen && filtered.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 border border-neutral-200 bg-white shadow-md max-h-56 overflow-y-auto">
            {filtered.slice(0, 25).map((d) => {
              const isSelected = selected.includes(d.code);
              return (
                <button
                  key={d.code}
                  onMouseDown={(e) => { e.preventDefault(); toggle(d); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-neutral-50 ${isSelected ? "bg-blue-50" : ""}`}
                >
                  <span>
                    <span className="font-medium">{d.name}</span>
                    <span className="text-neutral-500"> – {d.country}</span>
                  </span>
                  <span className={`text-xs font-mono ml-3 shrink-0 ${isSelected ? "text-blue-500" : "text-neutral-400"}`}>
                    {isSelected ? "✓" : d.code}
                  </span>
                </button>
              );
            })}
            {filtered.length > 25 && (
              <div className="px-3 py-2 text-xs text-neutral-400 border-t border-neutral-100">
                {filtered.length - 25} more — keep typing to narrow down
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
