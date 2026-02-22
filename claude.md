# Flight Scraper Project

## Project Overview
A flight deal finder that scrapes cheap flights based on user availability and sends email alerts when great deals are found.

**Final Vision:** Users go on a website, create an account, input their availability in a calendar view, set their home airport + nearby ones, and preferred destinations. The scraper runs daily, checks all routes, and sends email alerts (daily digest or instant hot deals). A dashboard shows all matching deals.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Independent)                            │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────┐    │
│  │   Calendar View         │    │   Deals Dashboard                   │    │
│  │   - Select availability │    │   - View all matching deals         │    │
│  │   - Highlight date      │    │   - Filter by destination/price     │    │
│  │     ranges              │    │   - Click through to book           │    │
│  └─────────────────────────┘    └─────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ JSON (REST API)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API LAYER (Contract)                               │
│         The bridge between frontend and backend - defines data format       │
│         Auth • User Profile • Availability • Destinations • Deals          │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Independent)                               │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Scheduler   │─►│   Scraper    │─►│   Database   │─►│    Email     │   │
│  │  (daily)     │  │  (Azair)     │  │  (MongoDB)   │  │  (alerts)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                             │                              │
│                                             ▼                              │
│                                    ┌──────────────┐                        │
│                                    │ Deal Detect  │                        │
│                                    │ User Match   │                        │
│                                    └──────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Principle:** Each block works independently before integration.
- Frontend can be built with mock data, then connected to API
- Backend (scraper → db → email) works without any frontend
- API is the contract that connects them

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend/Scraping | Python (requests, BeautifulSoup) |
| API | FastAPI (Python) |
| Frontend | Next.js + React |
| Database | MongoDB |
| Email | Gmail SMTP |
| Scheduling | APScheduler (Python) |
| Hosting | Local machine (Windows) → Cloud later |

---

## Master Plan - Building Blocks

### Phase 1: Robust Scraper Foundation ✅ COMPLETE
**Goal:** A bulletproof scraper that can run reliably for hours

| Step | Task | Status |
|------|------|--------|
| 1.1 | Basic scraping & parsing | ✅ Done |
| 1.2 | Retry logic & error handling | ✅ Done |
| 1.3 | Multi-origin support (EIN + AMS + nearby) | ✅ Done |
| 1.4 | Expanded European destinations (~30-40) | ✅ Done (57 airports) |
| 1.5 | Rate limiting (configurable delays) | ✅ Done |
| 1.6 | Proper logging (not just print) | ✅ Done |
| 1.7 | JSON output format (database-ready) | ✅ Done |
| 1.8 | Direct flights filter option | ✅ Done |

**Usage Example:**
```python
from scraper import AzairScraper, DateRange
from datetime import datetime

scraper = AzairScraper()
results = scraper.search_all(
    origins=["EIN", "AMS", "BRU"],
    destinations=["BCN", "BUD", "LIS", "ATH"],
    date_ranges=[
        DateRange(start=datetime(2026, 3, 1), end=datetime(2026, 3, 15)),
        DateRange(start=datetime(2026, 4, 10), end=datetime(2026, 4, 25)),
    ],
    min_days=2,
    max_days=7,
    direct_only=False,
)
# Returns list of Flight objects with azair_link for booking
```

---

### Phase 2: Database Layer ✅ COMPLETE
**Goal:** Store users, preferences, and flight data

| Step | Task | Status |
|------|------|--------|
| 2.1 | MongoDB setup (local) | ✅ Done |
| 2.2 | User model (email, password, airports) | ✅ Done |
| 2.3 | Availability model (date ranges) | ✅ Done |
| 2.4 | Destination preferences model | ✅ Done |
| 2.5 | Flight deals model (with history) | ✅ Done |
| 2.6 | Price history model (for trends) | ✅ Done |

---

### Phase 3: Smart Deal Detection ✅ COMPLETE
**Goal:** Know what makes a flight a "deal" worth alerting

