"use client";

import Chip from "@/components/ui/Chip";
import SearchCombobox, {
  type SearchSelection,
} from "@/components/explore/SearchCombobox";
import { ORIGINS } from "@/data/airports.gen";
import { useOrigins } from "@/lib/useOrigins";
import type { CitySummary } from "@/types/api";

interface ExploreControlsProps {
  /** Loaded cities — feeds the search combobox suggestions. */
  cities: CitySummary[];
  selection: SearchSelection | null;
  onSelect: (selection: SearchSelection | null) => void;
  /** "Only my free dates" — shown only when signed in with saved windows. */
  showFree: boolean;
  onlyFree: boolean;
  onToggleFree: () => void;
}

/**
 * Explore controls: one search combobox (city / country / region), the
 * "Only my free dates" toggle in the trailing slot, and origin chips
 * (?from= via useOrigins). Sorting is cheapest-only and handled in the parent.
 */
export default function ExploreControls({
  cities,
  selection,
  onSelect,
  showFree,
  onlyFree,
  onToggleFree,
}: ExploreControlsProps) {
  const { toggle, isSelected } = useOrigins();

  return (
    <div className="space-y-4">
      {/* search + free-dates toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <SearchCombobox
            cities={cities}
            selection={selection}
            onSelect={onSelect}
          />
        </div>
        {showFree && (
          <Chip
            size="md"
            selected={onlyFree}
            onClick={onToggleFree}
            className="shrink-0 self-start sm:self-auto"
          >
            Only my free dates
          </Chip>
        )}
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
    </div>
  );
}
