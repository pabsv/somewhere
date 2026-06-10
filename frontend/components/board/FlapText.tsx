"use client";

import { useState } from "react";

interface FlapTextProps {
  text: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-5 w-3.5 text-[11px]",
  md: "h-7 w-5 text-sm",
  lg: "h-10 w-7 text-xl",
} as const;

/** Duration of each half of the flip (out + in ≈ one ~90ms flap). */
const FLAP_MS = 45;
/** Per-char stagger so the board ripples left → right. */
const STAGGER_MS = 30;

/**
 * Split-flap (Solari) text. Each character is a dark board tile with a
 * hairline mid-seam. When `text` changes, changed tiles do a vertical
 * half-flip — old glyph rotates away (rotateX 0 → -90°), new glyph rotates
 * in (90° → 0°) — staggered per character. Reduced motion: instant swap
 * (globals.css zeroes animation durations and delays).
 */
export default function FlapText({
  text,
  size = "md",
  className = "",
}: FlapTextProps) {
  const display = text.toUpperCase();

  // Derived-from-props state: remember the previous text so changed tiles
  // can render an old-face/new-face flipping pair. Render-phase setState is
  // the canonical "storing information from previous renders" pattern.
  const [prev, setPrev] = useState(display);
  const [from, setFrom] = useState(display);
  const [flipKey, setFlipKey] = useState(0);
  if (prev !== display) {
    setPrev(display);
    setFrom(prev);
    setFlipKey(flipKey + 1);
  }

  const length = Math.max(display.length, flipKey > 0 ? from.length : 0);
  const tileSize = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex gap-[2px] font-mono uppercase leading-none ${className}`}
      aria-label={text}
    >
      {Array.from({ length }, (_, i) => {
        const ch = display[i] ?? " ";
        const old = flipKey > 0 ? (from[i] ?? " ") : ch;
        const glyph = ch === " " ? " " : ch;

        if (flipKey === 0 || old === ch) {
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`board-tile inline-flex items-center justify-center ${tileSize}`}
            >
              {glyph}
            </span>
          );
        }

        const oldGlyph = old === " " ? " " : old;
        return (
          <span
            key={`${i}-${flipKey}`}
            aria-hidden="true"
            className={`relative inline-block ${tileSize}`}
            style={{ perspective: "240px" }}
          >
            {/* old face: flips away, stays edge-on */}
            <span
              className="board-tile absolute inset-0 inline-flex items-center justify-center backface-hidden"
              style={{
                animation: `flap-out ${FLAP_MS}ms var(--ease-snap) ${i * STAGGER_MS}ms forwards`,
              }}
            >
              {oldGlyph}
            </span>
            {/* new face: starts edge-on, flips in after the old face clears */}
            <span
              className="board-tile absolute inset-0 inline-flex items-center justify-center backface-hidden"
              style={{
                transform: "rotateX(90deg)",
                animation: `flap-in ${FLAP_MS}ms var(--ease-snap) ${i * STAGGER_MS + FLAP_MS}ms forwards`,
              }}
            >
              {glyph}
            </span>
          </span>
        );
      })}
    </span>
  );
}
