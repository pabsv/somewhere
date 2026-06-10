"""
One-off search: WAW -> China (Aug 1-7) and China -> AMS/BRU (Aug 22-31).
Uses the `fli` library directly with TripType.ONE_WAY.
Not part of the production scheduler — run with `python scratch_china_search.py`.
"""

import logging
from collections import defaultdict
from datetime import datetime

from fli.models import (
    Airport,
    DateSearchFilters,
    FlightSearchFilters,
    FlightSegment,
    MaxStops,
    PassengerInfo,
    SeatType,
    SortBy,
    TripType,
)
from fli.search import SearchDates, SearchFlights

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")
log = logging.getLogger("china-search")
log.setLevel(logging.INFO)

OUTBOUND_FROM = "2026-08-01"
OUTBOUND_TO = "2026-08-07"
RETURN_FROM = "2026-08-22"
RETURN_TO = "2026-08-31"

WAW = "WAW"
CHINA_CITIES = ["PEK", "PKX", "PVG", "SHA", "CAN", "CTU", "CKG"]
EU_RETURN_CITIES = ["AMS", "BRU"]

CHINA_NAMES = {
    "PEK": "Beijing Capital",
    "PKX": "Beijing Daxing",
    "PVG": "Shanghai Pudong",
    "SHA": "Shanghai Hongqiao",
    "CAN": "Guangzhou",
    "CTU": "Chengdu",
    "CKG": "Chongqing",
}

TOP_DATES_PER_ROUTE = 3
TOP_FLIGHTS_PER_DATE = 2

search_dates = SearchDates()
search_flights = SearchFlights()


def minutes_to_hm(minutes: int) -> str:
    h, m = divmod(int(minutes), 60)
    return f"{h}h{m:02d}"


def gflights_link_oneway(origin: str, dest: str, date: str) -> str:
    return (
        f"https://www.google.com/travel/flights?q=Flights+to+{dest}+from+{origin}+on+{date}"
    )


def airport(code: str) -> Airport:
    return Airport[code]


def find_cheap_dates_oneway(origin: str, dest: str, from_date: str, to_date: str):
    """Return list of {date, price} sorted by price ascending."""
    try:
        filters = DateSearchFilters(
            trip_type=TripType.ONE_WAY,
            passenger_info=PassengerInfo(adults=1),
            flight_segments=[
                FlightSegment(
                    departure_airport=[[airport(origin), 0]],
                    arrival_airport=[[airport(dest), 0]],
                    travel_date=from_date,
                ),
            ],
            seat_type=SeatType.ECONOMY,
            stops=MaxStops.ONE_STOP_OR_FEWER,
            from_date=from_date,
            to_date=to_date,
        )
        results = search_dates.search(filters) or []
        rows = []
        for dp in results:
            d = dp.date[0]
            rows.append({"date": d.strftime("%Y-%m-%d"), "price": dp.price})
        rows.sort(key=lambda r: r["price"])
        return rows
    except Exception as e:
        log.warning(f"SearchDates failed {origin}->{dest} {from_date}..{to_date}: {e}")
        return []


def find_flights_oneway(origin: str, dest: str, date: str, fallback_price: float = 0.0):
    """Return list of detailed flight dicts on a given date, cheapest first."""
    try:
        sf = SearchFlights()  # fresh client per call to avoid any state issue
        filters = FlightSearchFilters(
            trip_type=TripType.ONE_WAY,
            passenger_info=PassengerInfo(adults=1),
            flight_segments=[
                FlightSegment(
                    departure_airport=[[airport(origin), 0]],
                    arrival_airport=[[airport(dest), 0]],
                    travel_date=date,
                ),
            ],
            seat_type=SeatType.ECONOMY,
            stops=MaxStops.ONE_STOP_OR_FEWER,
            sort_by=SortBy.CHEAPEST,
        )
        results = sf.search(filters) or []
        rows = []
        for r in results:
            try:
                legs = r.legs
                airlines = sorted({leg.airline.value for leg in legs})
                stops = len(legs) - 1
                dep = legs[0].departure_datetime.strftime("%H:%M")
                arr = legs[-1].arrival_datetime.strftime("%H:%M")
                arr_day_offset = (
                    legs[-1].arrival_datetime.date() - legs[0].departure_datetime.date()
                ).days
                arr_str = arr if arr_day_offset == 0 else f"{arr}+{arr_day_offset}d"
                price = float(r.price) if r.price else fallback_price
                price_source = "exact" if r.price else "from-date-search"
                rows.append(
                    {
                        "origin": origin,
                        "dest": dest,
                        "date": date,
                        "price": price,
                        "price_source": price_source,
                        "airlines": ", ".join(airlines),
                        "duration": minutes_to_hm(r.duration),
                        "stops": stops,
                        "depart": dep,
                        "arrive": arr_str,
                        "link": gflights_link_oneway(origin, dest, date),
                    }
                )
            except Exception as e:
                log.warning(f"  failed to parse a flight: {e}")
        rows.sort(key=lambda x: x["price"])
        return rows
    except Exception as e:
        log.warning(f"SearchFlights failed {origin}->{dest} {date}: {e}")
        return []


