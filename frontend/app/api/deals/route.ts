import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// 70% rule: same as Python _window_trip_range()
function windowTripRange(windowLengthDays: number): [number, number] {
  const minDays = Math.max(2, Math.round(windowLengthDays * 0.7));
  const maxDays = windowLengthDays;
  return [minDays, maxDays];
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing X-User-ID" }, { status: 401 });

  try {
    const db = await getDb();
    const oid = new ObjectId(userId);

    // Get user
    const user = await db.collection("users").findOne({ _id: oid });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });

    const maxPrice: number = user.notifications?.max_price_alert ?? 75;
    const directOnly: boolean = user.search_preferences?.direct_only ?? false;
    const home: string = user.airports?.home ?? "";
    const nearby: string[] = user.airports?.nearby ?? [];
    const origins = [...new Set([home, ...nearby].filter(Boolean))];

    if (origins.length === 0) return NextResponse.json({ deals: [] });

    // Get future availability windows
    const now = new Date();
    const availDocs = await db.collection("availability")
      .find({ user_id: oid, is_active: true, end_date: { $gte: now } })
      .sort({ start_date: 1 })
      .toArray();

    if (availDocs.length === 0) return NextResponse.json({ deals: [] });

    // Get destinations
    const destDocs = await db.collection("destination_preferences")
      .find({ user_id: oid, is_active: true })
      .toArray();
    const destinations = destDocs.map((d) => d.destination_code as string);

    if (destinations.length === 0) return NextResponse.json({ deals: [] });

    // Match flights for each availability window
    const seen = new Set<string>();
    const matchingFlights: object[] = [];

    for (const avail of availDocs) {
      const startDate: Date = avail.start_date;
      const endDate: Date = avail.end_date;
      const startStr = toDateStr(startDate);
      const endStr = toDateStr(endDate);

      const windowLength =
        Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
      const [minDays, maxDays] = windowTripRange(windowLength);

      // Query flights for this window
      const flights = await db.collection("flights").find({
        origin: { $in: origins },
        destination: { $in: destinations },
        outbound_date: { $gte: startStr },
        return_date: { $lte: endStr },
      }).toArray();

      for (const f of flights) {
        // Price filter
        if (f.price > maxPrice) continue;
        // Direct-only filter
        if (directOnly && !(f.outbound_stops === 0 && f.return_stops === 0)) continue;
        // Duration filter
        if (f.duration_days < minDays || f.duration_days > maxDays) continue;
        // Both dates must fall within the availability window
        if (f.outbound_date < startStr || f.outbound_date > endStr) continue;
        if (f.return_date < startStr || f.return_date > endStr) continue;

        const key = f.flight_key as string;
        if (!seen.has(key)) {
          seen.add(key);
          matchingFlights.push({
            flight_key:          f.flight_key,
            origin:              f.origin,
            destination:         f.destination,
            outbound_date:       f.outbound_date,
            return_date:         f.return_date,
            duration_days:       f.duration_days,
            price:               f.price,
            airlines:            f.airlines ?? [],
            outbound_departure:  f.outbound_departure,
            outbound_arrival:    f.outbound_arrival,
            return_departure:    f.return_departure,
            return_arrival:      f.return_arrival,
            outbound_duration:   f.outbound_duration,
            return_duration:     f.return_duration,
            outbound_stops:      f.outbound_stops,
            return_stops:        f.return_stops,
            is_direct:           f.outbound_stops === 0 && f.return_stops === 0,
            azair_link:          f.azair_link,
            deal_score:          f.deal_score ?? 0,
            is_deal:             f.is_deal ?? false,
          });
        }
      }
    }

    // Sort: deal_score desc, then price asc
    matchingFlights.sort((a: any, b: any) =>
      b.deal_score - a.deal_score || a.price - b.price
    );

    return NextResponse.json({ deals: matchingFlights.slice(0, 200) });
  } catch (e) {
    console.error("deals route error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
