"use client";

// ─── StarButton — toggle a city as a saved "interest" ────────────────────────
// Filled brand star = saved, hairline outline = not. Calls onToggle and stops
// event propagation so it can live inside a card-wide <Link> without navigating.

interface StarButtonProps {
  active: boolean;
  onToggle: () => void;
  /** City name, for the a11y label ("Save Lisbon" / "Saved Lisbon"). */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

const BOX = { sm: "h-7 w-7", md: "h-9 w-9" } as const;
const ICON = { sm: "h-4 w-4", md: "h-5 w-5" } as const;

export default function StarButton({
  active,
  onToggle,
  label,
  size = "sm",
  className = "",
}: StarButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${active ? "Saved" : "Save"} ${label}`}
      title={active ? "Saved — click to remove" : "Save this city"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full transition-colors ${
        BOX[size]
      } ${
        active
          ? "text-brand hover:text-brand/80"
          : "text-ink-muted/60 hover:text-ink hover:bg-line/40"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={ICON[size]}
        aria-hidden="true"
      >
        <path d="M12 17.27l-5.36 3.28 1.42-6.1L3 9.74l6.24-.53L12 3.5l2.76 5.71 6.24.53-5.06 4.71 1.42 6.1z" />
      </svg>
    </button>
  );
}
