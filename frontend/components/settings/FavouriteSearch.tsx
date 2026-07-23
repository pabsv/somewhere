"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import CountryFlag from "@/components/ui/CountryFlag";
import type { Destination } from "@/data/destinations.gen";
import { countryName } from "@/components/explore/countries";

type CountryResult = {
  kind: "country";
  code: string;
  name: string;
  cities: Destination[];
};

type CityResult = {
  kind: "city";
  city: Destination;
  /** Set when the city is being shown because its country matched the query. */
  groupedUnder?: string;
};

type Result = CountryResult | CityResult;

interface FavouriteSearchProps {
  cities: Destination[];
  saved: ReadonlySet<string>;
  onCityToggle: (city: Destination, groupedUnder?: string) => void;
  onCountryToggle: (
    country: string,
    cities: readonly string[],
    active: boolean,
  ) => void;
  onSearchFocus?: () => void;
}

/**
 * Multi-select search for favourites. Unlike Explore's filtering combobox, a
 * choice never replaces the query or closes the menu: searching "Spain" keeps
 * Spain in the field while the user selects any mix of its airports.
 */
export default function FavouriteSearch({
  cities,
  saved,
  onCityToggle,
  onCountryToggle,
  onSearchFocus,
}: FavouriteSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const countries = useMemo(() => {
    const byCountry = new Map<string, Destination[]>();
    for (const city of cities) {
      const existing = byCountry.get(city.country) ?? [];
      existing.push(city);
      byCountry.set(city.country, existing);
    }
    return [...byCountry.entries()]
      .map(([code, countryCities]) => ({
        code,
        name: countryName(code),
        cities: countryCities.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cities]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];

    const matchingCountries = countries
      .filter(
        (country) =>
          country.name.toLocaleLowerCase().includes(q) ||
          country.code.toLocaleLowerCase() === q,
      )
      .sort((a, b) => {
        const aExact = a.name.toLocaleLowerCase() === q ? 0 : 1;
        const bExact = b.name.toLocaleLowerCase() === q ? 0 : 1;
        return aExact - bExact || a.name.localeCompare(b.name);
      });

    const countryResults: CountryResult[] = matchingCountries.map(
      (country) => ({ kind: "country", ...country }),
    );
    const countryCodes = new Set(matchingCountries.map((country) => country.code));
    const groupedCities: CityResult[] = matchingCountries.flatMap((country) =>
      country.cities.map((city) => ({
        kind: "city" as const,
        city,
        groupedUnder: country.code,
      })),
    );
    const groupedCityCodes = new Set(groupedCities.map((result) => result.city.code));
    const directCities: CityResult[] = cities
      .filter(
        (city) =>
          !groupedCityCodes.has(city.code) &&
          (city.name.toLocaleLowerCase().includes(q) ||
            city.code.toLocaleLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, countryCodes.size > 0 ? 8 : 16)
      .map((city) => ({ kind: "city", city }));

    return [...countryResults, ...groupedCities, ...directCities];
  }, [cities, countries, query]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function choose(result: Result) {
    if (result.kind === "country") {
      const codes = result.cities.map((city) => city.code);
      const complete = codes.every((code) => saved.has(code));
      onCountryToggle(
        result.code,
        codes,
        !complete,
      );
    } else {
      onCityToggle(result.city, result.groupedUnder);
    }
    // Preserve both the typed country and the open result set for multi-select.
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && open && results[active]) {
      event.preventDefault();
      choose(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted/60"
        >
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={
            open && results[active] ? `${listId}-${active}` : undefined
          }
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            onSearchFocus?.();
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Add a city or country…"
          aria-label="Add a favourite city or country"
          className="w-full rounded-tag border border-line bg-card py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink-muted/60 focus:border-ink-muted focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onSearchFocus?.();
              setQuery("");
              setOpen(false);
              setActive(0);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-muted transition-colors hover:text-ink"
          >
            <RemoveIcon />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div
          id={listId}
          role="listbox"
          aria-label="Favourite destination results"
          className="absolute z-30 mt-2 max-h-[min(28rem,60vh)] w-full overflow-y-auto overscroll-contain rounded-card border border-line bg-card py-1 shadow-card"
        >
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-muted">
              No cities or countries match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            results.map((result, index) => {
              const previous = results[index - 1];
              const showCountryHeading =
                result.kind === "country" && previous?.kind !== "country";
              const showCityHeading =
                result.kind === "city" &&
                (previous?.kind !== "city" ||
                  previous.groupedUnder !== result.groupedUnder);

              if (result.kind === "country") {
                const selectedCount = result.cities.filter((city) =>
                  saved.has(city.code),
                ).length;
                const complete = selectedCount === result.cities.length;
                return (
                  <div key={`country-${result.code}`} role="presentation">
                    {showCountryHeading && <ResultHeading>Countries</ResultHeading>}
                    <button
                      id={`${listId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={complete}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(result)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        index === active ? "bg-line/60" : "hover:bg-line/40"
                      }`}
                    >
                      <CountryFlag code={result.code} />
                      <span className="min-w-0 flex-1 font-medium text-ink">
                        {result.name}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                        {complete
                          ? "All selected"
                          : `${selectedCount}/${result.cities.length} selected`}
                      </span>
                      <SelectionMark selected={complete} />
                    </button>
                  </div>
                );
              }

              const selected = saved.has(result.city.code);
              return (
                <div key={`city-${result.city.code}`} role="presentation">
                  {showCityHeading && (
                    <ResultHeading>
                      {result.groupedUnder
                        ? `Cities in ${countryName(result.groupedUnder)}`
                        : "Cities"}
                    </ResultHeading>
                  )}
                  <button
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(result)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      index === active ? "bg-line/60" : "hover:bg-line/40"
                    }`}
                  >
                    <CountryFlag code={result.city.country} />
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {result.city.name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-muted">
                      {result.city.code}
                    </span>
                    <SelectionMark selected={selected} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function ResultHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted/60">
      {children}
    </div>
  );
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
        selected
          ? "border-fav bg-fav text-white"
          : "border-line bg-card text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m20 20-3.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
