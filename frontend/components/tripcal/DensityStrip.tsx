"use client";

import type { MonthSpec } from "./calendarMath";
import { dayStr } from "./calendarMath";

interface DensityStripProps {
  spec: MonthSpec;
  /** date(YYYY-MM-DD) → count of trips spanning that day (UNFILTERED from API) */
  density: Record<string, number>;
  /** overflow count for this month (trips not shown as bars) */
  overflowCount: number;
  /** expand the month (show all bars); when absent the "+N more" is passive */
  onExpand?: () => void;
  /**
   * Total day-columns of the month grid (left fog + spec.days + right spill).
   * Keeps the strip aligned with the bar grid; the fog cells stay empty.
   */
  totalCols?: number;
  /** left fog lead-in columns to skip before the month's own days (default 0). */
  lead?: number;
}

/**
 * Bottom heat row of a month block: one cell per day, brand-yellow opacity
 * scaled by that day's trip count vs the month's busiest day. When trips were
 * truncated into density, a mono "+N more" sits at the right end — a button
 * that expands the month when `onExpand` is provided.
 */
export default function DensityStrip({
  spec,
  density,
  overflowCount,
  onExpand,
  totalCols,
  lead = 0,
}: DensityStripProps) {
  const days = Array.from({ length: spec.days }, (_, i) => {
    const day = dayStr(spec.year, spec.month, i + 1);
    return { day, count: density[day] ?? 0 };
  });
  const max = days.reduce((m, d) => Math.max(m, d.count), 0);

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted/70">
          Activity
        </span>
        {overflowCount > 0 &&
          (onExpand ? (
            <button
              type="button"
              onClick={onExpand}
              className="tnum font-mono text-[10px] text-ink-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-ink"
            >
              +{overflowCount} more
            </button>
          ) : (
            <span className="tnum font-mono text-[10px] text-ink-muted">
              +{overflowCount} more
            </span>
          ))}
      </div>
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `repeat(${totalCols ?? spec.days}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: lead }, (_, i) => (
          <div key={`l${i}`} />
        ))}
        {days.map(({ day, count }) => {
          // scale opacity 0.08..1 so any non-zero day is visible
          const opacity =
            max > 0 && count > 0 ? 0.12 + 0.88 * (count / max) : 0;
          return (
            <div
              key={day}
              title={`${count} trip${count === 1 ? "" : "s"} span this day`}
              className="h-3.5 rounded-[2px] bg-line/60"
            >
              {count > 0 && (
                <span
                  className="block h-full w-full rounded-[2px] bg-brand"
                  style={{ opacity }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
