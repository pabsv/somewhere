"""
Scrape target pool — origins, destinations, and tier assignments.

Pool-based scraping: this is what we scrape regardless of any user.
Users later filter the pool by their preferences.

Tiers:
  A  — daily            (top tourist + major hubs)
  B  — every 3 days     (popular secondary cities)
  C  — every 7 days     (regional / long-tail)

All IATA codes here have been verified against fli's Airport enum.
"""

# Airports closest to Eindhoven that have meaningful route coverage,
# plus EIN itself. WEZ/NRN is the Ryanair Niederrhein hub (~80km).
# MST (Maastricht) added 2026-07-14 by user request — small airport, so most
# of its routes will come back empty and auto-disable after
# ROUTE_MAX_CONSECUTIVE_FAILURES runs; the handful it actually serves survive.
# DUS / NRN kept commented for trivial re-add once we expand.
ORIGINS = [
    {"code": "EIN", "name": "Eindhoven",          "country": "NL"},
    {"code": "AMS", "name": "Amsterdam Schiphol", "country": "NL"},
    {"code": "BRU", "name": "Brussels",           "country": "BE"},
    {"code": "CRL", "name": "Brussels-Charleroi", "country": "BE"},
    {"code": "MST", "name": "Maastricht",         "country": "NL"},
    # Secondary origins: demote_tier shifts every destination one tier down
    # (A→B, B→C, C→C) for this origin only — deals still surface, but the
    # slot budget stays focused on the airports users actually live near.
    {"code": "DUS", "name": "Düsseldorf",         "country": "DE", "demote_tier": True},
    # {"code": "NRN", "name": "Niederrhein-Weeze",  "country": "DE"},
]