| Step | Task | Status |
|------|------|--------|
| 3.1 | Connect scraper → database | ✅ Done (run_pipeline.py) |
| 3.2 | User matching logic (availability check) | ✅ Done (UserMatcher service) |
| 3.3 | Deal scoring (price vs route average) | ✅ Done (FlightService) |
| 3.4 | Price drop detection | ✅ Done (price_history tracking) |
| 3.5 | Deduplication | ✅ Done (flight_key unique index) |

**Usage:**
```bash
python run_pipeline.py          # Quick test (2 origins, 3 destinations)
python run_pipeline.py --full   # Full scan (all configured airports)
```

**Test Results (Feb 16, 2026):**
- 466 flights scraped → 407 new, 59 updated
- 106 deals detected (65 hot deals)
- Deal scoring working (score 0-100 based on price + route average)

---

### Phase 4: Scheduler ✅ COMPLETE
**Goal:** Automated daily runs

| Step | Task | Status |
|------|------|--------|
| 4.1 | Job scheduler setup (APScheduler) | ✅ Done |
| 4.2 | Staggered daily jobs (by origin) | ✅ Done |
| 4.3 | Single-origin pipeline support | ✅ Done |
| 4.4 | Logging to file + console | ✅ Done |

**Staggered Schedule (15-min intervals):**
```
06:00 - EIN (Eindhoven)
06:15 - AMS (Amsterdam)
06:30 - BRU (Brussels)
06:45 - DUS (Düsseldorf)
07:00 - CGN (Cologne)
```

**Usage:**
```bash
python -m scheduler.scheduler              # Start scheduler daemon
python -m scheduler.scheduler --test       # Test all origins once
python -m scheduler.scheduler --test EIN   # Test single origin
```

**Test Results (Feb 16, 2026):**
- EIN alone: 41 searches, 3593 flights, 849 deals in ~10 minutes
- Full 5-origin scan estimated: ~50 minutes total (spread over 1 hour)

---

### Phase 5: Email Notifications
**Goal:** Users get notified about deals

| Step | Task | Status |
|------|------|--------|
| 5.1 | Gmail SMTP setup | 🔴 Todo |
| 5.2 | Daily digest email template | 🔴 Todo |
| 5.3 | Hot deal instant alert (>30% drop) | 🔴 Todo |
| 5.4 | User notification preferences | 🔴 Todo |

**🎯 MVP COMPLETE after Phase 5** - Working email-only product

---

### Phase 6: Backend API
**Goal:** REST API for frontend

| Step | Task | Status |
|------|------|--------|
| 6.1 | FastAPI/Express setup | 🔴 Todo |
| 6.2 | Auth endpoints (signup/login/JWT) | 🔴 Todo |
| 6.3 | User profile endpoints | 🔴 Todo |
| 6.4 | Availability CRUD endpoints | 🔴 Todo |
| 6.5 | Deals endpoints | 🔴 Todo |
| 6.6 | Manual search trigger endpoint | 🔴 Todo |

---

### Phase 7: Frontend Dashboard
**Goal:** Nice website for users

| Step | Task | Status |
|------|------|--------|
| 7.1 | Next.js setup | 🔴 Todo |
| 7.2 | Auth pages (login/signup) | 🔴 Todo |
| 7.3 | Calendar availability picker | 🔴 Todo |
| 7.4 | Airport selector component | 🔴 Todo |
| 7.5 | Destination preferences UI | 🔴 Todo |
| 7.6 | Deals dashboard | 🔴 Todo |
| 7.7 | Settings/notifications page | 🔴 Todo |

---

### Phase 8: Polish & Deploy
**Goal:** Production-ready

| Step | Task | Status |
|------|------|--------|
| 8.1 | Error handling everywhere | 🔴 Todo |
| 8.2 | Loading states in UI | 🔴 Todo |
| 8.3 | Mobile responsive | 🔴 Todo |
| 8.4 | Deploy (Vercel + MongoDB Atlas) | 🔴 Todo |

---

