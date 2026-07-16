// ─── Group trips board — upcoming fares scored against the group's dates ─────
// Data-dense row list matching the surrounding light cards on this page (not
// the dark Solari board) — one row per trip: destination + route, dates, a
// FareTag, and a "x/y free +z unknown" match badge. Full-group matches get a
// steal-colored left border + a "STEAL"-style Badge. Reuses lib/format.

import type { GroupTrip } from "@/types/api";
import Badge from "@/components/ui/Badge";
import FareTag from "@/components/ui/FareTag";
import { formatRange } from "@/lib/format";

export default function GroupTripsBoard({
  trips,
  truncated,
  knownCount,
  unknownCount,
}: {
  trips: GroupTrip[];
  truncated: boolean;
  knownCount: number;
  unknownCount: number;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink">
        Trips that fit the group
      </h2>

      {knownCount === 0 ? (
        <p className="mt-3 rounded-(--radius-tag) border border-line bg-paper px-3 py-2 text-sm text-ink-muted">
          No one has added their available dates yet — matches will rank once
          members set availability in Settings.
        </p>
      ) : (
        <p className="mt-1 font-mono text-xs text-ink-muted/70">
          {knownCount} member{knownCount === 1 ? "" : "s"} with dates set
          {unknownCount > 0 ? `, ${unknownCount} not yet` : ""}.
        </p>
      )}

      {trips.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted/80">
          No upcoming trips found for this group&rsquo;s origins yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {trips.map((t) => (
            <li key={t.key}>
              <GroupTripRow trip={t} />
            </li>
          ))}
        </ul>
      )}

      {truncated && (
        <p className="mt-3 text-xs text-ink-muted/80">
          Showing top matches — more available.
        </p>
      )}
    </div>
  );
}

function GroupTripRow({ trip }: { trip: GroupTrip }) {
  const borderClass = trip.full_group
    ? "border border-line border-l-4 border-l-steal"
    : "border border-line";

  const rowClass = `flex flex-wrap items-center gap-3 rounded-(--radius-card) ${borderClass} bg-card px-4 py-3 shadow-(--shadow-card)`;

  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-display text-base font-semibold text-ink">
            {trip.city}
          </span>
          <span className="tnum shrink-0 font-mono text-xs uppercase tracking-wide text-ink-muted">
            {trip.origin}
            <span className="px-1 text-ink-muted/60">→</span>
            {trip.destination}
          </span>
          {trip.full_group && (
            <Badge variant="steal">Everyone&rsquo;s free</Badge>
          )}
        </div>
        <div className="tnum mt-1 font-mono text-xs text-ink-muted">
          {formatRange(trip.outbound_date, trip.return_date)}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <span className="tnum whitespace-nowrap rounded-(--radius-tag) border border-line bg-paper px-2 py-0.5 font-mono text-xs text-ink-muted">
          {trip.free_count}/{trip.known_count} free
          {trip.unknown_count > 0 ? ` +${trip.unknown_count} unknown` : ""}
        </span>
        <FareTag price={trip.price} tier={trip.deal_tier} size="md" />
      </div>
    </>
  );

  if (trip.search_link) {
    return (
      <a
        href={trip.search_link}
        target="_blank"
        rel="noopener noreferrer"
        className={`${rowClass} transition-transform duration-150 ease-out-quart hover:-translate-y-px`}
      >
        {inner}
      </a>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}
