"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Chip from "@/components/ui/Chip";
import { REGIONS } from "@/data/destinations.gen";
import { ORIGINS } from "@/data/airports.gen";
import { useOrigins } from "@/lib/useOrigins";

export type SortKey = "score" | "cheapest" | "trips";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score", label: "Best score" },
  { value: "cheapest", label: "Cheapest" },
  { value: "trips", label: "Most trips" },
];

interface ExploreControlsProps {
  search: string;
  onSearch: (value: string) => void;
  region: string | null;
  onRegion: (region: string | null) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
}

/**
 * Explore controls: free-text search (client-side, name/country), region filter
 * chips, sort select, and origin chips (?from= via useOrigins). All filtering
 * happens in the parent; this is presentational + delegating.
 */
export default function ExploreControls({
  search,
  onSearch,
  region,
  onRegion,
  sort,
  onSort,
}: ExploreControlsProps) {
  const { toggle, isSelected } = useOrigins();

  return (
    <div className="space-y-4">
      {/* search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search a city or country…"
            aria-label="Search destinations"
            className="rounded-tag border-line bg-card text-ink placeholder:text-ink-muted/60 focus:border-ink-muted"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-ink-muted">Sort</span>
          <Select
            value={sort}
            onChange={(v) => onSort(v as SortKey)}
            options={SORT_OPTIONS}
            className="rounded-tag border-line bg-card text-ink focus:border-ink-muted"
          />
        </div>
      </div>

      {/* origin chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
          From
        </span>
        {ORIGINS.map((o) => (
          <Chip
            key={o.code}
            size="sm"
            selected={isSelected(o.code)}
            onClick={() => toggle(o.code)}
            title={o.name}
          >
            <span className="tnum font-mono uppercase tracking-wide">
              {o.code}
            </span>
          </Chip>
        ))}
      </div>

      {/* region chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip size="sm" selected={region === null} onClick={() => onRegion(null)}>
          All regions
        </Chip>
        {REGIONS.map((r) => (
          <Chip
            key={r}
            size="sm"
            selected={region === r}
            onClick={() => onRegion(region === r ? null : r)}
          >
            {r}
          </Chip>
        ))}
      </div>
    </div>
  );
}
