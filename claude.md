# Flight Scraper — AI Context

Personal flight deal finder. Scrapes Azair daily, detects deals, surfaces them in a Next.js dashboard.
Single user, local-first. See `ARCHITECTURE.md`, `VISION.md`, `TODO.md` for full docs.

---

## Current Status

| Phase | What | Status |
|-------|------|--------|
| 1 | Azair scraper (multi-origin, 57 destinations, retry, rate-limit) | ✅ Complete |
| 2 | MongoDB layer (models, repos, price history, route stats) | ✅ Complete |
| 3 | Deal detection (scoring 0–100, user availability matching) | ✅ Complete |
| 4 | Scheduler (APScheduler, staggered daily by origin) | ✅ Complete |
| 5 | Email notifications | 🔴 Not started |
| 6 | FastAPI (deals, preferences, scrape trigger endpoints) | ✅ Complete |
| 7 | Next.js dashboard (calendar, deals, settings) | ✅ Done — connected to real API |
| 8 | Polish & deploy | 🔴 Not started |

**Frontend is connected to real API** (`USE_MOCK = false` in `frontend/lib/api.ts`).

---

## How to Run

```bash
# API (from project root)
uvicorn api.main:app --reload --port 9000

# Frontend
cd frontend && npm run dev        # http://localhost:4173

# Manual scrape
python run_pipeline.py            # quick test (EIN+AMS → BCN/LIS/ATH)
python run_pipeline.py --full     # full scan (5 origins, 57 destinations)

# Scheduler — starts automatically inside the API process (simulate mode, 60 min/cycle)
# Standalone CLI if needed:
python -m scheduler.scheduler                 # production: 1 cycle per 24h
python -m scheduler.scheduler --simulate      # simulate: 1 cycle per 60 min
python -m scheduler.scheduler --now           # run all immediately, then schedule
python -m scheduler.scheduler --test          # run all once and exit
python -m scheduler.scheduler --test EIN      # run single origin once and exit
```

---

## Key Files

```
flight-scraper/
├── run_pipeline.py            # Scraper → DB → deal detection pipeline
├── api/main.py                # FastAPI app (port 9000)
├── api/routes/                # deals.py, preferences.py, scrape.py
├── database/
│   ├── models/                # User, Flight, Availability, etc.
│   ├── repositories/          # CRUD for each model
│   └── services/
│       ├── flight_service.py  # Save flights, score deals
│       └── user_matcher.py    # Match flights to user availability (70% overlap rule)
├── scheduler/scheduler.py     # APScheduler daemon
├── scraper-azair/scraper.py   # AzairScraper class
└── frontend/
    ├── app/page.tsx           # Home — DealsCalendar
    ├── app/deals/page.tsx     # Deals list with filters
    ├── app/settings/page.tsx  # Preferences + scrape trigger
    ├── lib/api.ts             # API abstraction (USE_MOCK, buildAzairSearchUrl)
    ├── components/calendar/DealsCalendar.tsx
    ├── components/calendar/TwoMonthCalendar.tsx  # Availability picker
    ├── components/settings/AirportSelector.tsx
    └── components/settings/DestinationPicker.tsx
```

---

## Key Config

- **Deal thresholds:** <€100 or 20% below route avg = deal; <€75 or 30% below = hot deal
- **Trip duration:** 70% overlap rule (availability window × 0.7 = max trip length)
- **API port:** 9000 (frontend default); set `NEXT_PUBLIC_API_URL` in `.env.local` to override
- **Frontend port:** 4173

---

## Architectural Decisions

- Azair only — Kiwi dropped (was too rate-limited)
- Multi-user, no password — identity via `X-User-ID` header (user_id from localStorage). Login is name + email only.
- Auth endpoints: `POST /api/auth/login`, `GET /api/auth/me`. All other endpoints require `X-User-ID` header.
- Scraper is decoupled from API (can run standalone via `run_pipeline.py`)
- Frontend deduplicates deals on calendar view (best per destination+dates combo)
- `buildAzairSearchUrl()` in `lib/api.ts` builds ±3 day flexible search URLs
