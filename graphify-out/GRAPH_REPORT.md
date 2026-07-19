# Graph Report - somewhere  (2026-07-19)

## Corpus Check
- 227 files · ~127,250 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1770 nodes · 3663 edges · 103 communities (92 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c96ddd37`
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
- TripRow.tsx
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- UserMatcher
- Community 50
- academic.ts
- Where It's Going
- Providers.tsx
- Community 54
- Community 55
- UserMatcher
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- CityCard.tsx
- Community 63
- Community 65
- Community 66
- Community 67
- Community 68
- Community 71
- Somewhere — v1 Design Contract
- page.tsx
- ✅ Done
- Somewhere (flight scraper) — AI Context
- TripRow.tsx
- DatabaseConnection
- FreeStrip.tsx
- CityDetail.tsx
- FareTag.tsx
- page.tsx
- route.ts
- User
- parseOrigins
- layout.tsx
- trips.ts
- TODO
- opengraph-image.tsx
- AdminTabs.tsx
- route.ts
- .find_deals
- UserAirports
- .find_users_for_flight
- lanes.ts
- setup_logging
- .bulk_upsert
- ApiError
- academic.ts
- .deactivate
- useStayExtensions.ts

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 67 edges
2. `UserRepository` - 43 edges
3. `DestinationRepository` - 33 edges
4. `request()` - 33 edges
5. `getDestination()` - 32 edges
6. `FlightModel` - 31 edges
7. `AvailabilityRepository` - 29 edges
8. `get_collection()` - 28 edges
9. `Flight` - 28 edges
10. `RouteStats` - 24 edges

## Surprising Connections (you probably didn't know these)
- `list_users()` --calls--> `UserRepository`  [EXTRACTED]
  api/routes/admin.py → database/repositories/user_repo.py
- `LoginRequest` --uses--> `UserRepository`  [INFERRED]
  api/routes/auth.py → database/repositories/user_repo.py
- `_run_scrape()` --calls--> `AzairScraper`  [INFERRED]
  api/routes/scrape.py → scraper-azair/scraper.py
- `_run_scrape()` --calls--> `DateRange`  [INFERRED]
  api/routes/scrape.py → scraper-azair/scraper.py
- `run_pipeline()` --calls--> `AzairScraper`  [INFERRED]
  run_pipeline.py → scraper-azair/scraper.py

## Import Cycles
- None detected.

## Communities (103 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (73): GET(), num(), numOrNull(), toDate(), toIso(), VALID_STATUS, POST(), WipeBodySchema (+65 more)

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (11): build_airports_ts(), build_destinations_ts(), build_groundpairs_ts(), destination_line(), ground_pair_line(), main(), origin_line(), Codegen: export scraper/targets.py pool data to TypeScript for the frontend.  Wr (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (33): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses, DateWindow, get_preferences(), BaseModel (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (26): addDays(), BadgeState, buildMonths(), buildRoles(), canonWindows(), daysInMonth(), DragMode, DragState (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (33): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), clear_all_data(), get_schedule(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Delete all scraped flight data. User accounts and preferences are untouched. (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (44): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+36 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (19): get_connection_string(), MongoDB configuration settings.  Uses environment variables with sensible defa, Build MongoDB connection string., close_connection(), get_collection(), MongoDB connection manager.  Singleton pattern to ensure a single database con, Get a collection by name., Close the database connection. (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (19): Activate an availability window., Delete an availability window (hard delete)., Delete all availability windows for a user. Returns count deleted., Count availability windows for a user., Find all user IDs who want a specific destination.         Useful for reverse l, Get just the destination codes for a user (for scraper)., Update the priority of a destination preference., Update the max price for a destination preference. (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (15): Create PriceHistory from MongoDB document., PriceHistoryRepository, Get comprehensive stats for a route., Get monthly average prices for a route.          Returns:             Dict of, Repository for PriceHistory operations., Get daily price trend for a route.          Returns:             List of {"da, Record a price snapshot.          Args:             flight_key: Unique flight, Detect if there's been a significant price drop.          Returns: (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (8): main(), Flight Scraper Pipeline - Phase 3 Integration  This script connects the scrape, Run the scraper and save results to database.      Args:         full_scan: I, run_pipeline(), DateRange, Represents a date range for availability., Full search across multiple origins, destinations, and date ranges.          Sam, Phase 1: Use SearchDates to find cheapest dates per route.          Returns list

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (11): Availability, User's availability window for travel.      MongoDB document structure:     {, Return the number of days in this availability window., Convert to dictionary for MongoDB storage., Create Availability from MongoDB document., Convert to dictionary for API responses., Find all future availability windows for a user., Find all active future availability windows across all users.         Useful fo (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (13): Create FlightModel from MongoDB document., FlightRepository, Find a flight by its unique key., Find flights by route., Find flights from an origin., Find flights to a destination., Find flights within a date range.          Args:             start_date: Earlies, Find flights under a certain price. (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+32 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (19): ExplorePage(), LandingPage(), BoardSkeleton(), DepartureBoardProps, DepartureRow, CityCardProps, ExploreControls(), ExploreControlsProps (+11 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (13): Create User from MongoDB document., User, Update an existing user.          Args:             user: User object with up, Update a user's password., Find an existing user by email or create a new one (no password required)., Authenticate a user by email and password.          Args:             email:, Hash a password using bcrypt., Verify a password against its hash. (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (13): DestinationPreference, User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Create DestinationPreference from MongoDB document., Convert to dictionary for API responses., Find a specific destination preference for a user., Find high priority (priority=1) destinations for a user. (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (23): LegLink(), OpenJawRow(), OpenJawRowProps, GroupTripRow(), MONTHS3, returnChip(), TIER_BAR, TripBar() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (10): FliAirport, FliScraper, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: two, Call SearchDates with error handling. Returns list of {out_date, ret_date, price, One-way SearchDates grid. Returns {date_str: cheapest one-way price}., Phase 2: Get full flight details for each cheap date combo., Call SearchFlights with error handling. Returns list of Flight dataclass objects (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (14): _ensure_file_logging(), in_active_window(), main(), datetime, Pool Scheduler — target-driven, user-agnostic flight scraping.  Pulls due routes, Run Fli for a single route and persist results.      Returns: {"status": ..., "f, Claim the next-due target and scrape it.      Returns True if a route was scrape, Slot loop. Sleeps SLOT_MINUTES between attempts; idles outside active window. (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (6): agoLabel(), GridStatsCard(), PoolTiles(), PoolTilesProps, PoolTilesSkeleton(), AdminPoolSummary

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (12): OnewayFareModel, One-way fare grid for a directed leg.      MongoDB document structure:     {, Unique identifier for this directed leg., Convert to dictionary for MongoDB storage., Create OnewayFareModel from MongoDB document., OnewayFareRepository, Wholesale-replace each leg's fare grid.          Returns:             {"new": X,, Get the fare grid for one directed leg. (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (11): bricolage, instrument, splineMono, metadata, viewport, LINKS, Navigation(), NavigationProps (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (32): Database, get_database(), Get the database instance., Get the database instance., drop_all_indexes(), list_all_indexes(), MongoDB index setup script (v2).  Run this once to create all necessary indexes, Create the v2 index set for the flights collection and drop everything     else (+24 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (17): Availability model - user's available date ranges for travel., Destination preference model - user's preferred travel destinations., PriceHistory, Price history model - historical price snapshots for flights., Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from flight data., Route statistics model - aggregated price data for routes. (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (54): AdminFriendRefSchema, AdminGridStatsSchema, AdminGroupMember, AdminGroupMemberSchema, AdminGroupSchema, AdminTargetSummarySchema, AdminUserGroupSchema, AdminUserPrefs (+46 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): AzairScraper, main(), datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (15): filter_by_price(), Flight, flights_to_json(), Represents a flight deal., Filter flights by maximum price., Convert list of flights to JSON string., Save flights to a JSON file., Set scraped_at timestamp if not provided. (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (6): DatabaseConnection, Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Close the database connection., Check if connected to MongoDB., MongoClient

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (23): CityLink(), getDestination(), fitsAnyWindow(), bestOpenJawInto(), bestTwinInto(), combineGrids(), CombineOptions, GridCombo (+15 more)

### Community 30 - "Community 30"
Cohesion: 0.26
Nodes (11): destination_codes(), expand_routes(), origin_codes(), Scrape target pool — origins, destinations, and tier assignments.  Pool-based sc, Assert GROUND_PAIRS invariants: destination codes only (never origins),     no s, Yield (origin, destination, tier) for every valid route in the pool.      Skips, Quick stats for logging., summary() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (36): asNumberOrNull(), fetchBaselines(), getBaselines, RouteBaseline, ALL_ORIGIN_CODES, clipRuns(), curateBars(), curateGroupTrips() (+28 more)

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (4): Find cheapest matching flights (deal scoring moved to frontend)., Get a summary of a user's matches.          Returns:             Dict with co, Get match summaries for all active users., Find flights matching a user's availability and preferences.          Args:

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (22): matchesSelection(), CityCard(), CityCardSkeleton(), COUNTRY_NAMES, countryName(), KIND_LABEL, SearchableCity, SearchCombobox() (+14 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (31): AdminPage(), GroupDetailPage(), Mode, GroupsPage(), Mode, DangerZone(), Phase, LiveBoard() (+23 more)

### Community 35 - "Community 35"
Cohesion: 0.23
Nodes (7): AdminUsersPage(), Tiles, UsersTiles(), UsersTilesSkeleton(), adminUsers(), AdminGroup, AdminUsersResponse

### Community 36 - "Community 36"
Cohesion: 0.27
Nodes (8): EXEMPT_PREFIXES, OnboardingGate(), getSavedCities(), putSavedCities(), EMPTY, SavedCitiesContext, SavedCitiesProvider(), SavedCitiesValue

### Community 37 - "Community 37"
Cohesion: 0.13
Nodes (14): FlapText(), FlapTextProps, SIZE_CLASSES, CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName(), CheckInStep() (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (5): ScrapeTarget model — one document per (origin, destination) route in the pool., ScrapeTargetModel, datetime, ScrapeTargetRepository — manages the route pool.  Core operations:   bulk_upsert, Atomically claim the next-due enabled target.          Marks it as 'running' by

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): API (`api/`), Architecture, Components, Data Flow, Database (`database/`), Dependencies, Frontend (`frontend/`), Pipeline (`run_pipeline.py`) (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): Architectural Decisions, Architecture, Current Status, graphify, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (16): BestPerMonth(), BestPerMonthProps, buildSlots(), MONTHS_SHORT, MonthSlot, nightsBetween(), nightsBetween(), TripRow() (+8 more)

### Community 42 - "Community 42"
Cohesion: 0.25
Nodes (3): Insert a 'running' record. Returns the inserted _id as str., Most recent runs, newest first., ScrapeRunRepository

### Community 43 - "TripRow.tsx"
Cohesion: 0.27
Nodes (10): GET(), GroupMemberRaw, GroupRaw, numOrNull(), toDateStr(), toIso(), AdminFriendRef, AdminUserGroup (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (7): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     {

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (7): _build_google_flights_url(), _fli_to_flight(), _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Convert minutes to '2h 30m' format., Build a Google Flights search URL., Convert a Fli round-trip result tuple into our Flight dataclass.

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (10): Cross-cutting rules (all phases), Multi-City / Open-Jaw — Full Roadmap, Phase 0 — Data foundation ✅ (reference), Phase 1 — Combo engine + API (origin-side, no UI), Phase 2 — Origin-side UI: City page + booking links, Phase 3 — Origin-side UI: Explore + Calendar, Phase 4 — Destination-side pairing data + engine extension, Phase 5 — Destination-side UI: twin-city trips (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.26
Nodes (10): GET(), DateStr, GET(), QuerySchema, getCityData(), monthsAhead(), parseOrigins(), TripsSession (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): deduplicate(), filter_direct_only(), normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t (+5 more)

### Community 49 - "UserMatcher"
Cohesion: 0.09
Nodes (21): OnboardingWizard(), STEP_LABELS, OriginsStep(), AcademicCard(), OriginChips(), Mode, PreferencesCard(), todayStr() (+13 more)

### Community 50 - "Community 50"
Cohesion: 0.14
Nodes (21): AgendaMonth(), AgendaMonthProps, WeekGroup, addDays(), addMonths(), dayStr(), MONTHS_LONG, MonthSpec (+13 more)

### Community 51 - "academic.ts"
Cohesion: 0.36
Nodes (7): buildDensity(), GroupTripsCalendar(), GroupTripsCalendarProps, monthSpan(), useIsMobile(), GroupTripsData, GroupTrip

### Community 52 - "Where It's Going"
Cohesion: 0.15
Nodes (12): Beyond, Current Capabilities, Deploy, Design Principles, Email Notifications, Multi-User, Next (near-term), Price Trends (+4 more)

### Community 53 - "Providers.tsx"
Cohesion: 0.29
Nodes (6): StretchCell, StretchOverlayProps, TIER_BAR, TripBarProps, TripTooltipProps, CalTrip

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (4): Any, Create FlightModel from scraper's Flight dataclass.          Args:             f, Any, Save flights from scraper to database.          Steps:           1. Convert scra

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (6): signupLabel(), UserDetailSheet(), WEEKDAYS, windowLabel(), Sheet(), SheetProps

### Community 56 - "UserMatcher"
Cohesion: 0.25
Nodes (3): cookieOptions, { auth }, config

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

### Community 74 - "Somewhere — v1 Design Contract"
Cohesion: 0.18
Nodes (10): A. Information architecture, B. Data layer (Python side — phase 0), C. Scoring (TypeScript, read-time — `frontend/lib/score.ts`), D. API contract (Next.js routes, zod-validated at boundary), E. Auth — NextAuth (Auth.js) v5, F. Visual design system, G. Calendar design (`/calendar`), H. Build phases (+2 more)

### Community 75 - "page.tsx"
Cohesion: 0.24
Nodes (4): JoinPage(), getJoinInfo(), joinGroup(), JoinInfoResponse

### Community 76 - "✅ Done"
Cohesion: 0.22
Nodes (8): Data layer v2 (commit `a46c3a0`) + Atlas migration (run 2026-06-10), ✅ Done, Frontend v1 rebuild (commit `2c5126c`, tsc clean, `next build` green — 16 routes + middleware), Known facts for next session, ⬜ Left to do, Somewhere v1 — Build Progress, Vercel, Verified locally (dev server :4173, real Atlas data)

### Community 77 - "Somewhere (flight scraper) — AI Context"
Cohesion: 0.25
Nodes (7): Architectural Decisions, Architecture, Current Status, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 78 - "TripRow.tsx"
Cohesion: 0.19
Nodes (11): Origin, ORIGINS, getGroundLinks(), GROUND_PAIRS, GroundLink, GroundPair, LINKS, buildAzairSearchUrl() (+3 more)

### Community 79 - "DatabaseConnection"
Cohesion: 0.22
Nodes (5): Return all airports (home + nearby) for searching., Convert to dictionary for MongoDB storage., Convert to dictionary without sensitive fields (for API responses)., User model with embedded preferences.      MongoDB document structure:     {, User

### Community 80 - "FreeStrip.tsx"
Cohesion: 0.33
Nodes (9): GET(), loadGridStats(), num(), numOrNull(), toIso(), toMs(), AdminGridStats, AdminPoolSummarySchema (+1 more)

### Community 81 - "CityDetail.tsx"
Cohesion: 0.10
Nodes (18): CalendarPage(), CityDetail(), CityDetailFallback(), CityDetailProps, ORIGIN_NAME, checkedAgo(), OpenJawSection(), OpenJawSectionProps (+10 more)

### Community 82 - "FareTag.tsx"
Cohesion: 0.13
Nodes (18): FriendsPage(), Mode, Status, PersonLabel(), InviteCard(), Button(), ButtonProps, addGroupMember() (+10 more)

### Community 83 - "page.tsx"
Cohesion: 0.25
Nodes (5): datetime, Find active availability windows that overlap with a given date range., Update the dates of an availability window., Create a new availability window.          Args:             user_id: User's, Create multiple availability windows at once.          Args:             user

### Community 84 - "route.ts"
Cohesion: 0.19
Nodes (16): citiesForOrigins(), GET(), withOpenJaw(), calendarSweep(), DateParam, GET(), QuerySchema, AvailWindow (+8 more)

### Community 85 - "User"
Cohesion: 0.20
Nodes (14): DateParam, GET(), QuerySchema, getTripStretchData(), addDays(), enumerateStretchCandidates(), ExactFare, nightsOf() (+6 more)

### Community 86 - "parseOrigins"
Cohesion: 0.22
Nodes (3): Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples., ScrapeTargetRepository

### Community 87 - "layout.tsx"
Cohesion: 0.40
Nodes (3): datetime, Check if a date falls within this availability window., Check if this availability overlaps with a given date range.

### Community 88 - "trips.ts"
Cohesion: 0.12
Nodes (13): CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS, dayDiff(), nearMissWindow(), clamp(), GROUND_COMPETITIVE_CODES, isGroundCompetitive() (+5 more)

### Community 89 - "TODO"
Cohesion: 0.33
Nodes (5): Done (for reference), Long Term — Auth, Notifications & Reach, Medium Term — Pool-based scraping (in progress), Short Term — Auth, UI & Test Deployment, TODO

### Community 92 - "route.ts"
Cohesion: 0.28
Nodes (7): signupLabel(), SortDir, SortKey, UsersTable(), UsersTableProps, UsersTableSkeleton(), AdminUser

### Community 93 - ".find_deals"
Cohesion: 0.29
Nodes (7): login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me, Find or create a user by email. Returns user_id, name, email.     No password r, Validate a stored user ID. Returns user info or 401.     Called on app load to

### Community 94 - "UserAirports"
Cohesion: 0.25
Nodes (5): FareTagProps, FareTagSize, SIZE_CLASSES, SKELETON_SIZES, TIER_CLASSES

### Community 95 - ".find_users_for_flight"
Cohesion: 0.33
Nodes (5): User, Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., _window_trip_range()

### Community 96 - "lanes.ts"
Cohesion: 0.15
Nodes (19): clampDayInMonth(), isWeekend(), spansMonth(), weekdayLetter(), edgeLabel(), FreeStrip(), FreeStripProps, HourTag (+11 more)

### Community 97 - "setup_logging"
Cohesion: 0.67
Nodes (3): Logger, Configure logging for the scraper., setup_logging()

### Community 98 - ".bulk_upsert"
Cohesion: 0.33
Nodes (3): Upsert a single flight. Returns {"new": 0|1, "updated": 0|1}., Alias for bulk_upsert. Returns {"new": X, "updated": Y}., Upsert many flights in a single bulk_write call.          v2 semantics:

### Community 99 - "ApiError"
Cohesion: 0.13
Nodes (12): RunFeed(), Status, STATUS_STYLE, SortDir, SortKey, TargetsTable(), TargetsTableProps, TargetsTableSkeleton() (+4 more)

### Community 100 - "academic.ts"
Cohesion: 0.70
Nodes (4): generateFreeWindows(), isoWeekday(), pad(), toStr()

### Community 103 - "useStayExtensions.ts"
Cohesion: 0.17
Nodes (13): toCalTrip(), cache, containingWindow(), EMPTY_STRETCHES, pickOpenJawExtensions(), pickStretches(), plusDays(), StayStretch (+5 more)

## Knowledge Gaps
- **321 isolated node(s):** `WEEKDAYS`, `MONTH_NAMES`, `Role`, `MonthModel`, `Mode` (+316 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 2` to `Community 5`, `Community 7`, `Community 8`, `Community 15`, `.find_deals`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `RouteStats` connect `Community 3` to `Community 24`, `Community 7`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `FlightModel` connect `Community 44` to `Community 32`, `.bulk_upsert`, `Community 2`, `Community 7`, `Community 12`, `Community 54`, `Community 24`, `.find_users_for_flight`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `WEEKDAYS`, `MONTH_NAMES`, `Role` to the rest of the system?**
  _321 weakly-connected nodes found - possible documentation gaps or missing edges._