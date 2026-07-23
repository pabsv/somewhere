"use client";

// Departure-airport chip grid — extracted so Settings → PreferencesCard and
// the /welcome onboarding wizard render the exact same picker.

import Chip from "@/components/ui/Chip";
import { ORIGINS } from "@/data/airports.gen";

export default function OriginChips({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ORIGINS.map((o) => (
        <Chip
          key={o.code}
          size="sm"
          appearance="availability"
          selected={selected.includes(o.code)}
          onClick={() => onToggle(o.code)}
          title={o.name}
        >
          <span className="tnum font-mono uppercase tracking-wide">
            {o.code}
          </span>
        </Chip>
      ))}
    </div>
  );
}
