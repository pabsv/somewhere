"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { REGIONS } from "@/data/destinations.gen";
import { countryName } from "./countries";

// ─── Selection model ─────────────────────────────────────────────────────────
// The combobox lets you narrow the grid by one of four things. `text` is the
// live free-type fallback (matches name/code/country); the other three are
// concrete picks chosen from the dropdown.
export type SearchSelection =
  | { kind: "region"; value: string; label: string }
  | { kind: "country"; value: string; label: string }
  | { kind: "city"; value: string; label: string }
  | { kind: "text"; value: string; label: string };

interface Suggestion {
  kind: "city" | "country" | "region";
  value: string;
  label: string;
  /** secondary line, e.g. country for a city */
  hint?: string;
}

const KIND_LABEL: Record<Suggestion["kind"], string> = {
  city: "City",
  country: "Country",
  region: "Region",
};

/**
 * Minimal shape the combobox needs off each option. `CitySummary` is a superset,
 * so Explore passes its loaded cities unchanged; Settings passes the static
 * DESTINATIONS catalog (cities with no current fares included).
 */
export interface SearchableCity {
  code: string;
  name: string;
  country: string;
  region: string;
}

interface SearchComboboxProps {
  /** Suggestion source. Explore: loaded deals. Settings: full catalog. */
  cities: SearchableCity[];
  selection: SearchSelection | null;
  onSelect: (selection: SearchSelection | null) => void;
  /** Placeholder override (default: "Search a city, country or region…"). */
  placeholder?: string;
}

/**
 * One search field replacing the old text input + region chip row. Type to
 * filter; pick a City, Country, or Region from the dropdown. Empty + focused
 * shows every region as a browse list. Keyboard: ↑/↓ move, Enter picks,
 * Esc closes.
 *
 * The visible text is derived from `selection` (no local mirror), so an
 * external clear — e.g. "Clear search" — empties the field for free.
 */
export default function SearchCombobox({
  cities,
  selection,
  onSelect,
  placeholder = "Search a city, country or region…",
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const text = selection?.label ?? "";

  // ─── Facets derived from real data ─────────────────────────────────────────
  const regions = useMemo(() => {
    const present = new Set(cities.map((c) => c.region));
    return REGIONS.filter((r) => present.has(r));
  }, [cities]);

  const countries = useMemo(() => {
    const present = new Set(cities.map((c) => c.country));
    return [...present]
      .map((code) => ({ code, name: countryName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cities]);

  // ─── Suggestions for the current text ──────────────────────────────────────
  const suggestions = useMemo<Suggestion[]>(() => {
    const q = text.trim().toLowerCase();

    if (!q) {
      // Browse mode: surface every region as a quick pick.
      return regions.map((r) => ({ kind: "region", value: r, label: r }));
    }

    const cityHits: Suggestion[] = cities
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((c) => ({
        kind: "city",
        value: c.code,
        label: c.name,
        hint: `${countryName(c.country)} · ${c.code}`,
      }));

    const countryHits: Suggestion[] = countries
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map((c) => ({ kind: "country", value: c.code, label: c.name }));

    const regionHits: Suggestion[] = regions
      .filter((r) => r.toLowerCase().includes(q))
      .map((r) => ({ kind: "region", value: r, label: r }));

    return [...cityHits, ...countryHits, ...regionHits];
  }, [text, cities, countries, regions]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function choose(s: Suggestion) {
    onSelect({ kind: s.kind, value: s.value, label: s.label });
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    setActive(0);
    setOpen(false);
  }

  function onChange(v: string) {
    setActive(0);
    setOpen(true);
    onSelect(v ? { kind: "text", value: v, label: v } : null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && suggestions[active]) {
        e.preventDefault();
        choose(suggestions[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        {/* search glyph */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted/60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          autoComplete="off"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search destinations"
          className="w-full rounded-tag border border-line bg-card py-2 pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted/60 focus:border-ink-muted focus:outline-none"
        />

        {text && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-muted transition-colors hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-card border border-line bg-card py-1 shadow-card"
        >
          {suggestions.map((s, i) => {
            const prev = suggestions[i - 1];
            const showHeader = !prev || prev.kind !== s.kind;
            return (
              <li key={`${s.kind}-${s.value}`} role="presentation">
                {showHeader && (
                  <div className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted/60">
                    {KIND_LABEL[s.kind]}
                  </div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(s)}
                  className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                    i === active ? "bg-line/60 text-ink" : "text-ink"
                  }`}
                >
                  <span className="truncate">{s.label}</span>
                  {s.hint && (
                    <span className="tnum shrink-0 font-mono text-xs text-ink-muted/70">
                      {s.hint}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
