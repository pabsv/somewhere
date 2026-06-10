"""Parse Azair search results HTML."""

from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional
from bs4 import BeautifulSoup
import re
import json


def normalize_date(date_text: str) -> str:
    """
    Normalise Azair's raw date string to YYYY-MM-DD.

    Azair returns dates in the format "Tue 17/03/26".
    All other code (DB queries, UserMatcher, frontend) expects YYYY-MM-DD.
    """
    if not date_text:
        return date_text
    try:
        dt = datetime.strptime(date_text.strip(), "%a %d/%m/%y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return date_text  # Already normalised or unknown format — pass through


@dataclass
class Flight:
    """Represents a flight deal."""
    # Route info
    origin: str
    destination: str

    # Dates
    outbound_date: str
    return_date: str
    duration_days: int

    # Price
    price: float
    currency: str

    # Flight details
    airlines: list[str]
    outbound_departure: str
    outbound_arrival: str
    return_departure: str
    return_arrival: str
    outbound_duration: str
    return_duration: str
    outbound_stops: int
    return_stops: int

    # Booking
    azair_link: str  # Direct link to Azair for this specific flight

    # Source tracking
    search_link: Optional[str] = None  # Google Flights URL (for Fli-sourced flights)
    source: str = "azair"              # "azair" or "fli"

    # Metadata
    scraped_at: Optional[str] = None

    def __post_init__(self):
        """Set scraped_at timestamp if not provided."""
        if self.scraped_at is None:
            self.scraped_at = datetime.now().isoformat()

    @property
    def is_direct(self) -> bool:
        """Check if both legs are direct flights."""
        return self.outbound_stops == 0 and self.return_stops == 0

    @property
    def route_key(self) -> str:
        """Unique key for this route (for grouping)."""
        return f"{self.origin}-{self.destination}"

    @property
    def unique_key(self) -> str:
        """Unique identifier for this specific flight."""
        return f"{self.origin}-{self.destination}-{self.outbound_date}-{self.return_date}-{self.price}"

    def __str__(self):
        stops = "direct" if self.is_direct else f"{self.outbound_stops}stop"
        airlines_str = ", ".join(set(self.airlines)) if self.airlines else "Unknown"
        return (
            f"{self.origin}->{self.destination}: €{self.price:.0f} "
            f"({self.outbound_date} to {self.return_date}, {self.duration_days}d, {stops}) "
            f"[{airlines_str}]"
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON/database storage."""
        return asdict(self)

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict(), indent=2)


def parse_results(html: str, origin_override: str = None) -> list[Flight]:
    """
    Parse Azair search results HTML and extract flight deals.

    Args:
        html: Raw HTML from Azair search results page
        origin_override: Override the origin airport (useful when parsing doesn't detect it)

    Returns:
        List of Flight objects
    """
    soup = BeautifulSoup(html, "lxml")
    flights = []

    # Find the results list
    reslist = soup.find("div", id="reslist")
    if not reslist:
        return flights

    # Find all result divs
    results = reslist.find_all("div", class_="result")

    for result in results:
        try:
            flight = parse_single_result(result, origin_override)
            if flight:
                flights.append(flight)
        except Exception as e:
            # Log but continue with other results
            continue

    return flights


def parse_single_result(result_div, origin_override: str = None) -> Optional[Flight]:
    """Parse a single flight result div."""

    # Get total price from tp attribute (JSON data)
    price = None
    tp_attr = result_div.get("tp")
    if tp_attr:
        try:
            tp_data = json.loads(tp_attr)
            price = float(tp_data.get("tp", 0))
        except (json.JSONDecodeError, ValueError):
            pass

    # Fallback to span.tp
    if not price:
        price_span = result_div.find("span", class_="tp")
        if price_span:
            price_text = price_span.get_text(strip=True)
            price_match = re.search(r"[\d.,]+", price_text)
            if price_match:
                price = float(price_match.group().replace(",", "."))

    if not price:
        return None

    # Get length of stay
    duration_days = 0
    los_span = result_div.find("span", class_="lengthOfStay")
    if los_span:
        los_match = re.search(r"(\d+)\s*days?", los_span.get_text())
        if los_match:
            duration_days = int(los_match.group(1))

    # Find "There" and "Back" sections
    text_div = result_div.find("div", class_="text")
    if not text_div:
        return None

    paragraphs = text_div.find_all("p", recursive=False)

    # Initialize variables
    origin = origin_override or ""
    destination = ""
    outbound_date = ""
    return_date = ""
    outbound_departure = ""
    outbound_arrival = ""
    return_departure = ""
    return_arrival = ""
    outbound_duration = ""
    return_duration = ""
    outbound_stops = 0
    return_stops = 0
    airlines = []

    for p in paragraphs:
        caption = p.find("span", class_="caption")
        if not caption:
            continue

        caption_classes = caption.get("class", [])
        is_outbound = "tam" in caption_classes  # "There"
        is_return = "sem" in caption_classes    # "Back"

        # Get date
        date_span = p.find("span", class_="date")
        date_text = date_span.get_text(strip=True) if date_span else ""

        # Get from airport
        from_span = p.find("span", class_="from")
        from_code = ""
        from_time = ""
        if from_span:
            code_span = from_span.find("span", class_="code")
            raw = code_span.get_text(strip=True) if code_span else ""
            m = re.match(r'^([A-Z]{3})', raw)
            from_code = m.group(1) if m else raw
            strong = from_span.find("strong")
            from_time = strong.get_text(strip=True) if strong else ""

        # Get to airport
        to_span = p.find("span", class_="to")
        to_code = ""
        to_time = ""
        if to_span:
            code_span = to_span.find("span", class_="code")
            raw = code_span.get_text(strip=True) if code_span else ""
            m = re.match(r'^([A-Z]{3})', raw)
            to_code = m.group(1) if m else raw
            to_text = to_span.get_text(strip=True)
            time_match = re.match(r"(\d{1,2}:\d{2})", to_text)
            to_time = time_match.group(1) if time_match else ""

        # Get duration and changes
        durcha_span = p.find("span", class_="durcha")
        duration_str = ""
        stops = 0
        if durcha_span:
            durcha_text = durcha_span.get_text(strip=True)
            dur_match = re.search(r"([\d:]+)\s*h", durcha_text)
            duration_str = dur_match.group(1) + "h" if dur_match else ""

            if "direct" in durcha_text.lower():
                stops = 0
            else:
                stops_match = re.search(r"(\d+)\s*change", durcha_text)
                stops = int(stops_match.group(1)) if stops_match else 0

        if is_outbound:
            if not origin:
                origin = from_code
            destination = to_code
            outbound_date = normalize_date(date_text)
            outbound_departure = from_time
            outbound_arrival = to_time
            outbound_duration = duration_str
            outbound_stops = stops
        elif is_return:
            return_date = normalize_date(date_text)
            return_departure = from_time
            return_arrival = to_time
            return_duration = duration_str
            return_stops = stops

    # Collect airlines from detail sections
    airline_spans = result_div.find_all("span", class_=lambda c: c and "airline" in c)
    for span in airline_spans:
        airline_name = span.get_text(strip=True)
        if airline_name and airline_name not in airlines:
            airlines.append(airline_name)

    # Get Azair booking link (from bookmark div)
    azair_link = ""
    bookmark = result_div.find("div", class_="bookmark")
    if bookmark:
        a_tag = bookmark.find("a", href=True)
        if a_tag:
            href = a_tag["href"]
            if href.startswith("azfin.php"):
                azair_link = "https://www.azair.eu/" + href
            elif href.startswith("http"):
                azair_link = href
            else:
                azair_link = "https://www.azair.eu/" + href

    if not origin or not destination:
        return None

    return Flight(
        origin=origin,
        destination=destination,
        outbound_date=outbound_date,
        return_date=return_date,
        price=price,
        currency="EUR",
        airlines=airlines,
        outbound_departure=outbound_departure,
        outbound_arrival=outbound_arrival,
        return_departure=return_departure,
        return_arrival=return_arrival,
        duration_days=duration_days,
        outbound_duration=outbound_duration,
        return_duration=return_duration,
        outbound_stops=outbound_stops,
        return_stops=return_stops,
        azair_link=azair_link,
    )


def filter_by_price(flights: list[Flight], max_price: float) -> list[Flight]:
    """Filter flights by maximum price."""
    return [f for f in flights if f.price <= max_price]


def filter_direct_only(flights: list[Flight]) -> list[Flight]:
    """Filter to only include direct flights."""
    return [f for f in flights if f.is_direct]


def sort_by_price(flights: list[Flight]) -> list[Flight]:
    """Sort flights by price ascending."""
    return sorted(flights, key=lambda f: f.price)


def deduplicate(flights: list[Flight]) -> list[Flight]:
    """Remove duplicate flights based on unique_key."""
    seen = set()
    unique = []
    for f in flights:
        if f.unique_key not in seen:
            seen.add(f.unique_key)
            unique.append(f)
    return unique


def flights_to_json(flights: list[Flight]) -> str:
    """Convert list of flights to JSON string."""
    return json.dumps([f.to_dict() for f in flights], indent=2)


def save_flights_json(flights: list[Flight], filepath: str):
    """Save flights to a JSON file."""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(flights_to_json(flights))
