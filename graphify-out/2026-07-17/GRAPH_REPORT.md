# Graph Report - somewhere  (2026-07-17)

## Corpus Check
- 178 files · ~87,970 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1456 nodes · 2844 edges · 87 communities (73 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 62 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `096bd649`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Where It's Going
- getDb
- Community 54
- Community 55
- UserMatcher
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 65
- Community 66
- Community 67
- Community 68
- Community 71
- Somewhere — v1 Design Contract
- User
- ✅ Done
- Somewhere (flight scraper) — AI Context
- parseLocalDate
- route.ts
- main
- GroupTripsCalendar.tsx
- UserAirports
- setup_logging
- ApiError
- TODO
- .find_by_date_range

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 59 edges
2. `UserRepository` - 43 edges
3. `DestinationRepository` - 33 edges
4. `FlightModel` - 31 edges
5. `request()` - 30 edges
6. `AvailabilityRepository` - 29 edges
7. `Flight` - 28 edges
8. `Trip` - 27 edges
9. `get_collection()` - 26 edges
10. `RouteStats` - 24 edges

## Surprising Connections (you probably didn't know these)
- `list_users()` --calls--> `UserRepository`  [EXTRACTED]
  api/routes/admin.py → database/repositories/user_repo.py
- `get_deals()` --calls--> `UserMatcher`  [EXTRACTED]
  api/routes/deals.py → database/services/user_matcher.py
- `DateWindow` --uses--> `UserRepository`  [INFERRED]
  api/routes/preferences.py → database/repositories/user_repo.py
- `UserPreferences` --uses--> `UserRepository`  [INFERRED]
  api/routes/preferences.py → database/repositories/user_repo.py
- `_run_scrape()` --calls--> `AzairScraper`  [INFERRED]
  api/routes/scrape.py → scraper-azair/scraper.py

## Import Cycles
- None detected.

## Communities (87 total, 14 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (78): GET(), num(), numOrNull(), toIso(), GET(), num(), numOrNull(), toDate() (+70 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (54): GET(), citiesForOrigins(), GET(), DateStr, GET(), QuerySchema, asNumberOrNull(), fetchBaselines() (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (21): ExplorePage(), matchesSelection(), LandingPage(), BoardSkeleton(), DepartureBoardProps, DepartureRow, FlapText(), FlapTextProps (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (25): addDays(), BadgeState, buildMonths(), buildRoles(), daysInMonth(), DragMode, DragState, Edge (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (33): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), clear_all_data(), get_schedule(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Delete all scraped flight data. User accounts and preferences are untouched. (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (40): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (5): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (27): DateWindow, get_preferences(), BaseModel, GET  /api/preferences — read the full UserPreferences object PUT  /api/preferen, save_preferences(), UserPreferences, AvailabilityRepository, Repository for Availability CRUD operations. (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (20): PriceHistory, Price history model - historical price snapshots for flights., Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from MongoDB document., Create PriceHistory from flight data., PriceHistoryRepository, Get comprehensive stats for a route. (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (33): get_scrape_status(), POST /api/scrape        — trigger a scrape using the user's saved preferences G, Start a background scrape. Returns immediately., Return current scrape state for polling., Background thread: scrape Azair using the user's saved preferences., _run_scrape(), start_scrape(), get_connection_string() (+25 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (20): Availability, datetime, Availability model - user's available date ranges for travel., User's availability window for travel.      MongoDB document structure:     {, Return the number of days in this availability window., Check if a date falls within this availability window., Check if this availability overlaps with a given date range., Convert to dictionary for MongoDB storage. (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (6): FlightRepository, Find a flight by its unique key., Find flights to a destination., Repository for Flight CRUD operations., Delete flights not seen in X days. Returns count deleted., Get price range for a route.

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (13): DestinationPreference, User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Create DestinationPreference from MongoDB document., Convert to dictionary for API responses., Find a specific destination preference for a user., Find high priority (priority=1) destinations for a user. (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (8): User, Update an existing user.          Args:             user: User object with up, Find an existing user by email or create a new one (no password required)., Authenticate a user by email and password.          Args:             email:, Verify a password against its hash., Create a new user.          Args:             email: User's email address, Find a user by email., Find all users who have a specific destination in their preferences.         No

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): PersonLabel(), InviteCard(), Button(), ButtonProps, addGroupMember(), rotateGroupInvite(), FriendEntry, GroupMemberEntry (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (24): CalendarPage(), buildDensity(), GroupTripsCalendar(), addMonths(), clampDayInMonth(), dayStr(), isWeekend(), MONTHS_LONG (+16 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (11): FliAirport, FliScraper, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: Sear, Full search across multiple origins, destinations, and date ranges.          Sam, Phase 1: Use SearchDates to find cheapest dates per route.          Returns list, Call SearchDates with error handling. Returns list of {out_date, ret_date, price, Phase 2: Get full flight details for each cheap date combo. (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (23): ScrapeTargetModel, datetime, Atomically claim the next-due enabled target.          Marks it as 'running' by, Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples., ScrapeTargetRepository, expand_routes(), origin_codes() (+15 more)

### Community 20 - "Community 20"
Cohesion: 0.18
Nodes (9): TIER_BADGE, TripPopoverProps, CountryFlag(), CountryFlagProps, Sheet(), SheetProps, Spark(), SparkPoint (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (21): CityCardProps, ExploreControls(), ExploreControlsProps, KIND_LABEL, SearchComboboxProps, SearchSelection, Suggestion, Origin (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (11): bricolage, instrument, splineMono, metadata, viewport, LINKS, Navigation(), NavigationProps (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (16): login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me, Find or create a user by email. Returns user_id, name, email.     No password r, Validate a stored user ID. Returns user info or 401.     Called on app load to, Update a user's password. (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (10): FriendsPage(), Mode, Status, getFriends(), getUsers(), removeFriend(), respondToFriendRequest(), sendFriendRequest() (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (26): AdminTargetSummarySchema, CityBest, CityBestSchema, CitySummarySchema, DateStringSchema, DealTierSchema, DirectoryUserSchema, FlightDocSchema (+18 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): AzairScraper, main(), datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (12): Flight, flights_to_json(), Represents a flight deal., Convert list of flights to JSON string., Save flights to a JSON file., Set scraped_at timestamp if not provided., Check if both legs are direct flights., Unique key for this route (for grouping). (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.14
Nodes (9): GroupTripRow(), GroupTripsCalendarProps, FareTagProps, FareTagSize, SIZE_CLASSES, SKELETON_SIZES, TIER_CLASSES, GroupTripsData (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (14): LiveBoard(), RunFeed(), Status, STATUS_STYLE, SortDir, SortKey, TargetsTable(), TargetsTableProps (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (17): MongoDB index setup script (v2).  Run this once to create all necessary indexes, Create the v2 index set for the flights collection and drop everything     else, Create indexes for scrape_targets collection (pool scheduler)., Create indexes for scrape_runs collection (observability log)., Create all indexes for all collections., Create indexes for users collection., Create indexes for availability collection., Create indexes for friendships collection (written by the frontend). (+9 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (7): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     {

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (4): Find cheapest matching flights (deal scoring moved to frontend)., Get a summary of a user's matches.          Returns:             Dict with co, Get match summaries for all active users., Find flights matching a user's availability and preferences.          Args:

### Community 33 - "Community 33"
Cohesion: 0.14
Nodes (7): CityDetail(), CityDetailFallback(), CityDetailProps, ORIGIN_NAME, TripRowSkeleton(), ApiError, CityDetailResponse

### Community 34 - "Community 34"
Cohesion: 0.21
Nodes (9): AdminPage(), DangerZone(), Phase, PoolTiles(), PoolTilesProps, PoolTilesSkeleton(), adminPool(), adminWipe() (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.13
Nodes (24): GroupDetailPage(), Mode, CitiesParams, deleteGroup(), getCity(), getGroup(), getGroupTrips(), getTrips() (+16 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (4): JoinPage(), getJoinInfo(), joinGroup(), JoinInfoResponse

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (9): main(), Flight Scraper Pipeline - Phase 3 Integration  This script connects the scrape, Run the scraper and save results to database.      Args:         full_scan: I, run_pipeline(), filter_by_price(), Filter flights by maximum price., DateRange, Find deals under a certain price.          Convenience method that searches an (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.24
Nodes (14): datetime, _ensure_file_logging(), in_active_window(), main(), Pool Scheduler — target-driven, user-agnostic flight scraping.  Pulls due routes, Run Fli for a single route and persist results.      Returns: {"status": ..., "f, Claim the next-due target and scrape it.      Returns True if a route was scrape, Slot loop. Sleeps SLOT_MINUTES between attempts; idles outside active window. (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): API (`api/`), Architecture, Components, Data Flow, Database (`database/`), Dependencies, Frontend (`frontend/`), Pipeline (`run_pipeline.py`) (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): Architectural Decisions, Architecture, Current Status, graphify, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (5): Return all airports (home + nearby) for searching., Convert to dictionary for MongoDB storage., Convert to dictionary without sensitive fields (for API responses)., User model with embedded preferences.      MongoDB document structure:     {, User

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (5): Destination preference model - user's preferred travel destinations., Route statistics model - aggregated price data for routes., ScrapeTarget model — one document per (origin, destination) route in the pool., User's search preferences., UserSearchPreferences

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (6): Create FlightModel from MongoDB document., Find flights by route., Find flights from an origin., Find flights under a certain price., Find recently scraped flights., Get cheapest flight per route.

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (7): _build_google_flights_url(), _fli_to_flight(), _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Convert minutes to '2h 30m' format., Build a Google Flights search URL., Convert a Fli round-trip result tuple into our Flight dataclass.

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (26): BestPerMonth(), BestPerMonthProps, buildSlots(), MONTHS_SHORT, MonthSlot, nightsBetween(), nightsBetween(), TripRow() (+18 more)

### Community 47 - "Community 47"
Cohesion: 0.10
Nodes (19): Database, DatabaseConnection, get_database(), Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Get the database instance., Close the database connection., Check if connected to MongoDB. (+11 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): deduplicate(), filter_direct_only(), normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (3): ScrapeRun model — one document per scraper execution of one route.  Pure observa, ScrapeRunModel, Insert a 'running' record. Returns the inserted _id as str.

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): User, Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., _window_trip_range()

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (13): CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName(), TIER_BAR, TripBar(), TripBarProps, Badge() (+5 more)

### Community 52 - "Where It's Going"
Cohesion: 0.15
Nodes (12): Beyond, Current Capabilities, Deploy, Design Principles, Email Notifications, Multi-User, Next (near-term), Price Trends (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (4): Any, Create FlightModel from scraper's Flight dataclass.          Args:             f, Any, Save flights from scraper to database.          Steps:           1. Convert scra

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (3): Upsert a single flight. Returns {"new": 0|1, "updated": 0|1}., Alias for bulk_upsert. Returns {"new": X, "updated": Y}., Upsert many flights in a single bulk_write call.          v2 semantics:

### Community 57 - "Community 57"
Cohesion: 0.47
Nodes (5): getColor(), getColorLight(), hashCode(), PALETTE_DARK, PALETTE_LIGHT

### Community 58 - "Community 58"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 59 - "Community 59"
Cohesion: 0.40
Nodes (4): buildCommand, framework, installCommand, outputDirectory

### Community 60 - "Community 60"
Cohesion: 0.18
Nodes (10): Code transfer (decide after recon), DormSpot protection (already encoded in flight-scraper.service), Flight Scraper — Linux deploy runbook (StudentSpot box), Install, Pool math (4 origins, tiered, 180-day window), Pre-deploy SSH recon (run first, verifies assumptions), Rollback / pause, Scheduling model (no cron needed) (+2 more)

### Community 62 - "Community 62"
Cohesion: 0.38
Nodes (6): getSavedCities(), putSavedCities(), EMPTY, SavedCitiesContext, SavedCitiesProvider(), SavedCitiesValue

### Community 74 - "Somewhere — v1 Design Contract"
Cohesion: 0.18
Nodes (10): A. Information architecture, B. Data layer (Python side — phase 0), C. Scoring (TypeScript, read-time — `frontend/lib/score.ts`), D. API contract (Next.js routes, zod-validated at boundary), E. Auth — NextAuth (Auth.js) v5, F. Visual design system, G. Calendar design (`/calendar`), H. Build phases (+2 more)

### Community 75 - "User"
Cohesion: 0.10
Nodes (20): AcademicCard(), WEEKDAYS, clampNights(), Mode, PreferencesCard(), CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS (+12 more)

### Community 76 - "✅ Done"
Cohesion: 0.22
Nodes (8): Data layer v2 (commit `a46c3a0`) + Atlas migration (run 2026-06-10), ✅ Done, Frontend v1 rebuild (commit `2c5126c`, tsc clean, `next build` green — 16 routes + middleware), Known facts for next session, ⬜ Left to do, Somewhere v1 — Build Progress, Vercel, Verified locally (dev server :4173, real Atlas data)

### Community 77 - "Somewhere (flight scraper) — AI Context"
Cohesion: 0.25
Nodes (7): Architectural Decisions, Architecture, Current Status, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 78 - "parseLocalDate"
Cohesion: 0.33
Nodes (3): Create User from MongoDB document., Find all active users., Find all users regardless of active status.

### Community 79 - "route.ts"
Cohesion: 0.40
Nodes (5): assignLanes(), Interval, LaneAssignment, LaneTrip, overlaps()

### Community 86 - "setup_logging"
Cohesion: 0.67
Nodes (3): Logger, Configure logging for the scraper., setup_logging()

### Community 87 - "ApiError"
Cohesion: 0.32
Nodes (5): GroupsPage(), Mode, createGroup(), getGroups(), GroupsResponse

### Community 89 - "TODO"
Cohesion: 0.33
Nodes (5): Done (for reference), Long Term — Auth, Notifications & Reach, Medium Term — Pool-based scraping (in progress), Short Term — Auth, UI & Test Deployment, TODO

## Knowledge Gaps
- **245 isolated node(s):** `WEEKDAYS`, `MONTH_NAMES`, `Role`, `MonthModel`, `Mode` (+240 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 23` to `Community 5`, `Community 7`, `Community 8`, `Community 10`, `parseLocalDate`, `Community 15`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `AzairScraper` connect `Community 26` to `Community 27`, `Community 10`, `Community 5`, `Community 37`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `run_origin_job()` connect `Community 5` to `Community 37`, `Community 8`, `Community 10`, `Community 23`, `Community 26`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `WEEKDAYS`, `MONTH_NAMES`, `Role` to the rest of the system?**
  _245 weakly-connected nodes found - possible documentation gaps or missing edges._