"""Configuration for Azair scraper."""

# =============================================================================
# USER'S HOME AIRPORTS
# =============================================================================

# Primary home airport
DEFAULT_ORIGIN = "EIN"

# Nearby airports to also check (within ~2 hours)
NEARBY_ORIGINS = ["EIN", "AMS", "BRU", "DUS", "CGN"]

# =============================================================================
# EUROPEAN DESTINATIONS
# =============================================================================

# Full list of European budget-friendly destinations
# Format: IATA code -> (City name, Country)
EUROPEAN_DESTINATIONS = {
    # Southern Europe
    "BCN": ("Barcelona", "Spain"),
    "MAD": ("Madrid", "Spain"),
    "AGP": ("Malaga", "Spain"),
    "ALC": ("Alicante", "Spain"),
    "PMI": ("Palma Mallorca", "Spain"),
    "VLC": ("Valencia", "Spain"),
    "SVQ": ("Seville", "Spain"),
    "LIS": ("Lisbon", "Portugal"),
    "OPO": ("Porto", "Portugal"),
    "FAO": ("Faro", "Portugal"),
    "FCO": ("Rome", "Italy"),
    "MXP": ("Milan", "Italy"),
    "NAP": ("Naples", "Italy"),
    "BGY": ("Bergamo", "Italy"),
    "VCE": ("Venice", "Italy"),
    "PSA": ("Pisa", "Italy"),
    "BRI": ("Bari", "Italy"),
    "CTA": ("Catania", "Italy"),
    "ATH": ("Athens", "Greece"),
    "SKG": ("Thessaloniki", "Greece"),
    "MLA": ("Malta", "Malta"),

    # Eastern Europe
    "BUD": ("Budapest", "Hungary"),
    "PRG": ("Prague", "Czechia"),
    "WAW": ("Warsaw", "Poland"),
    "KRK": ("Krakow", "Poland"),
    "WRO": ("Wroclaw", "Poland"),
    "GDN": ("Gdansk", "Poland"),
    "POZ": ("Poznan", "Poland"),
    "VIE": ("Vienna", "Austria"),
    "BTS": ("Bratislava", "Slovakia"),
    "OTP": ("Bucharest", "Romania"),
    "CLJ": ("Cluj", "Romania"),
    "SOF": ("Sofia", "Bulgaria"),
    "VAR": ("Varna", "Bulgaria"),
    "ZAG": ("Zagreb", "Croatia"),
    "SPU": ("Split", "Croatia"),
    "DBV": ("Dubrovnik", "Croatia"),
    "BEG": ("Belgrade", "Serbia"),
    "LJU": ("Ljubljana", "Slovenia"),
    "TIA": ("Tirana", "Albania"),
    "SKP": ("Skopje", "North Macedonia"),

    # Northern Europe
    "CPH": ("Copenhagen", "Denmark"),
    "ARN": ("Stockholm", "Sweden"),
    "OSL": ("Oslo", "Norway"),
    "HEL": ("Helsinki", "Finland"),
    "RIX": ("Riga", "Latvia"),
    "VNO": ("Vilnius", "Lithuania"),
    "TLL": ("Tallinn", "Estonia"),
    "KEF": ("Reykjavik", "Iceland"),

    # Western Europe
    "DUB": ("Dublin", "Ireland"),
    "EDI": ("Edinburgh", "UK"),
    "LPL": ("Liverpool", "UK"),
    "MAN": ("Manchester", "UK"),
    "STN": ("London Stansted", "UK"),
    "LTN": ("London Luton", "UK"),

    # North Africa / Near destinations
    "RAK": ("Marrakech", "Morocco"),
    "AGA": ("Agadir", "Morocco"),
    "TNG": ("Tangier", "Morocco"),
    "FEZ": ("Fez", "Morocco"),
}

# Quick access list of just IATA codes
DESTINATION_CODES = list(EUROPEAN_DESTINATIONS.keys())

# =============================================================================
# AIRPORT NAMES (for URL construction)
# =============================================================================

AIRPORT_NAMES = {
    # Origins
    "EIN": "Eindhoven",
    "AMS": "Amsterdam",
    "BRU": "Brussels",
    "DUS": "Dusseldorf",
    "CGN": "Cologne",
    "RTM": "Rotterdam",

    # Destinations (auto-populated from EUROPEAN_DESTINATIONS)
    **{code: info[0] for code, info in EUROPEAN_DESTINATIONS.items()}
}

# =============================================================================
# SCRAPER SETTINGS
# =============================================================================

# Price threshold for "deal" alerts (EUR)
MAX_PRICE = 75

# Trip duration defaults
DEFAULT_MIN_DAYS = 2
DEFAULT_MAX_DAYS = 7

# Request settings
REQUEST_TIMEOUT = 60  # seconds
RETRY_ATTEMPTS = 3
RETRY_DELAY = 5  # seconds between retries
DELAY_BETWEEN_REQUESTS = 2  # seconds between different searches

# Logging
LOG_LEVEL = "INFO"
LOG_FILE = "scraper.log"