def collect_route_options(origin: str, dest: str, from_date: str, to_date: str):
    """Find cheap dates, then fetch top flights on each."""
    log.info(f"  scan {origin}->{dest} {from_date}..{to_date}")
    cheap = find_cheap_dates_oneway(origin, dest, from_date, to_date)[:TOP_DATES_PER_ROUTE]
    if not cheap:
        log.info(f"    no dates found")
        return []
    log.info(
        f"    cheapest dates: "
        + ", ".join(f"{d['date']}=EUR{d['price']:.0f}" for d in cheap)
    )
    out = []
    for d in cheap:
        flights = find_flights_oneway(origin, dest, d["date"], fallback_price=d["price"])[:TOP_FLIGHTS_PER_DATE]
        out.extend(flights)
    return out


def fmt_table(rows, columns, header):
    if not rows:
        return f"{header}\n  (no results)\n"
    widths = {c: max(len(c), max(len(str(r.get(c, ""))) for r in rows)) for c in columns}
    line = " | ".join(c.ljust(widths[c]) for c in columns)
    sep = "-+-".join("-" * widths[c] for c in columns)
    out = [header, line, sep]
    for r in rows:
        out.append(" | ".join(str(r.get(c, "")).ljust(widths[c]) for c in columns))
    return "\n".join(out) + "\n"


def main():
    print(f"\nSearching outbound: {WAW} -> {CHINA_CITIES} on {OUTBOUND_FROM}..{OUTBOUND_TO}")
    outbound_all = []
    for dest in CHINA_CITIES:
        outbound_all.extend(collect_route_options(WAW, dest, OUTBOUND_FROM, OUTBOUND_TO))

    print(f"\nSearching return: {CHINA_CITIES} -> {EU_RETURN_CITIES} on {RETURN_FROM}..{RETURN_TO}")
    return_all = []
    for origin in CHINA_CITIES:
        for dest in EU_RETURN_CITIES:
            return_all.extend(collect_route_options(origin, dest, RETURN_FROM, RETURN_TO))

    outbound_all.sort(key=lambda r: r["price"])
    return_all.sort(key=lambda r: r["price"])

    print("\n" + "=" * 100)
    print("OUTBOUND  WAW -> China  (Aug 1-7, 2026, one-way, <=1 stop, economy, 1 adult)")
    print("=" * 100)
    rows = []
    for r in outbound_all[:25]:
        rows.append(
            {
                "date": r["date"],
                "route": f"{r['origin']} -> {r['dest']} ({CHINA_NAMES[r['dest']]})",
                "price_EUR": f"{r['price']:.0f}",
                "airlines": r["airlines"][:40],
                "duration": r["duration"],
                "stops": r["stops"],
                "depart-arrive": f"{r['depart']}-{r['arrive']}",
            }
        )
    print(fmt_table(rows, ["date", "route", "price_EUR", "airlines", "duration", "stops", "depart-arrive"], ""))

    print("\n" + "=" * 100)
    print("RETURN  China -> AMS/BRU  (Aug 22-31, 2026, one-way, <=1 stop, economy, 1 adult)")
    print("=" * 100)
    rows = []
    for r in return_all[:30]:
        rows.append(
            {
                "date": r["date"],
                "route": f"{r['origin']} ({CHINA_NAMES[r['origin']]}) -> {r['dest']}",
                "price_EUR": f"{r['price']:.0f}",
                "airlines": r["airlines"][:40],
                "duration": r["duration"],
                "stops": r["stops"],
                "depart-arrive": f"{r['depart']}-{r['arrive']}",
            }
        )
    print(fmt_table(rows, ["date", "route", "price_EUR", "airlines", "duration", "stops", "depart-arrive"], ""))

    print("\n" + "=" * 100)
    print("CHEAPEST COMBINED ROUNDTRIP per Chinese city  (out-to-city + back-from-city, total EUR)")
    print("=" * 100)
    by_city_out = defaultdict(list)
    for r in outbound_all:
        by_city_out[r["dest"]].append(r)
    by_city_in = defaultdict(list)
    for r in return_all:
        by_city_in[r["origin"]].append(r)

    combo_rows = []
    for city in CHINA_CITIES:
        outs = by_city_out.get(city, [])
        ins = by_city_in.get(city, [])
        if not outs or not ins:
            continue
        best_out = outs[0]
        best_in = ins[0]
        combo_rows.append(
            {
                "city": f"{city} ({CHINA_NAMES[city]})",
                "out_date": best_out["date"],
                "out_price": f"{best_out['price']:.0f}",
                "ret_date": best_in["date"],
                "ret_route": f"-> {best_in['dest']}",
                "ret_price": f"{best_in['price']:.0f}",
                "TOTAL_EUR": f"{best_out['price'] + best_in['price']:.0f}",
            }
        )
    combo_rows.sort(key=lambda r: float(r["TOTAL_EUR"]))
    print(
        fmt_table(
            combo_rows,
            ["city", "out_date", "out_price", "ret_date", "ret_route", "ret_price", "TOTAL_EUR"],
            "",
        )
    )

    print("\nNotes:")
    print("- Prices are economy, 1 adult, snapshot at search time. They move.")
    print("- <=1 stop applied. Direct WAW->China is rare; expect 1 stop on most.")
    print("- Booking happens on Google Flights / airline site, not via this tool.")
    print("- Search Google Flights manually for any city/date pair using the format:")
    print("  https://www.google.com/travel/flights?q=Flights+to+<DST>+from+<ORG>+on+<YYYY-MM-DD>")


if __name__ == "__main__":
    main()
