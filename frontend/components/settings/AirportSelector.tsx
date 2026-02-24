"use client";

import { useState, useRef, useEffect } from "react";
import { airports } from "@/data/airports";
import { Airport } from "@/types";

const COUNTRY_NAMES: Record<string, string> = {
  NL: "netherlands", BE: "belgium", DE: "germany",
};

interface AirportSelectorProps {
  homeAirport: string;
  nearbyAirports: string[];
  onHomeChange: (code: string) => void;
  onNearbyChange: (codes: string[]) => void;
}

export default function AirportSelector({
  homeAirport,
  nearbyAirports,
  onHomeChange,
  onNearbyChange,
}: AirportSelectorProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const allSelected = [homeAirport, ...nearbyAirports].filter(Boolean);

  const filtered = airports.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q) ||
      (COUNTRY_NAMES[a.country] ?? "").includes(q)
    );
  });

  const toggle = (airport: Airport) => {
    const { code } = airport;
    if (code === homeAirport) {
      // Remove home → promote first nearby, or clear
      if (nearbyAirports.length > 0) {
        const [newHome, ...rest] = nearbyAirports;
        onHomeChange(newHome);
        onNearbyChange(rest);
      } else {
        onHomeChange("");
      }
    } else if (nearbyAirports.includes(code)) {
      onNearbyChange(nearbyAirports.filter((c) => c !== code));
    } else {
      // Add — first airport becomes home, rest are nearby
      if (!homeAirport) {
        onHomeChange(code);
      } else {
        onNearbyChange([...nearbyAirports, code]);
      }
    }
    setQuery("");
  };

  // Close dropdown on outside click
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
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search by airport, city or country…"
          className="w-full px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:border-neutral-500"
        />

        {isOpen && filtered.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 border border-neutral-200 bg-white shadow-md max-h-52 overflow-y-auto">
            {filtered.map((a) => {
              const isHome = a.code === homeAirport;
              const isNearby = nearbyAirports.includes(a.code);
              const isSelected = isHome || isNearby;
              return (
                <button
                  key={a.code}
                  onMouseDown={(e) => { e.preventDefault(); toggle(a); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-neutral-50 ${isSelected ? "bg-blue-50" : ""}`}
                >
                  <span>
                    <span className="font-medium">{a.code}</span>
                    <span className="text-neutral-500"> – {a.city}, {a.name}</span>
                  </span>
                  {isSelected && (
                    <span className="text-xs text-blue-500 ml-3 shrink-0">
                      {isHome ? "home ×" : "nearby ×"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected chips */}
      {allSelected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allSelected.map((code) => {
            const airport = airports.find((a) => a.code === code);
            const isHome = code === homeAirport;
            return (
              <span
                key={code}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full ${
                  isHome
                    ? "bg-blue-100 text-blue-800"
                    : "bg-neutral-100 text-neutral-700"
                }`}
              >
                <span className="font-medium">{code}</span>
                {isHome && <span className="text-blue-400">home</span>}
                <button
                  onClick={() => airport && toggle(airport)}
                  className="text-neutral-400 hover:text-neutral-700 leading-none ml-0.5"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
