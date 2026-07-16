// ─── Shared free dates — overlap across every member with availability set ───
// Read-only pill strip. `knownCount` gates the message: overlap only makes
// sense once at least two members have availability windows set at all.
// Reuses lib/format's formatRange for the same "12–19 Aug" / "28 Aug – 3 Sep"
// collapsing the rest of the app already uses — no date library needed.

import type { SharedWindow } from "@/types/api";
import { formatRange } from "@/lib/format";

export default function SharedDatesStrip({
  windows,
  knownCount,
}: {
  windows: SharedWindow[];
  knownCount: number;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink">
        When everyone&rsquo;s free
      </h2>

      {knownCount < 2 ? (
        <p className="mt-3 text-sm text-ink-muted/80">
          Need at least two members with dates set to find overlap.
        </p>
      ) : windows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted/80">
          No overlapping free dates yet.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {windows.map((w) => (
            <li
              key={`${w.start}-${w.end}`}
              className="tnum rounded-(--radius-tag) border border-line bg-paper px-2.5 py-1 font-mono text-sm text-ink"
            >
              {formatRange(w.start, w.end)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
