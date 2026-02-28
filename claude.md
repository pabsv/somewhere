# Flight Scraper — AI Context

Personal flight deal finder. Scrapes Azair daily, detects deals, surfaces them in a Next.js dashboard deployed on Vercel.

---

## Current Status

| Phase | What | Status |
|-------|------|--------|
| 1 | Azair scraper (multi-origin, 57 destinations, retry, rate-limit) | ✅ Complete |
| 2 | MongoDB layer (models, repos, price history, route stats) | ✅ Complete |
| 3 | Deal detection (scoring 0–100, user availability matching) | ✅ Complete |
| 4 | Scheduler (APScheduler, staggered daily by origin) | ✅ Complete |
| 5 | Email notifications | 🔴 Not started |
| 6 | Next.js API routes (auth, deals, preferences, admin) | ✅ Complete — FastAPI no longer needed by frontend |
| 7 | Next.js dashboard (calendar, deals, settings) | ✅ Deployed on Vercel |
| 8 | Deploy | ✅ Frontend on Vercel, DB on Atlas, scheduler on home PC |

---

## Architecture

```
Vercel (Next.js frontend)
    ↕  Next.js API routes
MongoDB Atlas (flight_scraper database)
    ↕  pymongo
Home PC (Python scheduler + scraper)
```

Frontend and backend never talk directly — both connect to Atlas. Same pattern as Boulevard Connection.

---

## How to Run

```bash
# Frontend — deployed on Vercel (production)
# Local dev:
cd frontend && npm run dev        # http://localhost:4173

# Scheduler (home PC — run from project root with MONGODB_URI set)
python -m scheduler.scheduler --simulate      # 60 min/cycle (dev)
python -m scheduler.scheduler                 # 24h/cycle (production)
python -m scheduler.scheduler --test          # run all origins once and exit
python -m scheduler.scheduler --test EIN      # run single origin once and exit

# FastAPI (local only — not needed by deployed frontend)
uvicorn api.main:app --reload --port 9000
```

---

## Key Files

```
flight-scraper/
├── .env                       # MONGODB_URI for Python backend (gitignored)
├── database/config.py         # MONGODB_URI env var → Atlas connection string
├── database/services/
│   ├── flight_service.py      # Save flights, score deals
│   └── user_matcher.py        # Match flights to user availability (70% rule)
├── scheduler/scheduler.py     # APScheduler daemon — writes to schedule_state
├── scraper-azair/scraper.py   # AzairScraper class
└── frontend/
    ├── .env.local             # MONGODB_URI for Next.js (gitignored)
    ├── lib/mongodb.ts         # Cached Atlas connection utility
    ├── lib/api.ts             # All API calls (relative paths, no FastAPI)
    ├── app/api/               # Next.js API routes (replaces FastAPI for frontend)
    │   ├── auth/login/        # POST — find or create user
    │   ├── auth/me/           # GET — validate session
    │   ├── deals/             # GET — UserMatcher logic in TypeScript
    │   ├── preferences/       # GET + PUT — read/write user prefs
    │   └── admin/             # schedule, clear, users
    ├── app/page.tsx           # Home — DealsCalendar
    ├── app/deals/page.tsx     # Deals list with filters
    ├── app/settings/page.tsx  # Preferences (collapsible availability section)
    ├── app/admin/page.tsx     # Scheduler timeline, clear data, users
    ├── components/calendar/DealsCalendar.tsx
    ├── components/calendar/TwoMonthCalendar.tsx
    ├── components/settings/AirportSelector.tsx
    └── components/settings/DestinationPicker.tsx
```

---

## Key Config

- **Deal thresholds:** <€100 or 20% below route avg = deal
- **Trip duration:** 70% rule (window × 0.7 = min trip length, window = max)
- **Frontend:** Vercel — https://flights-[hash].vercel.app
- **Database:** MongoDB Atlas — `flight_scraper` db, cluster `flightinitialsetup`
- **Local dev frontend port:** 4173

---

## Architectural Decisions

- Azair only — Kiwi dropped (too rate-limited)
- Multi-user, no password — identity via `X-User-ID` header (stored in localStorage). Login is name + email only.
- Frontend connects directly to Atlas via Next.js API routes (serverless) — no backend HTTP server needed
- Scheduler writes state to `schedule_state` collection in Atlas — admin page reads it directly
- FastAPI (`api/`) still exists and works locally but is not used by the deployed frontend
- Scheduler reads user airports/destinations from Atlas at runtime (respects live preference changes)
- Frontend deduplicates deals on calendar view (best per destination+outbound+return dates)
- `buildAzairSearchUrl()` in `lib/api.ts` builds ±3 day flexible search URLs
- All datetime ISO strings from backend get `+ "Z"` suffix so JS parses as UTC