# Destination pool. Tier hints reflect typical tourist demand from NL/BE.
DESTINATIONS = [
    # ─── Spain — Tier A (top tourist) ─────────────────────────────────────
    {"code": "BCN", "name": "Barcelona",          "country": "ES", "region": "Iberia",        "tier": "A"},
    {"code": "MAD", "name": "Madrid",             "country": "ES", "region": "Iberia",        "tier": "A"},
    {"code": "AGP", "name": "Malaga",             "country": "ES", "region": "Iberia",        "tier": "A"},
    {"code": "PMI", "name": "Palma de Mallorca",  "country": "ES", "region": "Iberia",        "tier": "A"},
    {"code": "IBZ", "name": "Ibiza",              "country": "ES", "region": "Iberia",        "tier": "A"},
    {"code": "ALC", "name": "Alicante",           "country": "ES", "region": "Iberia",        "tier": "A"},
    # Spain — Tier B
    {"code": "VLC", "name": "Valencia",           "country": "ES", "region": "Iberia",        "tier": "B"},
    {"code": "SVQ", "name": "Seville",            "country": "ES", "region": "Iberia",        "tier": "B"},
    {"code": "BIO", "name": "Bilbao",             "country": "ES", "region": "Iberia",        "tier": "B"},
    {"code": "MAH", "name": "Menorca",            "country": "ES", "region": "Iberia",        "tier": "B"},
    {"code": "TFS", "name": "Tenerife South",     "country": "ES", "region": "Iberia",        "tier": "B"},
    {"code": "LPA", "name": "Gran Canaria",       "country": "ES", "region": "Iberia",        "tier": "B"},
    {"code": "ACE", "name": "Lanzarote",          "country": "ES", "region": "Iberia",        "tier": "B"},
    {"code": "FUE", "name": "Fuerteventura",      "country": "ES", "region": "Iberia",        "tier": "B"},
    # Spain — Tier C (regional)
    {"code": "OVD", "name": "Asturias",           "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "TFN", "name": "Tenerife North",     "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "GRX", "name": "Granada",            "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "REU", "name": "Reus",               "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "XRY", "name": "Jerez",              "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "EAS", "name": "San Sebastian",      "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "LEI", "name": "Almeria",            "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "VLL", "name": "Valladolid",         "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "ZAZ", "name": "Zaragoza",           "country": "ES", "region": "Iberia",        "tier": "C"},
    {"code": "SDR", "name": "Santander",          "country": "ES", "region": "Iberia",        "tier": "C"},

    # ─── Portugal ─────────────────────────────────────────────────────────
    {"code": "LIS", "name": "Lisbon",             "country": "PT", "region": "Iberia",        "tier": "A"},
    {"code": "OPO", "name": "Porto",              "country": "PT", "region": "Iberia",        "tier": "B"},
    {"code": "FAO", "name": "Faro",               "country": "PT", "region": "Iberia",        "tier": "B"},
    {"code": "FNC", "name": "Madeira",            "country": "PT", "region": "Iberia",        "tier": "B"},
    {"code": "PDL", "name": "Ponta Delgada",      "country": "PT", "region": "Iberia",        "tier": "C"},
    {"code": "TER", "name": "Terceira",           "country": "PT", "region": "Iberia",        "tier": "C"},
    {"code": "HOR", "name": "Horta",              "country": "PT", "region": "Iberia",        "tier": "C"},

    # ─── Italy — A ────────────────────────────────────────────────────────
    {"code": "FCO", "name": "Rome Fiumicino",     "country": "IT", "region": "Italy",         "tier": "A"},
    {"code": "MXP", "name": "Milan Malpensa",     "country": "IT", "region": "Italy",         "tier": "A"},
    {"code": "NAP", "name": "Naples",             "country": "IT", "region": "Italy",         "tier": "A"},
    # Italy — B
    {"code": "VCE", "name": "Venice",             "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "BGY", "name": "Bergamo",            "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "PSA", "name": "Pisa",               "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "BLQ", "name": "Bologna",            "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "TRN", "name": "Turin",              "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "PMO", "name": "Palermo",            "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "CTA", "name": "Catania",            "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "BRI", "name": "Bari",               "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "VRN", "name": "Verona",             "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "AHO", "name": "Alghero",            "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "OLB", "name": "Olbia",              "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "CAG", "name": "Cagliari",           "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "BDS", "name": "Brindisi",           "country": "IT", "region": "Italy",         "tier": "B"},
    {"code": "GOA", "name": "Genoa",              "country": "IT", "region": "Italy",         "tier": "B"},
    # Italy — C
    {"code": "FLR", "name": "Florence",           "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "SUF", "name": "Lamezia Terme",      "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "TPS", "name": "Trapani",            "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "REG", "name": "Reggio Calabria",    "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "AOI", "name": "Ancona",             "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "PEG", "name": "Perugia",            "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "TSF", "name": "Treviso",            "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "FOG", "name": "Foggia",             "country": "IT", "region": "Italy",         "tier": "C"},
    {"code": "PNL", "name": "Pantelleria",        "country": "IT", "region": "Italy",         "tier": "C"},

    # ─── France ───────────────────────────────────────────────────────────
    {"code": "CDG", "name": "Paris Charles de Gaulle", "country": "FR", "region": "France",   "tier": "A"},
    {"code": "NCE", "name": "Nice",               "country": "FR", "region": "France",        "tier": "B"},
    {"code": "ORY", "name": "Paris Orly",         "country": "FR", "region": "France",        "tier": "B"},
    {"code": "LYS", "name": "Lyon",               "country": "FR", "region": "France",        "tier": "B"},
    {"code": "MRS", "name": "Marseille",          "country": "FR", "region": "France",        "tier": "B"},
    {"code": "TLS", "name": "Toulouse",           "country": "FR", "region": "France",        "tier": "B"},
    {"code": "BOD", "name": "Bordeaux",           "country": "FR", "region": "France",        "tier": "B"},
    {"code": "BVA", "name": "Paris Beauvais",     "country": "FR", "region": "France",        "tier": "B"},
    {"code": "BIQ", "name": "Biarritz",           "country": "FR", "region": "France",        "tier": "B"},
    {"code": "NTE", "name": "Nantes",             "country": "FR", "region": "France",        "tier": "C"},
    {"code": "MPL", "name": "Montpellier",        "country": "FR", "region": "France",        "tier": "C"},
    {"code": "LIL", "name": "Lille",              "country": "FR", "region": "France",        "tier": "C"},
    {"code": "BES", "name": "Brest",              "country": "FR", "region": "France",        "tier": "C"},
    {"code": "RNS", "name": "Rennes",             "country": "FR", "region": "France",        "tier": "C"},
    {"code": "CFE", "name": "Clermont-Ferrand",   "country": "FR", "region": "France",        "tier": "C"},
    {"code": "AJA", "name": "Ajaccio",            "country": "FR", "region": "France",        "tier": "C"},
    {"code": "BIA", "name": "Bastia",             "country": "FR", "region": "France",        "tier": "C"},
    {"code": "FSC", "name": "Figari",             "country": "FR", "region": "France",        "tier": "C"},
    {"code": "PUF", "name": "Pau",                "country": "FR", "region": "France",        "tier": "C"},

    # ─── Germany (other than origins) ─────────────────────────────────────
    {"code": "BER", "name": "Berlin",             "country": "DE", "region": "Germany/Alps",  "tier": "A"},
    {"code": "MUC", "name": "Munich",             "country": "DE", "region": "Germany/Alps",  "tier": "A"},
    {"code": "FRA", "name": "Frankfurt",          "country": "DE", "region": "Germany/Alps",  "tier": "A"},
    {"code": "HAM", "name": "Hamburg",            "country": "DE", "region": "Germany/Alps",  "tier": "B"},
    {"code": "STR", "name": "Stuttgart",          "country": "DE", "region": "Germany/Alps",  "tier": "B"},
    {"code": "HAJ", "name": "Hannover",           "country": "DE", "region": "Germany/Alps",  "tier": "B"},
    {"code": "NUE", "name": "Nuremberg",          "country": "DE", "region": "Germany/Alps",  "tier": "B"},
    {"code": "LEJ", "name": "Leipzig",            "country": "DE", "region": "Germany/Alps",  "tier": "C"},
    {"code": "DRS", "name": "Dresden",            "country": "DE", "region": "Germany/Alps",  "tier": "C"},
    {"code": "BRE", "name": "Bremen",             "country": "DE", "region": "Germany/Alps",  "tier": "C"},
    {"code": "FMM", "name": "Memmingen",          "country": "DE", "region": "Germany/Alps",  "tier": "C"},
    {"code": "FKB", "name": "Karlsruhe Baden",    "country": "DE", "region": "Germany/Alps",  "tier": "C"},
    {"code": "FMO", "name": "Münster",            "country": "DE", "region": "Germany/Alps",  "tier": "C"},

    # ─── UK ───────────────────────────────────────────────────────────────
    {"code": "LHR", "name": "London Heathrow",    "country": "GB", "region": "UK & Ireland",  "tier": "A"},
    {"code": "STN", "name": "London Stansted",    "country": "GB", "region": "UK & Ireland",  "tier": "A"},
    {"code": "EDI", "name": "Edinburgh",          "country": "GB", "region": "UK & Ireland",  "tier": "A"},
    {"code": "MAN", "name": "Manchester",         "country": "GB", "region": "UK & Ireland",  "tier": "A"},
    {"code": "LGW", "name": "London Gatwick",     "country": "GB", "region": "UK & Ireland",  "tier": "B"},
    {"code": "LTN", "name": "London Luton",       "country": "GB", "region": "UK & Ireland",  "tier": "B"},
    {"code": "LCY", "name": "London City",        "country": "GB", "region": "UK & Ireland",  "tier": "B"},
    {"code": "GLA", "name": "Glasgow",            "country": "GB", "region": "UK & Ireland",  "tier": "B"},
    {"code": "BHX", "name": "Birmingham",         "country": "GB", "region": "UK & Ireland",  "tier": "B"},
    {"code": "BRS", "name": "Bristol",            "country": "GB", "region": "UK & Ireland",  "tier": "B"},
    {"code": "NCL", "name": "Newcastle",          "country": "GB", "region": "UK & Ireland",  "tier": "C"},
    {"code": "LBA", "name": "Leeds Bradford",     "country": "GB", "region": "UK & Ireland",  "tier": "C"},
    {"code": "LPL", "name": "Liverpool",          "country": "GB", "region": "UK & Ireland",  "tier": "C"},
    {"code": "EMA", "name": "East Midlands",      "country": "GB", "region": "UK & Ireland",  "tier": "C"},
    {"code": "ABZ", "name": "Aberdeen",           "country": "GB", "region": "UK & Ireland",  "tier": "C"},
    {"code": "CWL", "name": "Cardiff",            "country": "GB", "region": "UK & Ireland",  "tier": "C"},

    # ─── Ireland ──────────────────────────────────────────────────────────
    {"code": "DUB", "name": "Dublin",             "country": "IE", "region": "UK & Ireland",  "tier": "A"},
    {"code": "ORK", "name": "Cork",               "country": "IE", "region": "UK & Ireland",  "tier": "B"},
    {"code": "SNN", "name": "Shannon",            "country": "IE", "region": "UK & Ireland",  "tier": "C"},
    {"code": "NOC", "name": "Knock",              "country": "IE", "region": "UK & Ireland",  "tier": "C"},
    {"code": "KIR", "name": "Kerry",              "country": "IE", "region": "UK & Ireland",  "tier": "C"},

    # ─── Greece ───────────────────────────────────────────────────────────
    {"code": "ATH", "name": "Athens",             "country": "GR", "region": "Greece",        "tier": "A"},
    {"code": "SKG", "name": "Thessaloniki",       "country": "GR", "region": "Greece",        "tier": "B"},
    {"code": "HER", "name": "Heraklion",          "country": "GR", "region": "Greece",        "tier": "B"},
    {"code": "RHO", "name": "Rhodes",             "country": "GR", "region": "Greece",        "tier": "B"},
    {"code": "JTR", "name": "Santorini",          "country": "GR", "region": "Greece",        "tier": "B"},
    {"code": "JMK", "name": "Mykonos",            "country": "GR", "region": "Greece",        "tier": "B"},
    {"code": "CFU", "name": "Corfu",              "country": "GR", "region": "Greece",        "tier": "B"},
    {"code": "CHQ", "name": "Chania",             "country": "GR", "region": "Greece",        "tier": "B"},
    {"code": "ZTH", "name": "Zakynthos",          "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "KGS", "name": "Kos",                "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "JKL", "name": "Kalymnos",           "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "KVA", "name": "Kavala",             "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "MJT", "name": "Mytilene",           "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "JSI", "name": "Skiathos",           "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "VOL", "name": "Volos",              "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "SMI", "name": "Samos",              "country": "GR", "region": "Greece",        "tier": "C"},
    {"code": "PVK", "name": "Preveza",            "country": "GR", "region": "Greece",        "tier": "C"},

    # ─── Central Europe ───────────────────────────────────────────────────
    {"code": "VIE", "name": "Vienna",             "country": "AT", "region": "Central Europe","tier": "A"},
    {"code": "PRG", "name": "Prague",             "country": "CZ", "region": "Central Europe","tier": "A"},
    {"code": "BUD", "name": "Budapest",           "country": "HU", "region": "Central Europe","tier": "A"},
    {"code": "WAW", "name": "Warsaw",             "country": "PL", "region": "Central Europe","tier": "A"},
    {"code": "KRK", "name": "Krakow",             "country": "PL", "region": "Central Europe","tier": "B"},
    {"code": "GDN", "name": "Gdansk",             "country": "PL", "region": "Central Europe","tier": "B"},
    {"code": "KTW", "name": "Katowice",           "country": "PL", "region": "Central Europe","tier": "B"},
    {"code": "POZ", "name": "Poznan",             "country": "PL", "region": "Central Europe","tier": "C"},
    {"code": "WRO", "name": "Wroclaw",            "country": "PL", "region": "Central Europe","tier": "C"},
    {"code": "RZE", "name": "Rzeszow",            "country": "PL", "region": "Central Europe","tier": "C"},
    {"code": "SZZ", "name": "Szczecin",           "country": "PL", "region": "Central Europe","tier": "C"},
    {"code": "LCJ", "name": "Lodz",               "country": "PL", "region": "Central Europe","tier": "C"},
    {"code": "SZG", "name": "Salzburg",           "country": "AT", "region": "Central Europe","tier": "B"},
    {"code": "INN", "name": "Innsbruck",          "country": "AT", "region": "Central Europe","tier": "B"},
    {"code": "GRZ", "name": "Graz",               "country": "AT", "region": "Central Europe","tier": "C"},
    {"code": "LNZ", "name": "Linz",               "country": "AT", "region": "Central Europe","tier": "C"},
    {"code": "BRQ", "name": "Brno",               "country": "CZ", "region": "Central Europe","tier": "C"},
    {"code": "OSR", "name": "Ostrava",            "country": "CZ", "region": "Central Europe","tier": "C"},
    {"code": "BTS", "name": "Bratislava",         "country": "SK", "region": "Central Europe","tier": "B"},
    {"code": "KSC", "name": "Kosice",             "country": "SK", "region": "Central Europe","tier": "C"},
    {"code": "DEB", "name": "Debrecen",           "country": "HU", "region": "Central Europe","tier": "C"},

    # ─── Balkans ──────────────────────────────────────────────────────────
    {"code": "ZAG", "name": "Zagreb",             "country": "HR", "region": "Balkans",       "tier": "B"},
    {"code": "SPU", "name": "Split",              "country": "HR", "region": "Balkans",       "tier": "B"},
    {"code": "DBV", "name": "Dubrovnik",          "country": "HR", "region": "Balkans",       "tier": "B"},
    {"code": "ZAD", "name": "Zadar",              "country": "HR", "region": "Balkans",       "tier": "C"},
    {"code": "PUY", "name": "Pula",               "country": "HR", "region": "Balkans",       "tier": "C"},
    {"code": "RJK", "name": "Rijeka",             "country": "HR", "region": "Balkans",       "tier": "C"},
    {"code": "BEG", "name": "Belgrade",           "country": "RS", "region": "Balkans",       "tier": "B"},
    {"code": "INI", "name": "Nis",                "country": "RS", "region": "Balkans",       "tier": "C"},
    {"code": "LJU", "name": "Ljubljana",          "country": "SI", "region": "Balkans",       "tier": "B"},
    {"code": "SJJ", "name": "Sarajevo",           "country": "BA", "region": "Balkans",       "tier": "C"},
    {"code": "TZL", "name": "Tuzla",              "country": "BA", "region": "Balkans",       "tier": "C"},
    {"code": "BNX", "name": "Banja Luka",         "country": "BA", "region": "Balkans",       "tier": "C"},
    {"code": "TIA", "name": "Tirana",             "country": "AL", "region": "Balkans",       "tier": "B"},
    {"code": "SKP", "name": "Skopje",             "country": "MK", "region": "Balkans",       "tier": "C"},
    {"code": "OHD", "name": "Ohrid",              "country": "MK", "region": "Balkans",       "tier": "C"},
    {"code": "PRN", "name": "Pristina",           "country": "XK", "region": "Balkans",       "tier": "C"},
    {"code": "TGD", "name": "Podgorica",          "country": "ME", "region": "Balkans",       "tier": "C"},
    {"code": "TIV", "name": "Tivat",              "country": "ME", "region": "Balkans",       "tier": "C"},

    # ─── Romania / Bulgaria / Cyprus / Malta ──────────────────────────────
    {"code": "OTP", "name": "Bucharest",          "country": "RO", "region": "SE Europe",     "tier": "B"},
    {"code": "CLJ", "name": "Cluj-Napoca",        "country": "RO", "region": "SE Europe",     "tier": "B"},
    {"code": "TSR", "name": "Timisoara",          "country": "RO", "region": "SE Europe",     "tier": "C"},
    {"code": "IAS", "name": "Iasi",               "country": "RO", "region": "SE Europe",     "tier": "C"},
    {"code": "SBZ", "name": "Sibiu",              "country": "RO", "region": "SE Europe",     "tier": "C"},
    {"code": "SOF", "name": "Sofia",              "country": "BG", "region": "SE Europe",     "tier": "B"},
    {"code": "VAR", "name": "Varna",              "country": "BG", "region": "SE Europe",     "tier": "C"},
    {"code": "BOJ", "name": "Burgas",             "country": "BG", "region": "SE Europe",     "tier": "C"},
    {"code": "PDV", "name": "Plovdiv",            "country": "BG", "region": "SE Europe",     "tier": "C"},
    {"code": "LCA", "name": "Larnaca",            "country": "CY", "region": "SE Europe",     "tier": "B"},
    {"code": "PFO", "name": "Paphos",             "country": "CY", "region": "SE Europe",     "tier": "C"},
    {"code": "MLA", "name": "Malta",              "country": "MT", "region": "SE Europe",     "tier": "B"},

    # ─── Nordics ──────────────────────────────────────────────────────────
    {"code": "CPH", "name": "Copenhagen",         "country": "DK", "region": "Nordics",       "tier": "A"},
    {"code": "ARN", "name": "Stockholm Arlanda",  "country": "SE", "region": "Nordics",       "tier": "B"},
    {"code": "OSL", "name": "Oslo",               "country": "NO", "region": "Nordics",       "tier": "B"},
    {"code": "HEL", "name": "Helsinki",           "country": "FI", "region": "Nordics",       "tier": "B"},
    {"code": "KEF", "name": "Reykjavik",          "country": "IS", "region": "Nordics",       "tier": "B"},
    {"code": "BLL", "name": "Billund",            "country": "DK", "region": "Nordics",       "tier": "C"},
    {"code": "AAL", "name": "Aalborg",            "country": "DK", "region": "Nordics",       "tier": "C"},
    {"code": "AAR", "name": "Aarhus",             "country": "DK", "region": "Nordics",       "tier": "C"},
    {"code": "BGO", "name": "Bergen",             "country": "NO", "region": "Nordics",       "tier": "C"},
    {"code": "SVG", "name": "Stavanger",          "country": "NO", "region": "Nordics",       "tier": "C"},
    {"code": "TRD", "name": "Trondheim",          "country": "NO", "region": "Nordics",       "tier": "C"},
    {"code": "TOS", "name": "Tromso",             "country": "NO", "region": "Nordics",       "tier": "C"},
    {"code": "GOT", "name": "Gothenburg",         "country": "SE", "region": "Nordics",       "tier": "C"},
    {"code": "MMX", "name": "Malmo",              "country": "SE", "region": "Nordics",       "tier": "C"},
    {"code": "TKU", "name": "Turku",              "country": "FI", "region": "Nordics",       "tier": "C"},
    {"code": "RVN", "name": "Rovaniemi",          "country": "FI", "region": "Nordics",       "tier": "C"},
    {"code": "OUL", "name": "Oulu",               "country": "FI", "region": "Nordics",       "tier": "C"},
    {"code": "TLL", "name": "Tallinn",            "country": "EE", "region": "Nordics",       "tier": "C"},
    {"code": "RIX", "name": "Riga",               "country": "LV", "region": "Nordics",       "tier": "C"},
    {"code": "VNO", "name": "Vilnius",            "country": "LT", "region": "Nordics",       "tier": "C"},
    {"code": "KUN", "name": "Kaunas",             "country": "LT", "region": "Nordics",       "tier": "C"},
    {"code": "PLQ", "name": "Palanga",            "country": "LT", "region": "Nordics",       "tier": "C"},

    # ─── Alps / Switzerland / Lux ─────────────────────────────────────────
    {"code": "ZRH", "name": "Zurich",             "country": "CH", "region": "Germany/Alps",  "tier": "B"},
    {"code": "GVA", "name": "Geneva",             "country": "CH", "region": "Germany/Alps",  "tier": "B"},
    {"code": "BSL", "name": "Basel",              "country": "CH", "region": "Germany/Alps",  "tier": "B"},
    {"code": "LUX", "name": "Luxembourg",         "country": "LU", "region": "Germany/Alps",  "tier": "C"},

    # ─── Türkiye ──────────────────────────────────────────────────────────
    {"code": "IST", "name": "Istanbul",           "country": "TR", "region": "Türkiye",       "tier": "A"},
    {"code": "SAW", "name": "Istanbul Sabiha",    "country": "TR", "region": "Türkiye",       "tier": "B"},
    {"code": "AYT", "name": "Antalya",            "country": "TR", "region": "Türkiye",       "tier": "B"},
    {"code": "ADB", "name": "Izmir",              "country": "TR", "region": "Türkiye",       "tier": "B"},
    {"code": "ESB", "name": "Ankara",             "country": "TR", "region": "Türkiye",       "tier": "C"},
    {"code": "BJV", "name": "Bodrum",             "country": "TR", "region": "Türkiye",       "tier": "C"},
    {"code": "DLM", "name": "Dalaman",            "country": "TR", "region": "Türkiye",       "tier": "C"},
    {"code": "GZT", "name": "Gaziantep",          "country": "TR", "region": "Türkiye",       "tier": "C"},
    {"code": "KYA", "name": "Konya",              "country": "TR", "region": "Türkiye",       "tier": "C"},
    {"code": "TZX", "name": "Trabzon",            "country": "TR", "region": "Türkiye",       "tier": "C"},

    # ─── North Africa / Levant ────────────────────────────────────────────
    {"code": "RAK", "name": "Marrakech",          "country": "MA", "region": "N. Africa",     "tier": "A"},
    {"code": "AGA", "name": "Agadir",             "country": "MA", "region": "N. Africa",     "tier": "B"},
    {"code": "TNG", "name": "Tangier",            "country": "MA", "region": "N. Africa",     "tier": "B"},
    {"code": "CMN", "name": "Casablanca",         "country": "MA", "region": "N. Africa",     "tier": "B"},
    {"code": "FEZ", "name": "Fes",                "country": "MA", "region": "N. Africa",     "tier": "C"},
    {"code": "NDR", "name": "Nador",              "country": "MA", "region": "N. Africa",     "tier": "C"},
    {"code": "OZZ", "name": "Ouarzazate",         "country": "MA", "region": "N. Africa",     "tier": "C"},
    {"code": "TUN", "name": "Tunis",              "country": "TN", "region": "N. Africa",     "tier": "B"},
    {"code": "DJE", "name": "Djerba",             "country": "TN", "region": "N. Africa",     "tier": "C"},
    {"code": "MIR", "name": "Monastir",           "country": "TN", "region": "N. Africa",     "tier": "C"},
    {"code": "HRG", "name": "Hurghada",           "country": "EG", "region": "N. Africa",     "tier": "B"},
    {"code": "SSH", "name": "Sharm el-Sheikh",    "country": "EG", "region": "N. Africa",     "tier": "B"},
    {"code": "CAI", "name": "Cairo",              "country": "EG", "region": "N. Africa",     "tier": "C"},
    {"code": "TLV", "name": "Tel Aviv",           "country": "IL", "region": "Levant",        "tier": "A"},
    {"code": "AMM", "name": "Amman",              "country": "JO", "region": "Levant",        "tier": "C"},
    {"code": "SID", "name": "Sal",                "country": "CV", "region": "Atlantic",      "tier": "C"},
    {"code": "RAI", "name": "Praia",              "country": "CV", "region": "Atlantic",      "tier": "C"},

    # ─── Caucasus ─────────────────────────────────────────────────────────
    {"code": "TBS", "name": "Tbilisi",            "country": "GE", "region": "Caucasus",      "tier": "C"},
    {"code": "KUT", "name": "Kutaisi",            "country": "GE", "region": "Caucasus",      "tier": "C"},
    {"code": "EVN", "name": "Yerevan",            "country": "AM", "region": "Caucasus",      "tier": "C"},
    {"code": "GYD", "name": "Baku",               "country": "AZ", "region": "Caucasus",      "tier": "C"},

    # ─── Gulf ─────────────────────────────────────────────────────────────
    {"code": "DXB", "name": "Dubai",              "country": "AE", "region": "Gulf",          "tier": "C"},
    {"code": "AUH", "name": "Abu Dhabi",          "country": "AE", "region": "Gulf",          "tier": "C"},
    {"code": "DOH", "name": "Doha",               "country": "QA", "region": "Gulf",          "tier": "C"},
]


# ─── Helpers ──────────────────────────────────────────────────────────────


def origin_codes() -> list[str]:
    return [o["code"] for o in ORIGINS]


def destination_codes() -> list[str]:
    return [d["code"] for d in DESTINATIONS]


def expand_routes() -> list[tuple[str, str, str]]:
    """
    Yield (origin, destination, tier) for every valid route in the pool.

    Skips origin==destination (e.g. AMS->AMS).
    """
    skip = set(origin_codes())
    demote = {"A": "B", "B": "C", "C": "C"}
    routes = []
    for o in ORIGINS:
        for d in DESTINATIONS:
            if d["code"] in skip:
                continue  # don't scrape e.g. EIN->AMS (a hub route, not useful as deal)
            tier = demote[d["tier"]] if o.get("demote_tier") else d["tier"]
            routes.append((o["code"], d["code"], tier))
    return routes


def summary() -> dict:
    """Quick stats for logging."""
    tiers = {"A": 0, "B": 0, "C": 0}
    for d in DESTINATIONS:
        tiers[d["tier"]] = tiers.get(d["tier"], 0) + 1
    routes = expand_routes()
    return {
        "origins": len(ORIGINS),
        "destinations": len(DESTINATIONS),
        "dests_by_tier": tiers,
        "total_routes": len(routes),
        "routes_by_tier": {
            "A": sum(1 for r in routes if r[2] == "A"),
            "B": sum(1 for r in routes if r[2] == "B"),
            "C": sum(1 for r in routes if r[2] == "C"),
        },
    }


if __name__ == "__main__":
    import json
    print(json.dumps(summary(), indent=2))
