"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FavouriteSearch from "@/components/settings/FavouriteSearch";
import CountryFlag from "@/components/ui/CountryFlag";
import { countryName } from "@/components/explore/countries";
import {
  DESTINATIONS,
  getDestination,
  type Destination,
} from "@/data/destinations.gen";
import { useSavedCities } from "@/lib/saved-cities";

interface CountryOption {
  code: string;
  name: string;
  cities: Destination[];
}

const COUNTRIES: CountryOption[] = [
  ...new Set(DESTINATIONS.map((destination) => destination.country)),
]
  .map((code) => ({
    code,
    name: countryName(code),
    cities: DESTINATIONS.filter(
      (destination) => destination.country === code,
    ).sort((a, b) => a.name.localeCompare(b.name)),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function FavouritesCard() {
  const {
    saved,
    countryGroups,
    isSaved,
    toggle,
    setMany,
    setCountryGroup,
    toggleGroupedCity,
    ready,
    signedIn,
  } = useSavedCities();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const expandedRef = useRef(expanded);
  const savedRef = useRef(saved);
  const setCountryGroupRef = useRef(setCountryGroup);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    expandedRef.current = expanded;
    savedRef.current = saved;
    setCountryGroupRef.current = setCountryGroup;
  }, [expanded, saved, setCountryGroup]);

  // Fully selected legacy countries (saved before saved_countries existed) are
  // still collapsed. The first edit persists their explicit country container.
  const groupedCountries = useMemo(
    () =>
      COUNTRIES.filter(
        (country) =>
          countryGroups.has(country.code) ||
          country.cities.every((city) => saved.has(city.code)),
      ),
    [countryGroups, saved],
  );
  const coveredByCountries = useMemo(
    () =>
      new Set(
        groupedCountries.flatMap((country) =>
          country.cities.map((city) => city.code),
        ),
      ),
    [groupedCountries],
  );
  const cityPills = [...saved]
    .filter((code) => !coveredByCountries.has(code))
    .map((code) => ({ code, name: getDestination(code)?.name ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  function removeCountryIfEmpty(code: string) {
    const country = COUNTRIES.find((option) => option.code === code);
    if (!country || country.cities.some((city) => saved.has(city.code))) return;
    setCountryGroup(
      country.code,
      country.cities.map((city) => city.code),
      false,
    );
  }

  function closeCountryEditors() {
    for (const code of expanded) removeCountryIfEmpty(code);
    setExpanded(new Set());
  }

  useEffect(() => {
    if (expanded.size === 0) return;

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      const openEditor = cardRef.current?.querySelector(
        `[data-country-editor="${[...expandedRef.current][0]}"]`,
      );
      if (openEditor?.contains(target)) return;

      for (const code of expandedRef.current) {
        const country = COUNTRIES.find((option) => option.code === code);
        if (
          country &&
          !country.cities.some((city) => savedRef.current.has(city.code))
        ) {
          setCountryGroupRef.current(
            country.code,
            country.cities.map((city) => city.code),
            false,
          );
        }
      }
      setExpanded(new Set());
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [expanded.size]);

  function toggleCountryEditor(code: string) {
    if (expanded.has(code)) {
      removeCountryIfEmpty(code);
      setExpanded(new Set());
      return;
    }
    for (const openCode of expanded) removeCountryIfEmpty(openCode);
    setExpanded(new Set([code]));
  }

  function selectCity(city: Destination, groupedUnder?: string) {
    if (!groupedUnder) {
      toggle(city.code);
      return;
    }

    toggleGroupedCity(groupedUnder, city.code);
  }

  // If onboarding advances while an empty editor is still open, discard that
  // empty country just as closing the popover would. The provider lives above
  // the step, so the cleanup can still persist the final state.
  useEffect(
    () => () => {
      for (const code of expandedRef.current) {
        const country = COUNTRIES.find((option) => option.code === code);
        if (
          country &&
          !country.cities.some((city) => savedRef.current.has(city.code))
        ) {
          setCountryGroupRef.current(
            country.code,
            country.cities.map((city) => city.code),
            false,
          );
        }
      }
    },
    [],
  );

  if (!ready) {
    return (
      <div aria-hidden="true" className="space-y-3">
        <div className="h-10 w-full max-w-md animate-pulse rounded-(--radius-tag) bg-line" />
        <div className="h-9 w-64 animate-pulse rounded-(--radius-tag) bg-line" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <p className="text-sm text-ink-muted">
        Sign in to pick favourite destinations.
      </p>
    );
  }

  return (
    <div ref={cardRef} className="space-y-4">
      <div className="max-w-md">
        <FavouriteSearch
          cities={DESTINATIONS}
          saved={saved}
          onCityToggle={selectCity}
          onCountryToggle={setCountryGroup}
          onSearchFocus={closeCountryEditors}
        />
      </div>

      {groupedCountries.length > 0 || cityPills.length > 0 ? (
        <ul className="flex flex-wrap items-start gap-2.5">
          {groupedCountries.map((country) => {
            const selectedCount = country.cities.filter((city) =>
              saved.has(city.code),
            ).length;
            const percentage = Math.round(
              (selectedCount / country.cities.length) * 100,
            );
            const isExpanded = expanded.has(country.code);
            const panelId = `country-favourites-${country.code}`;

            return (
              <li
                key={country.code}
                data-country-editor={country.code}
                className="relative"
              >
                <div
                  className="inline-flex overflow-hidden rounded-full border border-fav/55 text-sm font-medium text-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-fav)_10%,transparent)]"
                  style={{
                    background: `linear-gradient(90deg, color-mix(in srgb, var(--color-fav) 16%, var(--color-card)) 0 ${percentage}%, var(--color-card) ${percentage}% 100%)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleCountryEditor(country.code)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="inline-flex items-center gap-2 py-1.5 pl-3 pr-2 transition-colors hover:bg-fav/10"
                  >
                    <span aria-hidden="true" className="text-fav">
                      ★
                    </span>
                    <CountryFlag code={country.code} />
                    <span>{country.name}</span>
                    <span className="font-mono text-[10px] font-normal text-ink-muted">
                      {selectedCount}/{country.cities.length}
                    </span>
                    <ChevronIcon open={isExpanded} />
                    <span className="sr-only">
                      {percentage}% of airports selected
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCountryGroup(
                        country.code,
                        country.cities.map((city) => city.code),
                        false,
                      );
                      setExpanded((current) => {
                        const next = new Set(current);
                        next.delete(country.code);
                        return next;
                      });
                    }}
                    aria-label={`Remove ${country.name} from favourites`}
                    className="inline-flex w-8 items-center justify-center border-l border-fav/20 text-ink-muted transition-colors hover:bg-fav/15 hover:text-ink"
                  >
                    <RemoveIcon />
                  </button>
                </div>

                {isExpanded && (
                  <div
                    id={panelId}
                    className="absolute left-0 z-20 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-card border border-line bg-card p-2 shadow-card"
                  >
                    <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-1">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          Airports in {country.name}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {selectedCount} of {country.cities.length} selected
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const codes = country.cities.map((city) => city.code);
                          if (selectedCount === country.cities.length) {
                            // Clear the airports without closing/removing the
                            // country while the user is still editing it.
                            setMany(codes, false);
                          } else {
                            setCountryGroup(country.code, codes, true);
                          }
                        }}
                        className="shrink-0 text-xs font-medium text-fav hover:underline"
                      >
                        {selectedCount === country.cities.length
                          ? "Deselect all"
                          : "Select all"}
                      </button>
                    </div>
                    <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
                      {country.cities.map((city) => {
                        const selected = isSaved(city.code);
                        return (
                          <li key={city.code}>
                            <button
                              type="button"
                              onClick={() => selectCity(city, country.code)}
                              aria-pressed={selected}
                              className={`flex w-full items-center gap-2 rounded-tag px-2 py-2 text-left text-sm transition-colors ${
                                selected
                                  ? "bg-fav/10 text-ink"
                                  : "text-ink-muted hover:bg-line/45 hover:text-ink"
                              }`}
                            >
                              <SelectionMark selected={selected} />
                              <span className="min-w-0 flex-1 truncate">
                                {city.name}
                              </span>
                              <span className="shrink-0 font-mono text-[10px] text-ink-muted/75">
                                {city.code}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}

          {cityPills.map((city) => (
            <li key={city.code}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-1.5 pl-3 pr-1.5 text-sm text-ink">
                {city.name}
                <button
                  type="button"
                  onClick={() => toggle(city.code)}
                  aria-label={`Remove ${city.name} from favourites`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-line/60 hover:text-ink"
                >
                  <RemoveIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted/80">
          No favourites yet — search for a city or country above.
        </p>
      )}
    </div>
  );
}

function SelectionMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
        selected
          ? "border-fav bg-fav text-white"
          : "border-line bg-card text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="m3 4.5 3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
