"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** plain-text label for assistive tech when `title` isn't a string */
  ariaLabel?: string;
  /**
   * Which end of the header the ✕ sits at. "right" (default) matches the
   * desktop side-panel convention; "left" is the phone convention, where the
   * dismiss control belongs under the thumb that opened the screen.
   */
  closeSide?: "left" | "right";
  children: ReactNode;
}

/** Horizontal travel (px) past which releasing dismisses the panel. */
const SWIPE_CLOSE_PX = 90;
/** Movement (px) before a drag commits to an axis. */
const SWIPE_SLOP = 10;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Slide-in side panel from the right. Closes on scrim click or Escape,
 * keeps focus inside while open (basic trap), restores focus on close.
 */
export default function Sheet({
  open,
  onClose,
  title,
  ariaLabel,
  closeSide = "right",
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Swipe right to dismiss ───────────────────────────────────────────────
  // The panel is anchored to the right edge, so pushing it further right is
  // the natural "put it back" gesture. The drag only commits once it's clearly
  // horizontal, so vertical scrolling inside the panel is untouched.
  const [dragX, setDragX] = useState(0);
  const drag = useRef<{
    x: number;
    y: number;
    axis: "none" | "x" | "y";
  } | null>(null);

  // No reset-on-close effect needed: every gesture path clears dragX itself,
  // and while `open` is false the panel's transform comes from the class, not
  // from dragX.

  function onTouchStart(e: React.TouchEvent) {
    if (!open || e.touches.length !== 1) return;
    drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: "none" };
  }

  function onTouchMove(e: React.TouchEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.touches[0].clientX - d.x;
    const dy = e.touches[0].clientY - d.y;
    if (d.axis === "none") {
      if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) return;
      // only a rightward, clearly-horizontal drag takes over
      d.axis = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
    }
    if (d.axis === "x") setDragX(Math.max(0, dx));
  }

  function onTouchEnd() {
    const d = drag.current;
    drag.current = null;
    if (d?.axis === "x" && dragX > SWIPE_CLOSE_PX) {
      setDragX(0);
      onClose();
      return;
    }
    setDragX(0);
  }

  // dragX is only ever non-zero while a horizontal drag is in flight, so it
  // doubles as the "kill the transition" flag.
  const dragging = dragX > 0;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* scrim */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-night/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === "string" ? title : "Panel")}
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          // Driven inline rather than by translate-x-0/full, because Tailwind
          // v4 compiles those to the `translate` longhand — which an inline
          // `transform` composes with instead of overriding, so the drag
          // offset would be silently ignored. It has to be `transform`, not
          // `translate`: Chrome refuses to interpolate `translate: 100% → 0px`
          // (percentage ↔ length) and the panel freezes off-screen, whereas
          // `translateX(100%) → translateX(0px)` animates fine.
          transform: open ? `translateX(${dragX}px)` : "translateX(100%)",
          touchAction: "pan-y",
          transitionDuration: dragging ? "0ms" : undefined,
        }}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-card shadow-card transition-transform duration-200 ease-out-quart focus:outline-none"
      >
        <div
          className={`flex items-center gap-3 border-b border-line px-5 py-4 ${
            closeSide === "left" ? "justify-start" : "justify-between gap-4"
          }`}
        >
          {closeSide === "right" &&
            (title ? (
              <h2 className="font-display text-lg font-semibold">{title}</h2>
            ) : (
              <span />
            ))}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className={`shrink-0 rounded-tag text-ink-muted transition-colors hover:bg-paper hover:text-ink ${
              closeSide === "left"
                ? // thumb target on a phone, so -m keeps the optical inset at 16px
                  "-m-2.5 flex h-11 w-11 items-center justify-center"
                : "p-1"
            }`}
          >
            <svg
              width={closeSide === "left" ? 20 : 16}
              height={closeSide === "left" ? 20 : 16}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
          {closeSide === "left" && title && (
            <h2 className="min-w-0 truncate font-display text-lg font-semibold">
              {title}
            </h2>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
