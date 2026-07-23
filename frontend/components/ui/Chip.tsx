import type { ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  size?: "sm" | "md";
  appearance?: "default" | "availability";
}

const SIZE_CLASSES = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-1.5 text-sm",
} as const;

/**
 * Toggle chip — origin filters and friends.
 * Selected = ink fill / paper text, unselected = card bg / hairline border.
 */
export default function Chip({
  selected = false,
  size = "md",
  appearance = "default",
  type = "button",
  className = "",
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors ${
        SIZE_CLASSES[size]
      } ${
        appearance === "availability"
          ? "border-line bg-line/60 text-ink-muted hover:border-ink-muted hover:bg-line hover:text-ink aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink aria-pressed:hover:border-brand aria-pressed:hover:bg-brand/90"
          : selected
            ? "border-ink bg-ink text-paper"
            : "border-line bg-card text-ink hover:border-ink-muted"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
