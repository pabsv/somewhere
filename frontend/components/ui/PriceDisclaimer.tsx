// ─── PriceDisclaimer — "prices may rise at checkout" note ────────────────────
// Fares shown across the app are the last-scraped snapshot for a route, which
// can sit a few euros under the live checkout price. This one-liner sets that
// expectation wherever a fare is surfaced (grid, city page, booking handoff).

export const PRICE_DISCLAIMER =
  "Fares are last-checked snapshots and may be higher at checkout.";

export default function PriceDisclaimer({
  children,
  className = "",
}: {
  /** Override the default copy (e.g. tighter wording in a sheet). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xs leading-snug text-ink-muted/70 ${className}`}>
      {children ?? PRICE_DISCLAIMER}
    </p>
  );
}
