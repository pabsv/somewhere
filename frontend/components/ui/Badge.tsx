import type { ReactNode } from "react";

export type BadgeVariant = "steal" | "deal" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children?: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  steal: "bg-steal text-white",
  deal: "bg-brand text-brand-ink",
  neutral: "border border-line bg-transparent text-ink-muted",
};

const DEFAULT_LABEL: Partial<Record<BadgeVariant, string>> = {
  steal: "STEAL",
  deal: "DEAL",
};

/** Small uppercase mono badge — "STEAL" / "DEAL" / custom children. */
export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  const label = children ?? DEFAULT_LABEL[variant];
  if (label == null) return null;

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-[4px] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
