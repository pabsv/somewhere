export type DealTier = "steal" | "deal" | "fair";
export type FareTagSize = "sm" | "md" | "lg";

interface FareTagProps {
  price: number;
  tier?: DealTier;
  size?: FareTagSize;
  currency?: string;
  className?: string;
}

const TIER_CLASSES: Record<DealTier, string> = {
  steal: "bg-steal text-white",
  deal: "bg-brand text-brand-ink",
  fair: "border border-line bg-card text-ink",
};

const SIZE_CLASSES: Record<FareTagSize, string> = {
  sm: "px-1.5 py-px text-xs",
  md: "px-2 py-0.5 text-sm",
  lg: "px-3 py-1 text-lg",
};

/**
 * The price atom. Mono tabular price in a tag-shaped chip, colored by deal
 * tier — steal = green fill, deal = yellow fill, fair = plain card.
 */
export default function FareTag({
  price,
  tier = "fair",
  size = "md",
  currency = "€",
  className = "",
}: FareTagProps) {
  return (
    <span
      className={`tnum inline-flex items-center whitespace-nowrap rounded-tag font-mono font-medium ${TIER_CLASSES[tier]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {currency}
      {Math.round(price)}
    </span>
  );
}

const SKELETON_SIZES: Record<FareTagSize, string> = {
  sm: "h-[1.375rem] w-9",
  md: "h-[1.625rem] w-11",
  lg: "h-9 w-14",
};

export function FareTagSkeleton({
  size = "md",
  className = "",
}: {
  size?: FareTagSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded-tag bg-line ${SKELETON_SIZES[size]} ${className}`}
    />
  );
}