## Frontend Development (Independent Block)

The frontend is developed separately and connects to the backend via API.
Can be built with mock data first, then connected to real API later.

### Core Views

**1. Calendar Availability View**
- Interactive calendar (month view)
- Click & drag to select date ranges
- Multiple availability windows (color-coded)
- Labels for each window ("Spring break", "May holiday", etc.)
- Save availability to backend

**2. Deals Dashboard**
- Card-based view of matching flights
- Filter by: destination, price, dates, direct only
- Sort by: price, deal score, departure date
- Each card shows: route, dates, price, airline, deal score
- Click-through to Azair booking link
- "Hot deals" highlighted section

**3. Settings/Profile**
- Home airport + nearby airports selector
- Destination preferences (with priority)
- Notification preferences (daily digest, instant alerts)
- Price threshold settings

### Data Format (API Contract)

Frontend sends/receives JSON in this format:

```json
// User availability (POST /api/availability)
{
  "windows": [
    { "label": "Spring break", "start": "2026-03-15", "end": "2026-03-31" },
    { "label": "May holiday", "start": "2026-05-01", "end": "2026-05-15" }
  ]
}

// User preferences (POST /api/preferences)
{
  "home_airport": "EIN",
  "nearby_airports": ["AMS", "BRU", "DUS"],
  "destinations": ["BCN", "LIS", "ATH", "NAP"],
  "max_price": 150,
  "min_days": 2,
  "max_days": 7,
  "direct_only": false
}

// Deals response (GET /api/deals)
{
  "deals": [
    {
      "origin": "EIN",
      "destination": "BCN",
      "outbound_date": "2026-03-20",
      "return_date": "2026-03-24",
      "price": 89,
      "airline": "Ryanair",
      "is_direct": true,
      "deal_score": 75,
      "azair_link": "https://..."
    }
  ]
}
```

### Development Strategy
1. Build UI components with hardcoded/mock data
2. Test all interactions locally
3. Connect to API endpoints once backend API (Phase 6) is ready
4. Frontend can be deployed to Vercel independently

---

## Current Focus

**Phase 2: Database Layer** ✅ COMPLETE & TESTED

**Next: Phase 3: Smart Deal Detection**

### Resume Checklist
- [x] Phase 1 Scraper tested and working (Feb 15, 2026)
- [x] Install dependencies: `pip install pymongo bcrypt python-dotenv`
- [x] Install MongoDB Community Server locally (Feb 15, 2026)
- [x] Run index setup: `python -m database.setup_indexes`
- [x] Test database with sample data (196 flights saved)
- [x] Create test user: test@flightdeals.local

### Phase 1 Completed ✅
- ✅ Multi-origin support (EIN, AMS, BRU, DUS, CGN)
- ✅ 57 European destinations configured
- ✅ Multiple date ranges (user availability windows)
- ✅ Retry logic with exponential backoff
- ✅ Rate limiting (configurable delays)
- ✅ Proper logging (file + console)
- ✅ JSON export format
- ✅ Direct flights filter
- ✅ Azair booking links captured
- ✅ Flight deduplication

---

## Key Configuration

- **Primary Airport:** EIN (Eindhoven)
- **Nearby Airports:** AMS, BRU, DUS, CGN
- **Target Region:** Europe (30-40 destinations)
- **Check Frequency:** Daily

### Deal Detection Thresholds (database/config.py)
A flight is marked as a deal if EITHER condition is met:
- **Absolute price:** Under €100 = deal, Under €75 = hot deal
- **Relative to history:** 20% below route average = deal, 30% below = hot deal

---

## File Structure
```
flight-scraper/
├── claude.md              # This file - project context
├── scraper-azair/         # Phase 1: Azair scraping module
│   ├── config.py          # Configuration
│   ├── parser.py          # HTML parsing
│   ├── scraper.py         # Main scraper class
│   └── venv/              # Python environment
├── database/              # Phase 2: MongoDB models
├── scheduler/             # Phase 4: Job scheduling
├── email-service/         # Phase 5: Notifications
├── api/                   # Phase 6: REST API
└── frontend/              # Phase 7: Next.js dashboard
```

