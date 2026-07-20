"use client";

import { useMemo } from "react";
import type { DateWindow } from "@/types/api";
import { parseLocalDate } from "@/lib/format";
import {
  type MonthSpec,
  clampDayInMonth,
  spansMonth,
} from "./calendarMath";

interface FreeStripProps {
  spec: MonthSpec;
  /** the user's availability windows (unclipped; we clip to this month here) */
  windows: DateWindow[];
  /**
   * Total day-columns of the month grid (spec.days + ghost spill columns).
   * Keeps the strip aligned with the bar grid; the spill cells stay empty.
   */
  totalCols?: number;
}

interface Segment {
  /** 1-based start column within the month */
  start: number;
  /** 1-based end column within the month */
  end: number;
  /** hover title, e.g. "Aug 14 – Aug 20 · free from 17:00" */
  title: string;
}

interface HourTag {
  /** 1-based day column the tag sits over */
  col: number;
  /** "17→" (free from) or "→10" (back by) — YearPaint's cell-label idiom */
  label: string;
}

const SHORT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

/** "Aug 14" for a bare YYYY-MM-DD (local-parsed, no UTC drift). */
function short(date: string): string {
  return SHORT.format(parseLocalDate(date));
}

/** "free from 17:00", "back by 10:00", both, or "" — the window's edge hours. */
function edgeLabel(w: DateWindow): string {
  const parts: string[] = [];
  if (w.start_time != null) parts.push(`free from ${w.start_time}:00`);
  if (w.end_time != null) parts.push(`back by ${w.end_time}:00`);
  return parts.join(" · ");
}

/**
 * A slim steal-green availability lane for one month, aligned to the same
 * day-column grid as the gantt bars. Mirrors the bottom DensityStrip, but sits
 * above the day-number axis so the user reads "these are your free days" before
 * scanning the fares below. Partial-day windows (edge hours) keep a solid
 * segment and get a tiny mono hour tag over the edge day — "17→" (free from) /
 * "→10" (back by), the same idiom YearPaint uses in Settings.
 * Renders nothing when no window touches this month.
 */
export default function FreeStrip({ spec, windows, totalCols }: FreeStripProps) {
  const cols = totalCols ?? spec.days;

  const { segments, tags } = useMemo(() => {
    const segments: Segment[] = [];
    const tags: HourTag[] = [];
    for (const w of windows) {
      if (!spansMonth(w.start_date, w.end_date, spec)) continue;
      const edge = edgeLabel(w);
      const range = `${short(w.start_date)} – ${short(w.end_date)}`;
      segments.push({
        start: clampDayInMonth(w.start_date, spec),
        end: clampDayInMonth(w.end_date, spec),
        title: edge ? `${range} · ${edge}` : range,
      });
      // hour tags only when the edge day actually falls inside this month
      if (w.start_time != null && w.start_date >= spec.startStr)
        tags.push({
          col: clampDayInMonth(w.start_date, spec),
          label: `${w.start_time}→`,
        });
      if (w.end_time != null && w.end_date <= spec.endStr)
        tags.push({
          col: clampDayInMonth(w.end_date, spec),
          label: `→${w.end_time}`,
        });
    }
    return { segments, tags };
  }, [windows, spec]);

  if (segments.length === 0) return null;

  const freeDays = segments.reduce((n, s) => n + (s.end - s.start + 1), 0);

  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-steal/80">
          Free
        </span>
        <span className="tnum font-mono text-[10px] text-ink-muted/80">
          {freeDays} {freeDays === 1 ? "day" : "days"}
        </span>
      </div>

      {/* hour tags — a row above the strip, only present when a window has
          edge hours in this month (no reserved height otherwise) */}
      {tags.length > 0 && (
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {tags.map((t, i) => (
            <span
              key={i}
              className="tnum whitespace-nowrap text-center font-mono text-[8px] leading-none text-steal"
              style={{ gridColumn: t.col }}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}

      <div
        className="mt-0.5 grid items-center gap-px"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          height: 8,
        }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            title={seg.title}
            className="h-2 rounded-full bg-steal"
            style={{
              gridColumn: `${seg.start} / span ${Math.max(1, seg.end - seg.start + 1)}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
