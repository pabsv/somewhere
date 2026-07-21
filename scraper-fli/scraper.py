"""
Fli-based flight scraper — queries Google Flights via the fli library.

Two-phase search:
  1. SearchDates — price grids per route (pool mode: two one-way sweeps,
     combined into any-duration (out, ret) pairs; legacy mode: round-trip
     grids per duration). fli chunks ranges >61 days internally.
  2. SearchFlights — get full flight details only for the cheapest dates

Same interface as AzairScraper so the scheduler can swap between them.
"""

import logging
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta

from fli.models import (
    Airport as FliAirport,
    PassengerInfo,
    SeatType,
    MaxStops,
    SortBy,
    TripType,
    FlightSearchFilters,
    FlightSegment,
    DateSearchFilters,
)
from fli.search import SearchFlights, SearchDates

# Import Flight and DateRange from scraper-azair
# Add scraper-azair to sys.path so its internal imports (parser, etc.) resolve
_azair_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scraper-azair")
if _azair_dir not in sys.path:
    sys.path.insert(0, _azair_dir)

import importlib.util

_parser_spec = importlib.util.spec_from_file_location("azair_parser", os.path.join(_azair_dir, "parser.py"))
_parser_mod = importlib.util.module_from_spec(_parser_spec)
_parser_spec.loader.exec_module(_parser_mod)
Flight = _parser_mod.Flight

_scraper_spec = importlib.util.spec_from_file_location("azair_scraper", os.path.join(_azair_dir, "scraper.py"))
_scraper_mod = importlib.util.module_from_spec(_scraper_spec)
_scraper_spec.loader.exec_module(_scraper_mod)
DateRange = _scraper_mod.DateRange

logger = logging.getLogger(__name__)

# Config
TOP_N_DATES_PER_ROUTE = 12  # How many cheap dates to fetch full details for

# Google decides the response currency from GeoIP unless the request URL pins
# it — unpinned runs came back in HKD/GBP/DKK/... depending on the route.
GOOGLE_URL_PARAMS = "?gl=NL&hl=en&curr=EUR"


def _minutes_to_hm(minutes: int) -> str:
    """Convert minutes to '2h 30m' format."""
    h, m = divmod(minutes, 60)
    return f"{h}h {m:02d}m"


def _resolve_airport(code: str) -> FliAirport:
    """Convert IATA code string to Fli Airport enum."""
    try:
        return FliAirport[code]
    except KeyError:
        raise ValueError(f"Unknown airport code: {code}")


def _build_google_flights_url(origin: str, dest: str, out_date: str, ret_date: str) -> str:
    """Build a Google Flights search URL."""
    return (
        f"https://www.google.com/travel/flights?q="
        f"Flights+to+{dest}+from+{origin}+on+{out_date}+returning+{ret_date}"
    )


def _fli_to_flight(outbound, inbound, origin_code: str, dest_code: str) -> Flight:
    """Convert a Fli round-trip result tuple into our Flight dataclass."""
    out_date = outbound.legs[0].departure_datetime.strftime("%Y-%m-%d")
    ret_date = inbound.legs[0].departure_datetime.strftime("%Y-%m-%d")

    out_dt = outbound.legs[0].departure_datetime.date()
    ret_dt = inbound.legs[0].departure_datetime.date()
    duration_days = (ret_dt - out_dt).days

    # Collect unique airline names from all legs
    all_legs = outbound.legs + inbound.legs
    airlines = list({leg.airline.value for leg in all_legs})

    return Flight(
        origin=origin_code,
        destination=dest_code,
        outbound_date=out_date,
        return_date=ret_date,
        duration_days=duration_days,
        price=outbound.price,  # Round-trip total (same on both legs)
        currency=outbound.currency or "EUR",
        airlines=airlines,
        outbound_departure=outbound.legs[0].departure_datetime.strftime("%H:%M"),
        outbound_arrival=outbound.legs[-1].arrival_datetime.strftime("%H:%M"),
        return_departure=inbound.legs[0].departure_datetime.strftime("%H:%M"),
        return_arrival=inbound.legs[-1].arrival_datetime.strftime("%H:%M"),
        outbound_duration=_minutes_to_hm(outbound.duration),
        return_duration=_minutes_to_hm(inbound.duration),
        outbound_stops=len(outbound.legs) - 1,
        return_stops=len(inbound.legs) - 1,
        search_link=_build_google_flights_url(origin_code, dest_code, out_date, ret_date),
        source="fli",
    )