---

## Notes & Decisions
- Azair only for now (Kiwi dropped from scope)
- "Anywhere" search on Azair times out; must use specific destinations
- Local-first development, cloud deployment later
- After Phase 5 = working MVP (no website, just emails)
- Each module works independently before integration

## Important Data Considerations
- **User availability = multiple date ranges**: Users will have several availability windows (e.g., "Mar 1-15, Apr 5-20, May 1-7"). Scraper must handle searching each range separately.
- **Azair booking links**: Every flight result must include the direct Azair link so users can click through and book immediately.
- **Flight uniqueness**: A flight is unique by (origin, destination, outbound_date, return_date, price) - for deduplication later.

---

## Phase 2: Database Layer Implementation Plan (Detailed)

### Directory Structure
```
flight-scraper/database/
├── __init__.py
├── config.py              # MongoDB connection settings
├── connection.py          # Database connection manager
├── models/
│   ├── __init__.py
│   ├── user.py            # User with embedded airports & notification prefs
│   ├── availability.py    # User's available date ranges
│   ├── destination.py     # User's destination preferences
│   ├── flight.py          # Scraped flights (integrates with scraper's Flight)
│   ├── price_history.py   # Price snapshots over time
│   └── route_stats.py     # Aggregated route statistics
├── repositories/
│   ├── __init__.py
│   ├── user_repo.py
│   ├── availability_repo.py
│   ├── flight_repo.py
│   └── price_history_repo.py
├── services/
│   ├── __init__.py
│   ├── flight_service.py  # Save flights, update stats, detect deals
│   └── user_matcher.py    # Match flights to user availability
└── setup_indexes.py       # Create all MongoDB indexes
```

### Collections & Key Fields

#### 1. `users`
- email (unique), password_hash
- airports: { home: "EIN", nearby: ["AMS", "BRU"] }
- notifications: { daily_digest, instant_alerts, max_price_alert }
- search_preferences: { min_days, max_days, direct_only }

#### 2. `availability`
- user_id, label, start_date, end_date, is_active

#### 3. `destination_preferences`
- user_id, destination_code, priority, max_price, is_active

#### 4. `flights`
- flight_key (unique): "{origin}-{dest}-{out_date}-{ret_date}-{price}"
- All fields from scraper's Flight dataclass
- price_stats: { lowest, highest, average, current_vs_avg_percent }
- is_deal, deal_score (0-100)

#### 5. `price_history`
- flight_key, price, scraped_at
- TTL index: auto-delete after 180 days

#### 6. `route_stats`
- route_key: "{origin}-{dest}"
- average_price, min_price_ever, max_price_ever
- monthly_averages (for seasonal patterns)

### Implementation Steps

| Step | Task | Status |
|------|------|--------|
| 2.1 | MongoDB setup (config.py, connection.py) | ✅ Done |
| 2.2 | User model + repository (with bcrypt) | ✅ Done |
| 2.3 | Availability model + repository | ✅ Done |
| 2.4 | Destination preferences model + repository | ✅ Done |
| 2.5 | Flight model + repository (with scraper integration) | ✅ Done |
| 2.6 | Price history + route stats models/repos | ✅ Done |
| 2.7 | Services (flight_service, user_matcher) | ✅ Done |
| 2.8 | Index setup script | ✅ Done |

### Integration with Scraper

```python
from database import FlightService
from scraper import AzairScraper, DateRange

scraper = AzairScraper()
flight_service = FlightService()

flights = scraper.search_all(origins=["EIN"], destinations=["BCN"], ...)
result = flight_service.save_scraped_flights(flights)
# Returns: { new: 45, updated: 283, deals: 23 }
```

### Prerequisites
- MongoDB Community Server installed locally
- Python packages: `pymongo`, `bcrypt`, `python-dotenv`
