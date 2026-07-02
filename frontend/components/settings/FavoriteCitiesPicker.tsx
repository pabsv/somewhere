"use client";

// ─── FavoriteCitiesPicker — choose "interest" cities in Settings ─────────────
// The settings-side twin of the Explore ★: search the full destination
// catalogue (not just cities with live deals) and star the ones you want to
// keep a closer eye on. Backed by the shared SavedCitiesProvider, so a star
// added here shows up on Explore and vice-versa — one source of truth.

import { useEffect, useMemo, useRef, useState } from "react";
import { DESTINATIONS, type Destination } from "@/data/destinations.gen";
import { countryName } from "@/components/explore/countries";
import { useSavedCities } from "@/lib/saved-cities";

const BY_CODE = new Map<string, Destination>(
  DESTINATIONS.map((d) => [d.code, d]),
);

const MAX_SUGGESTIONS = 8;

function StarGlyph({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 17.27l-5.36 3.28 1.42-6.1L3 9.74l6.24-.53L12 3.5l2.76 5.71 6.24.53-5.06 4.71 1.42 6.1z" />
    </svg>
  );
}

export default function FavoriteCitiesPicker() {
  const { saved, toggle, signedIn } = useSavedCities();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Suggestions over the whole catalogue: match name / IATA / country.
  const suggestions = useMemo<Destination[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        countryName(d.country).toLowerCase().includes(q),
    ).slice(0, MAX_SUGGESTIONS);
  }, [query]);

  // Current favourites, resolved to catalogue entries and sorted by name.
  const savedList = useMemo<Destination[]>(() => {
    return [...saved]
      .map(
        (code) =>
          BY_CODE.get(code) ?? {
            code,
            name: code,
            country: "",
            region: "",
            tier: "C" as const,
          },
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [saved]);

  // Close the dropdown on an outside click.
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

  // Toggle but keep the field open + query intact, so several cities can be
  // starred from one search without re-typing.
  function pick(code: string) {
    toggle(code);
    setOpen(true);
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
        pick(suggestions[active].code);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!signedIn) return null;

  return (
    <div>
      <div className="mb-2">
        <h3 className="font-mono text-xs uppercase tracking-wide text-ink-muted">
          Favourite cities
        </h3>
        <p className="mt-0.5 text-sm text-ink-muted/80">
          Cities you want to keep a closer eye on — synced with the ★ on
          Explore.
        </p>
      </div>

      {/* search */}
      <div ref={rootRef} className="relative max-w-md">
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
          aria-controls="favorite-suggestions"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Add a city…"
          aria-label="Search cities to add to favourites"
          className="w-full rounded-tag border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/60 focus:border-ink-muted focus:outline-none"
        />

        {open && suggestions.length > 0 && (
          <ul
            id="favorite-suggestions"
            role="listbox"
            className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-card border border-line bg-card py-1 shadow-card"
          >
            {suggestions.map((d, i) => {
              const isSaved = saved.has(d.code);
              return (
                <li key={d.code} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(d.code)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                      i === active ? "bg-line/60 text-ink" : "text-ink"
                    }`}
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="truncate">{d.name}</span>
                      <span className="tnum shrink-0 font-mono text-xs text-ink-muted/70">
                        {countryName(d.country)} · {d.code}
                      </span>
                    </span>
                    <StarGlyph
                      filled={isSaved}
                      className={`h-4 w-4 shrink-0 ${
                        isSaved ? "text-brand" : "text-ink-muted/50"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* current favourites */}
      {savedList.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {savedList.map((d) => (
            <span
              key={d.code}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-1 pl-2.5 pr-1.5 text-xs text-ink"
            >
              <StarGlyph filled className="h-3.5 w-3.5 shrink-0 text-brand" />
              <span className="truncate">{d.name}</span>
              <span className="tnum font-mono text-[10px] text-ink-muted/70">
                {d.code}
              </span>
              <button
                type="button"
                onClick={() => toggle(d.code)}
                aria-label={`Remove ${d.name} from favourites`}
                className="ml-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-line/60 hover:text-ink"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-muted/70">
          No favourite cities yet — search above to add some.
        </p>
      )}
    </div>
  );
}
