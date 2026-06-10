// ─── BestPerMonth — 6-month "when's it cheapest" strip (Track E) ─────────────
// Next 6 months from today. Per month, the best-score Trip whose outbound_date
// falls in that month → compact card (month label · FareTag · date range ·
// nights). Empty months show a quiet "—". Horizontal scroll on mobile. Spec §D.

import type { Trip } from "@/types/api";
import FareTag from "@/components/ui/FareTag";
import { formatRange, nightsLabel, parseLocalDate } from "@/lib/format";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

interface MonthSlot {
  key: string; // "2026-06"
  label: string; // "Jun" / "Jun '27"
  best: Trip | null;
}

/** Whole nights between two YYYY-MM-DD dates (local-safe). */
function nightsBetween(out: string, ret: string): number {
  const ms = parseLocalDate(ret).getTime() - parseLocalDate(out).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

/** Build the next 6 month buckets (incl. current) and slot the best Trip into each. */
function buildSlots(trips: Trip[]): MonthSlot[] {
  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth();

  const slots: MonthSlot[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(baseYear, baseMonth + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    slots.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label:
        y === baseYear
          ? MONTHS_SHORT[m]
          : `${MONTHS_SHORT[m]} '${String(y).slice(-2)}`,
      best: null,
    });
  }

  const byKey = new Map(slots.map((s) => [s.key, s]));
  // trips already arrive sorted by score desc, so the first match per month wins.
  for (const trip of trips) {
    const out = parseLocalDate(trip.outbound_date);
    const key = `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, "0")}`;
    const slot = byKey.get(key);
    if (slot && slot.best === null) slot.best = trip;
  }

  return slots;
}

interface BestPerMonthProps {
  trips: Trip[];
}

export default function BestPerMonth({ trips }: BestPerMonthProps) {
  const slots = buildSlots(trips);

  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-ink">
        Best per month
      </h2>
      <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
        {slots.map((slot) => (
          <div
            key={slot.key}
            className="flex w-32 shrink-0 flex-col rounded-card border border-line bg-card p-3 shadow-card"
          >
            <span className="font-mono text-xs uppercase tracking-wide text-ink-muted">
              {slot.label}
            </span>
            {slot.best ? (
              <>
                <div className="mt-2">
                  <FareTag
                    price={slot.best.price}
                    tier={slot.best.deal_tier}
                    size="md"
                  />
                </div>
                <span className="tnum mt-2 font-mono text-xs text-ink">
                  {formatRange(
                    slot.best.outbound_date,
                    slot.best.return_date,
                  )}
                </span>
                <span className="tnum mt-0.5 font-mono text-[11px] text-ink-muted">
                  {nightsLabel(
                    nightsBetween(
                      slot.best.outbound_date,
                      slot.best.return_date,
                    ),
                  )}
                </span>
              </>
            ) : (
              <span className="mt-2 font-mono text-2xl text-ink-muted/40">
                —
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
