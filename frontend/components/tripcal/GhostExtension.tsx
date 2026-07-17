"use client";

import { useEffect, useState } from "react";

interface GhostExtensionProps {
  /** 1-based start column (the day AFTER the trip's return). */
  startCol: number;
  /** 1-based end column (inclusive, clamped to the month). */
  endCol: number;
  /** 0-based lane row of the hovered bar. */
  lane: number;
  /** true if the suggested range continues past this month's edge. */
  clippedEnd: boolean;
}

/**
 * The dashed "stay longer" tail drawn after a hovered TripBar: a translucent
 * continuation of the bar covering the suggested extra days. Deliberately
 * subordinate — z-0 under the solid bars (z-10), no text (prices live in the
 * tooltip), pointer-events-none so it can never steal the bar's hover.
 */
export default function GhostExtension({
  startCol,
  endCol,
  lane,
  clippedEnd,
}: GhostExtensionProps) {
  // fade in after mount (variants arrive ~200ms after hover)
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const span = Math.max(1, endCol - startCol + 1);

  return (
    <div
      aria-hidden="true"
      style={{
        gridColumn: `${startCol} / span ${span}`,
        gridRow: lane + 1,
      }}
      className={`pointer-events-none z-0 h-6 rounded-l-none border border-dashed border-ink-muted/50 bg-paper/60 transition-opacity duration-150 ${
        clippedEnd ? "rounded-r-none" : "rounded-r-full"
      } ${visible ? "opacity-100" : "opacity-0"}`}
    />
  );
}