class FliScraper:
    """
    Google Flights scraper using the fli library.

    Same interface as AzairScraper — drop-in replacement.
    Uses a two-phase approach:
      Phase 1: SearchDates to find cheap dates (very efficient)
      Phase 2: SearchFlights on cheap dates only (gets full details)
    """

    def __init__(self, top_n_dates: int = TOP_N_DATES_PER_ROUTE):
        self.top_n_dates = top_n_dates
        self._search_flights = SearchFlights()
        self._search_flights.BASE_URL = SearchFlights.BASE_URL + GOOGLE_URL_PARAMS
        self._search_dates = SearchDates()
        self._search_dates.BASE_URL = SearchDates.BASE_URL + GOOGLE_URL_PARAMS
        self.stats = {
            "date_searches": 0,
            "flight_searches": 0,
            "flights_found": 0,
            "errors": 0,
        }

    def search_one_route(
        self,
        origin: str,
        destination: str,
        min_nights: int = 2,
        max_nights: int = 10,
        window_days: int = 90,
        top_n: int = 6,
        direct_only: bool = False,
        max_per_out_date: int = 2,
    ) -> tuple[list[Flight], dict]:
        """
        Pool-mode scrape of a single (origin, destination) route.

        Phase 1: two ONE-WAY SearchDates sweeps — O→D over the next
                 `window_days` days and D→O shifted by [min_nights, max_nights].
                 Every (out, ret) pair with min_nights..max_nights nights is
                 combined in memory (estimated price = sum of one-way fares),
                 so all durations compete, not a fixed bucket list. If both
                 grids come back empty (route lacks one-way calendar fares),
                 falls back to round-trip grids so the route doesn't rack up
                 empty runs toward auto-disable.
        Phase 2: SearchFlights on the `top_n` cheapest pairs, capped at
                 `max_per_out_date` pairs per departure date so one cheap
                 day can't eat every slot. Real round-trip prices stored.

        Returns (flights, stats) where stats has {date_searches, flight_searches,
        flights_found, errors, api_calls, cheapest_price, oneway_grids}.
        oneway_grids carries the raw Phase-1 one-way fare grids (both
        directions) so the caller can persist them —
        [] when Phase 1 fell back to round-trip grids.
        """
        from datetime import date

        today = date.today()
        # Snapshot global stats so we can measure deltas for this single call.
        snap_date = self.stats["date_searches"]
        snap_flight = self.stats["flight_searches"]
        snap_errors = self.stats["errors"]
        snap_found = self.stats["flights_found"]

        # ── Phase 1 ────────────────────────────────────────────────────
        out_from = today.strftime("%Y-%m-%d")
        out_to = (today + timedelta(days=window_days)).strftime("%Y-%m-%d")
        ret_from = (today + timedelta(days=min_nights)).strftime("%Y-%m-%d")
        ret_to = (today + timedelta(days=window_days + max_nights)).strftime("%Y-%m-%d")

        out_prices = self._search_dates_oneway(origin, destination, out_from, out_to, direct_only)
        ret_prices = self._search_dates_oneway(destination, origin, ret_from, ret_to, direct_only)

        # Expose the raw one-way grids for persistence.
        oneway_grids = []
        if out_prices:
            oneway_grids.append({"origin": origin, "destination": destination, "prices": out_prices})
        if ret_prices:
            oneway_grids.append({"origin": destination, "destination": origin, "prices": ret_prices})

        # Combine every (out, ret) pair within the nights range.
        pairs: list[dict] = []
        for out_d, out_p in out_prices.items():
            out_dt = date.fromisoformat(out_d)
            for nights in range(min_nights, max_nights + 1):
                ret_d = (out_dt + timedelta(days=nights)).strftime("%Y-%m-%d")
                ret_p = ret_prices.get(ret_d)
                if ret_p is not None:
                    pairs.append({"out_date": out_d, "ret_date": ret_d, "price": out_p + ret_p})

        if not pairs:
            logger.info(
                f"[Fli] {origin}->{destination}: one-way grids empty — round-trip fallback"
            )
            for duration in (min_nights, (min_nights + max_nights) // 2, max_nights):
                pairs.extend(
                    self._search_dates_safe(
                        origin, destination, out_from, out_to, duration, direct_only
                    )
                )

        pairs.sort(key=lambda p: p["price"])

        # Select top_n, at most max_per_out_date pairs per departure date.
        cheap_combos: list[dict] = []
        per_out: dict[str, int] = {}
        for p in pairs:
            if per_out.get(p["out_date"], 0) >= max_per_out_date:
                continue
            cheap_combos.append(p)
            per_out[p["out_date"]] = per_out.get(p["out_date"], 0) + 1
            if len(cheap_combos) >= top_n:
                break

        # ── Phase 2 ────────────────────────────────────────────────────
        flights: list[Flight] = []
        for combo in cheap_combos:
            logger.info(
                f"[Fli] {origin}->{destination} {combo['out_date']} ret {combo['ret_date']} "
                f"est=EUR {combo['price']:.0f}"
            )
            details = self._search_flights_safe(
                origin, destination, combo["out_date"], combo["ret_date"], direct_only
            )
            flights.extend(details)

        # Dedupe within this batch.
        seen = set()
        unique: list[Flight] = []
        for f in flights:
            if f.unique_key not in seen:
                seen.add(f.unique_key)
                unique.append(f)
        unique.sort(key=lambda f: f.price)

        date_searches = self.stats["date_searches"] - snap_date
        flight_searches = self.stats["flight_searches"] - snap_flight
        errors = self.stats["errors"] - snap_errors
        flights_found = self.stats["flights_found"] - snap_found

        return unique, {
            "date_searches": date_searches,
            "flight_searches": flight_searches,
            "flights_found": flights_found,
            "errors": errors,
            "api_calls": date_searches + flight_searches,
            "cheapest_price": unique[0].price if unique else None,
            "oneway_grids": oneway_grids,
        }

    def search_all(
        self,
        origins: list[str],
        destinations: list[str],
        date_ranges: list[DateRange],
        min_days: int = 2,
        max_days: int = 5,
        max_stops: int = 1,
        direct_only: bool = False,
    ) -> list[Flight]:
        """
        Full search across multiple origins, destinations, and date ranges.

        Same interface as AzairScraper.search_all().
        """
        logger.info("=" * 60)
        logger.info(f"[Fli] Starting search: {len(origins)} origins x {len(destinations)} destinations x {len(date_ranges)} date ranges")
        logger.info(f"[Fli] Trip duration: {min_days}-{max_days} days, direct_only={direct_only}")
        logger.info("=" * 60)

        # Phase 1: Find cheap dates for all route × date_range combos
        cheap_dates = self._phase1_find_cheap_dates(
            origins, destinations, date_ranges, min_days, max_days, direct_only
        )

        if not cheap_dates:
            logger.warning("[Fli] Phase 1 found no cheap dates")
            return []

        logger.info(f"[Fli] Phase 1 complete: {len(cheap_dates)} cheap date combos to search")

        # Phase 2: Get full flight details for cheap dates
        all_flights = self._phase2_get_details(cheap_dates, direct_only)

        # Deduplicate by unique_key and sort by price
        seen = set()
        unique = []
        for f in all_flights:
            if f.unique_key not in seen:
                seen.add(f.unique_key)
                unique.append(f)

        unique.sort(key=lambda f: f.price)

        logger.info("=" * 60)
        logger.info(f"[Fli] Final result: {len(unique)} flights")
        logger.info(f"[Fli] Stats: {self.stats}")
        logger.info("=" * 60)

        return unique

    def _phase1_find_cheap_dates(
        self,
        origins: list[str],
        destinations: list[str],
        date_ranges: list[DateRange],
        min_days: int,
        max_days: int,
        direct_only: bool,
    ) -> list[dict]:
        """
        Phase 1: Use SearchDates to find cheapest dates per route.

        Returns list of dicts: {origin, destination, out_date, ret_date, price}
        """
        # Collect all date prices per route
        route_prices = {}  # (origin, dest) -> list of {out_date, ret_date, price}

        for date_range in date_ranges:
            from_date = date_range.start.strftime("%Y-%m-%d")
            to_date = date_range.end.strftime("%Y-%m-%d")

            for origin in origins:
                for dest in destinations:
                    if origin == dest:
                        continue

                    key = (origin, dest)
                    if key not in route_prices:
                        route_prices[key] = []

                    # Search across different trip durations
                    for duration in range(min_days, max_days + 1):
                        prices = self._search_dates_safe(
                            origin, dest, from_date, to_date, duration, direct_only
                        )
                        for p in prices:
                            route_prices[key].append(p)

        # Per route: deduplicate by outbound_date (keep cheapest), then take top N
        cheap_dates = []
        for (origin, dest), prices in route_prices.items():
            # Deduplicate: keep cheapest per outbound_date
            best_by_date = {}
            for p in prices:
                d = p["out_date"]
                if d not in best_by_date or p["price"] < best_by_date[d]["price"]:
                    best_by_date[d] = p

            # Sort by price and take top N
            sorted_prices = sorted(best_by_date.values(), key=lambda x: x["price"])
            top = sorted_prices[: self.top_n_dates]

            for p in top:
                cheap_dates.append({
                    "origin": origin,
                    "destination": dest,
                    "out_date": p["out_date"],
                    "ret_date": p["ret_date"],
                    "price": p["price"],
                })

            if top:
                logger.info(
                    f"[Fli] {origin}->{dest}: {len(prices)} date prices, "
                    f"top {len(top)} cheapest (EUR {top[0]['price']:.0f} - {top[-1]['price']:.0f})"
                )

        return cheap_dates

    def _search_dates_safe(
        self, origin: str, dest: str, from_date: str, to_date: str, duration: int, direct_only: bool
    ) -> list[dict]:
        """Call SearchDates with error handling. Returns list of {out_date, ret_date, price}."""
        try:
            origin_airport = _resolve_airport(origin)
            dest_airport = _resolve_airport(dest)
        except ValueError as e:
            logger.warning(f"[Fli] {e}")
            return []

        try:
            filters = DateSearchFilters(
                trip_type=TripType.ROUND_TRIP,
                passenger_info=PassengerInfo(adults=1),
                flight_segments=[
                    FlightSegment(
                        departure_airport=[[origin_airport, 0]],
                        arrival_airport=[[dest_airport, 0]],
                        travel_date=from_date,
                    ),
                    FlightSegment(
                        departure_airport=[[dest_airport, 0]],
                        arrival_airport=[[origin_airport, 0]],
                        travel_date=from_date,
                    ),
                ],
                seat_type=SeatType.ECONOMY,
                stops=MaxStops.NON_STOP if direct_only else MaxStops.ANY,
                from_date=from_date,
                to_date=to_date,
                duration=duration,
            )

            results = self._search_dates.search(filters)
            self.stats["date_searches"] += 1

            if not results:
                return []

            prices = []
            for dp in results:
                out_dt = dp.date[0]
                ret_dt = dp.date[1] if len(dp.date) > 1 else None
                if ret_dt is None:
                    continue
                prices.append({
                    "out_date": out_dt.strftime("%Y-%m-%d"),
                    "ret_date": ret_dt.strftime("%Y-%m-%d"),
                    "price": dp.price,
                })
            return prices

        except Exception as e:
            logger.warning(f"[Fli] SearchDates failed for {origin}->{dest} ({duration}d): {e}")
            self.stats["errors"] += 1
            return []

    def _search_dates_oneway(
        self, origin: str, dest: str, from_date: str, to_date: str, direct_only: bool
    ) -> dict[str, float]:
        """One-way SearchDates grid. Returns {date_str: cheapest one-way price}."""
        try:
            origin_airport = _resolve_airport(origin)
            dest_airport = _resolve_airport(dest)
        except ValueError as e:
            logger.warning(f"[Fli] {e}")
            return {}

        try:
            filters = DateSearchFilters(
                trip_type=TripType.ONE_WAY,
                passenger_info=PassengerInfo(adults=1),
                flight_segments=[
                    FlightSegment(
                        departure_airport=[[origin_airport, 0]],
                        arrival_airport=[[dest_airport, 0]],
                        travel_date=from_date,
                    ),
                ],
                seat_type=SeatType.ECONOMY,
                stops=MaxStops.NON_STOP if direct_only else MaxStops.ANY,
                from_date=from_date,
                to_date=to_date,
            )

            # fli chunks ranges >61 days into multiple HTTP calls internally —
            # count the real calls so api_calls stays honest.
            span_days = (
                datetime.strptime(to_date, "%Y-%m-%d") - datetime.strptime(from_date, "%Y-%m-%d")
            ).days + 1
            results = self._search_dates.search(filters)
            self.stats["date_searches"] += max(1, -(-span_days // 61))

            if not results:
                return {}

            prices: dict[str, float] = {}
            for dp in results:
                d = dp.date[0].strftime("%Y-%m-%d")
                if d not in prices or dp.price < prices[d]:
                    prices[d] = dp.price
            return prices

        except Exception as e:
            logger.warning(f"[Fli] One-way SearchDates failed for {origin}->{dest}: {e}")
            self.stats["errors"] += 1
            return {}

    def _phase2_get_details(self, cheap_dates: list[dict], direct_only: bool) -> list[Flight]:
        """Phase 2: Get full flight details for each cheap date combo."""
        all_flights = []

        for i, cd in enumerate(cheap_dates, 1):
            origin = cd["origin"]
            dest = cd["destination"]
            out_date = cd["out_date"]
            ret_date = cd["ret_date"]

            logger.info(f"[Fli] [{i}/{len(cheap_dates)}] {origin}->{dest} {out_date} ret {ret_date}")

            flights = self._search_flights_safe(origin, dest, out_date, ret_date, direct_only)
            all_flights.extend(flights)

        return all_flights

    def _search_flights_safe(
        self, origin: str, dest: str, out_date: str, ret_date: str, direct_only: bool
    ) -> list[Flight]:
        """Call SearchFlights with error handling. Returns list of Flight dataclass objects."""
        try:
            origin_airport = _resolve_airport(origin)
            dest_airport = _resolve_airport(dest)
        except ValueError as e:
            logger.warning(f"[Fli] {e}")
            return []

        try:
            filters = FlightSearchFilters(
                trip_type=TripType.ROUND_TRIP,
                passenger_info=PassengerInfo(adults=1),
                flight_segments=[
                    FlightSegment(
                        departure_airport=[[origin_airport, 0]],
                        arrival_airport=[[dest_airport, 0]],
                        travel_date=out_date,
                    ),
                    FlightSegment(
                        departure_airport=[[dest_airport, 0]],
                        arrival_airport=[[origin_airport, 0]],
                        travel_date=ret_date,
                    ),
                ],
                seat_type=SeatType.ECONOMY,
                stops=MaxStops.NON_STOP if direct_only else MaxStops.ANY,
                sort_by=SortBy.CHEAPEST,
            )

            results = self._search_flights.search(filters)
            self.stats["flight_searches"] += 1

            if not results:
                return []

            flights = []
            for result in results:
                if not isinstance(result, tuple) or len(result) < 2:
                    continue
                outbound, inbound = result[0], result[1]
                try:
                    flight = _fli_to_flight(outbound, inbound, origin, dest)
                    flights.append(flight)
                except Exception as e:
                    logger.warning(f"[Fli] Failed to convert flight: {e}")
                    self.stats["errors"] += 1

            self.stats["flights_found"] += len(flights)
            return flights

        except Exception as e:
            logger.warning(f"[Fli] SearchFlights failed for {origin}->{dest} on {out_date}: {e}")
            self.stats["errors"] += 1
            return []
