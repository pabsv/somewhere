# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js Frontend  (port 4173)                                  │
│  Home: DealsCalendar    Deals: DealCard list    Settings: prefs │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST JSON
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  FastAPI  (port 9000)                                           │
│  GET  /api/deals          → filtered flights from MongoDB       │
│  GET  /api/preferences    → user prefs                         │
│  PUT  /api/preferences    → save user prefs                    │
│  POST /api/scrape         → trigger scrape job (background)     │
│  GET  /api/scrape/status  → poll scrape progress               │
│  GET  /health             → health check                       │
└────────────────────────┬────────────────────────────────────────┘
                         │ pymongo
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  MongoDB (local)                                                │
│  users · availability · destination_preferences                 │
│  flights                                                        │
└────────────────────────▲────────────────────────────────────────┘
                         │ write
                         │
┌─────────────────────────────────────────────────────────────────┐
│  Python Pipeline                                                │
│  AzairScraper → FlightService → UserMatcher → deal scoring      │
│  run_pipeline.py  (manual)  or  scheduler/scheduler.py  (daily) │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### Scraper (`scraper-azair/`)

`AzairScraper.search_all()` builds Azair URLs per origin/destination/date-range, fetches HTML, parses results with BeautifulSoup.

- Multi-origin: EIN, AMS, BRU, DUS, CGN
- 57 European & North African destinations
- Retry with exponential backoff (3 attempts)
- Rate limiting between requests
- Returns `list[Flight]` dataclass objects with `azair_link`

### Pipeline (`run_pipeline.py`)

Orchestrates: scraper → FlightService → UserMatcher.

```bash
python run_pipeline.py           # EIN+AMS → BCN/LIS/ATH (quick)
python run_pipeline.py --full    # all 5 origins, 57 destinations
python run_pipeline.py --origin EIN
```

### Database (`database/`)

MongoDB via pymongo. No ORM.

| Collection | Purpose |
|------------|---------|
| `users` | Single local user; airports, notification prefs, search prefs |
| `availability` | Date ranges (start, end) the user can travel |
| `destination_preferences` | IATA codes the user wants to fly to |
| `flights` | All scraped flights; `flight_key` unique index for dedup |

**Deal scoring** (`database/services/flight_service.py`):
- A flight is a deal if its price is at or below `DEAL_PRICE_THRESHOLD` (default €200, overridden by the user's `max_price` setting)
- `deal_score` (0–100) = how far below the threshold the price is

**User matching** (`database/services/user_matcher.py`):
- Checks if flight dates overlap with any availability window
- 70% overlap rule: trip can be at most 70% of the availability window length
- Returns list of matching flights for the default user

### API (`api/`)

FastAPI, single-user, no auth. Auto-creates default user on startup.

**`GET /api/deals`** — returns all flights that match the user's preferences (via UserMatcher). Sorted by deal_score desc.

**`GET/PUT /api/preferences`** — reads/writes user document from MongoDB. Shape:
```json
{
  "home_airport": "EIN",
  "nearby_airports": ["AMS", "BRU", "DUS"],
  "destinations": ["BCN", "LIS", "ATH"],
  "availability": [{ "start": "2026-03-01", "end": "2026-03-15" }],
  "max_price": 150,
  "direct_only": false
}
```

**`POST /api/scrape`** — starts pipeline in a background thread. Returns immediately. Poll `/api/scrape/status` for progress.

### Frontend (`frontend/`)

Next.js 16 + React 19 + Tailwind 4. App router. No state management library.

**Pages:**
- `/` — `DealsCalendar`: 6-month horizontal scroll, deal bars per destination, hover tooltip, click modal with "Book" + "View alternatives"
- `/deals` — `DealCard` grid with filters (destination, price, direct-only, sort)
- `/settings` — `TwoMonthCalendar` (availability picker), `AirportSelector`, `DestinationPicker`, `TripPreferences`, scrape trigger button

**Key abstractions:**
- `frontend/lib/api.ts` — all API calls in one place. Set `USE_MOCK = false` to use real API. `transformFlight()` normalises backend fields.
- `frontend/data/colors.ts` — deterministic IATA code → Tailwind colour (polynomial hash, 16-colour palette)
- `frontend/data/destinations.ts` / `airports.ts` — static lookup tables for display names

**Calendar components:**
- `DealsCalendar.tsx` — deals view; deduplicates to best deal per destination+dates, row-stacking layout
- `TwoMonthCalendar.tsx` — availability picker; drag-to-select, click-to-remove, same scroll layout

### Scheduler (`scheduler/`)

APScheduler with staggered daily jobs:

```
06:00 EIN  06:15 AMS  06:30 BRU  06:45 DUS  07:00 CGN
```

```bash
python -m scheduler.scheduler        # daemon
python -m scheduler.scheduler --now  # run all now, then schedule
python -m scheduler.scheduler --test # run all once and exit
```

---

## Data Flow

```
User saves preferences in settings
    → PUT /api/preferences → MongoDB

Scheduler (or manual trigger) runs pipeline
    → AzairScraper fetches flights for user's destinations + availability dates
    → FlightService saves to MongoDB, updates route_stats, scores deals
    → UserMatcher flags which flights match user availability

User opens app / refreshes
    → GET /api/deals → UserMatcher → MongoDB → transformFlight() → DealsCalendar
```

---

## Port Reference

| Service | Port |
|---------|------|
| Next.js dev | 4173 |
| FastAPI | 9000 (default in frontend; set `NEXT_PUBLIC_API_URL` in `.env.local` to override) |
| MongoDB | 27017 (local) |

---

## Dependencies

**Python (root-level, install once):**
```bash
pip install fastapi uvicorn pymongo bcrypt python-dotenv apscheduler requests beautifulsoup4 lxml
```

**Frontend:**
```bash
cd frontend && npm install
```
