// ─── Calendar lane packing — pure, deterministic ─────────────────────────────
// Price-first greedy interval placement for the gantt calendar.
// Spec: docs/DESIGN_V1.md section G (ranking measure since switched to price) —
// sort by price asc, greedily place each trip into the first lane it fits in
// (≤ maxLanes); the rest overflow into the density strip. No IO, no Date
// objects — YYYY-MM-DD strings compare correctly lexicographically.

export interface LaneTrip {
  key: string;
  outbound_date: string; // YYYY-MM-DD
  return_date: string; // YYYY-MM-DD
  price: number;
  /**
   * Ranked BELOW every normal trip, whatever it costs — so it takes a lower
   * lane and overflows first. Set for ±2-day availability exceptions: those
   * bars are an opt-in extra and must never push a trip that actually fits the
   * user's free dates into "+N more". Unset = the original price-first order.
   */
  deprioritized?: boolean;
}

export interface LaneAssignment {
  /** trip key → lane index (0-based, top lane first) */
  lanes: Map<string, number>;
  /** keys of trips that didn't fit in maxLanes — render in density strip */
  overflow: string[];
}

interface Interval {
  out: string;
  ret: string;
}

/** Inclusive date-range overlap test (bars touching on a shared day collide). */
function overlaps(a: Interval, out: string, ret: string): boolean {
  return !(a.ret < out || a.out > ret);
}

/**
 * Assign trips to ≤ maxLanes horizontal lanes.
 *
 * Order: normal trips before `deprioritized` ones, then price ASC, then
 * outbound_date ASC, then key ASC — fully deterministic, cheapest deals claim
 * the top lanes first.
 *
 * Placement: first lane (lowest index) where the trip overlaps none of the
 * lane's existing intervals. Because insertion is price-ordered rather than
 * chronological, the spec's "lane's last return_date < outbound_date" check
 * is generalized to all intervals in the lane — same greedy intent, but a
 * later-placed bar can also slot in BEFORE an existing one. If no lane fits
 * and all maxLanes are open, the trip overflows.
 */
export function assignLanes(
  trips: LaneTrip[],
  maxLanes = 6,
): LaneAssignment {
  const sorted = [...trips].sort((a, b) => {
    const da = a.deprioritized ? 1 : 0;
    const db = b.deprioritized ? 1 : 0;
    if (da !== db) return da - db;
    if (a.price !== b.price) return a.price - b.price;
    if (a.outbound_date !== b.outbound_date)
      return a.outbound_date < b.outbound_date ? -1 : 1;
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  const laneIntervals: Interval[][] = [];
  const lanes = new Map<string, number>();
  const overflow: string[] = [];

  for (const trip of sorted) {
    let placed = false;

    for (let i = 0; i < laneIntervals.length; i++) {
      const collides = laneIntervals[i].some((iv) =>
        overlaps(iv, trip.outbound_date, trip.return_date),
      );
      if (!collides) {
        laneIntervals[i].push({ out: trip.outbound_date, ret: trip.return_date });
        lanes.set(trip.key, i);
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (laneIntervals.length < maxLanes) {
        laneIntervals.push([
          { out: trip.outbound_date, ret: trip.return_date },
        ]);
        lanes.set(trip.key, laneIntervals.length - 1);
      } else {
        overflow.push(trip.key);
      }
    }
  }

  return { lanes, overflow };
}
