"use client";

import { useEffect, useState } from "react";

interface GhostExtensionProps {
  /** 1-based start column (clamped to the month). */
  startCol: number;
  /** 1-based end column (inclusive, clamped to the month). */
  endCol: number;
  /** 0-based lane row of the hovered bar. */
  lane: number;
  /** which side of the bar this segment extends. */
  side: "earlier" | "later";
  /** true if the suggested range continues past this month's edge. */
  clipped: boolean;
  /** price chip text, e.g. "←2d +€21" / "+1d ~+€9". Empty = no chip. */
  label: string;
}

/**
 * A trip-stretch segment drawn beside a hovered TripBar: steal-green tinted
 * fill with a dashed border covering the suggested extra days, plus a small
 * price chip. Rounded on its outer edge only (the inner edge butts against the
 * bar; a month-clipped outer edge goes square). z-0 under the solid bars
 * (z-10), pointer-events-none so it can never steal the bar's hover.
 */
export default function GhostExtension({
  startCol,
  endCol,
  lane,
  side,
  clipped,
  label,
}: GhostExtensionProps) {
  // fade in after mount (variants arrive ~200ms after hover)
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const span = Math.max(1, endCol - startCol + 1);
  const rounding =
    side === "later"
      ? clipped
        ? "rounded-none"
        : "rounded-r-full rounded-l-none"
      : clipped
        ? "rounded-none"
        : "rounded-l-full rounded-r-none";

  return (
    <div
      aria-hidden="true"
      style={{
        gridColumn: `${startCol} / span ${span}`,
        gridRow: lane + 1,
      }}
      className={`pointer-events-none z-0 flex h-6 min-w-0 items-center justify-center border border-dashed border-steal/60 bg-steal/15 transition-opacity duration-150 ${rounding} ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {label && (
        <span className="tnum max-w-full truncate rounded bg-card/85 px-1 font-mono text-[9px] font-semibold leading-tight text-steal">
          {label}
        </span>
      )}
    </div>
  );
}
