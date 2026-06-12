# Flight Scraper — AI Context

Personal flight deal finder. Scrapes Azair daily, detects deals, surfaces them in a Next.js dashboard deployed on Vercel.

---

## Current Status

| Phase | What | Status |
|-------|------|--------|
| 1 | Azair scraper (multi-origin, 57 destinations, retry, rate-limit) | ✅ Complete |
| 2 | MongoDB layer (models, repos, price history, route stats) | ✅ Complete |
| 3 | Deal detection (scoring 0–100, user availability matching) | ✅ Complete |
| 4 | Scheduler — legacy user-driven (`scheduler/scheduler.py`) | ✅ Still works but superseded by pool scheduler |
| 4b | **Pool scheduler — target-driven, multi-user-ready** (`scheduler/pool_scheduler.py`) | ✅ Deployed 2026-06-10 on Linux box (`pablopc`) as systemd service |
| 5 | Email notifications | 🔴 Not started |
| 6 | Next.js API routes (auth, deals, preferences, admin) | ✅ Complete — FastAPI no longer needed by frontend |
| 7 | Next.js dashboard (calendar, deals, settings) | ✅ Deployed on Vercel |
| 8 | Deploy — frontend (Vercel) + DB (Atlas) + scheduler (Linux box) | ✅ Frontend on Vercel; pool scheduler live on `pablopc` (Tailscale 100.101.234.37) at `/mnt/hdd/flight-scraper`, systemd `flight-scraper.service` (Nice=10/CPUWeight=20 — StudentSpot keeps priority), daily 07:10 restart timer. Runbook: `deploy/DEPLOY.md` |
| **v1** | **"Somewhere" rebuild** — data-layer v2 (flight_key drops price, embedded price_points, p50 EWMA baseline, read-time scoring), new IA (Explore / Calendar / City / Settings / Admin), NextAuth credentials, departure-board design system | ✅ Built + verified locally (commit `2c5126c`). Spec `docs/DESIGN_V1.md`, progress `docs/V1_PROGRESS.md`. Atlas migrated via `scripts/migrate_v2.py` (2026-06-10). Frontend builds green (16 routes + middleware). Preview deployed; **production promotion pending user OK** |

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
# ─── Frontend ────────────────────────────────────────────────────────────
# Deployed on Vercel (production). Local dev:
cd frontend && npm run dev        # http://localhost:4173

# ─── Pool scheduler (NEW — production path) ──────────────────────────────
# Pool-based, user-agnostic. Pulls due routes from `scrape_targets`.
indexes           # one-time: create indexes + TTLs on Atlas
seed              # one-time: upsert 1380 routes into scrape_targets (staggered 24h)
seed --stats      # show pool stats
pool              # continuous loop, 07:00–23:00 local, 2-min slots
pool --once       # claim & scrape one due route, exit
pool --route EIN BCN  # force-run a specific route, exit
pool --dry-run    # list next 20 due routes, scrape nothing

# Full commands behind the shortcuts:
python -m database.setup_indexes
python -m scripts.seed_targets [--stagger MIN] [--prune | --prune-delete] [--stats]
python -m scheduler.pool_scheduler [--once | --route O D | --dry-run | --direct-only]

# ─── Legacy user-driven scheduler (still works, but not the prod path) ───
simulate          # 60 min/cycle dev mode
scrape            # run all origins once and exit
scrape EIN        # run single origin once

# ─── Misc ────────────────────────────────────────────────────────────────
api               # FastAPI on port 9000 (rarely needed)
uvicorn api.main:app --reload --port 9000
```

> Shortcuts are `.bat` files in the project root — work in cmd, PowerShell, and Git Bash.

---

## Key Files

```
flight-scraper/
├── .env                          # MONGODB_URI for Python backend (gitignored)
├── database/config.py            # MONGODB_URI env, collection names, pool cadence/window config
├── database/setup_indexes.py     # All indexes incl. TTLs (flights 14d, scrape_runs 30d, price_history 180d)
├── database/models/
│   ├── flight.py                 # FlightModel — stored in flights collection
│   ├── scrape_target.py          # ScrapeTargetModel — pool route + scheduling state
│   └── scrape_run.py             # ScrapeRunModel — per-execution log
├── database/repositories/
│   ├── flight_repo.py            # flights CRUD + bulk_upsert
│   ├── scrape_target_repo.py     # claim_next_due / record_run_result / bulk_upsert_seed
│   └── scrape_run_repo.py        # start / finish / recent / stats_last_24h
├── database/services/
│   ├── flight_service.py         # Save flights, score deals
│   └── user_matcher.py           # Match flights to user availability (70% rule)
├── scraper/targets.py            # POOL definition — 6 ORIGINS + 230 DESTINATIONS w/ tiers
├── scripts/seed_targets.py       # Seed `scrape_targets` from targets.py (idempotent)
├── scheduler/
│   ├── scheduler.py              # LEGACY user-driven scheduler — still works
│   └── pool_scheduler.py         # NEW pool scheduler (production path)
├── scraper-azair/scraper.py      # AzairScraper class (legacy backend)
├── scraper-fli/scraper.py        # FliScraper — Google Flights via fli library
│                                 #   + search_one_route() for pool mode
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

- **Pool scraping (2026-05-28):** decoupled scraping from users. Pool of 1380 (origin, dest) routes lives in `scrape_targets`, tier A/B/C cadenced (24h / 72h / 168h). Scheduler claims one route per 2-min slot, 07-23 local. Users will be matched to the pool later, but scraping does not depend on user prefs.
- **Origins (6):** EIN, AMS, BRU, DUS, NRN, CRL — top 5 closest to Eindhoven with usable route coverage, plus EIN.
- **Destinations (230):** Europe + N.Africa + Levant + Türkiye + Atlantic. Curated in `scraper/targets.py`. Tier A=28 popular, B=84 mid, C=118 long-tail.
- **Per-route scrape recipe:** 3 trip-duration buckets (3d / 7d / 10d) × 2 sub-windows for Phase 1 SearchDates = 6 calls. Phase 2 fetches top 6 cheapest date combos = 6 SearchFlights calls. ≈12 fli HTTP calls per route per cycle.
- **TTL cleanup:** `flights.last_seen_at` 14d (re-scraping refreshes the touch), `scrape_runs.started_at` 30d, `price_history.scraped_at` 180d. Past-date trips drop naturally because SearchDates only returns future dates.
- **Auto-disable:** a route is `enabled=false` after 5 consecutive empty/error runs. `seed --prune` resets orphans; `repo.reenable_all()` resurrects disabled routes.
- **Fli backend:** `scraper-fli/scraper.py`. Single instance per slot. No NordVPN rotation yet — add only if Google starts rate-limiting (DormSpot pattern).
- Azair only — Kiwi dropped (too rate-limited). Azair scraper kept as fallback backend.
- Multi-user, no password — identity via `X-User-ID` header (stored in localStorage). Login is name + email only.
- Frontend connects directly to Atlas via Next.js API routes (serverless) — no backend HTTP server needed
- Legacy `scheduler/scheduler.py` writes state to `schedule_state` and reads from user prefs at runtime. Still works, but pool scheduler is the production path now.
- FastAPI (`api/`) still exists and works locally but is not used by the deployed frontend
- Frontend deduplicates deals on calendar view (best per destination+outbound+return dates)
- `buildAzairSearchUrl()` in `lib/api.ts` builds ±3 day flexible search URLs
- All datetime ISO strings from backend get `+ "Z"` suffix so JS parses as UTC
