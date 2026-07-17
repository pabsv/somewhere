# Graph Report - somewhere  (2026-07-17)

## Corpus Check
- 205 files · ~102,080 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1594 nodes · 3222 edges · 94 communities (84 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fbc5ef2f`
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
- UserMatcher
- Community 50
- Community 51
- Where It's Going
- .contains_date
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
- page.tsx
- ✅ Done
- Somewhere (flight scraper) — AI Context
- .create
- route.ts
- main
- YearPaint
- layout.tsx
- FareTag.tsx
- admin.py
- admin.py
- CheckInStep.tsx
- Providers.tsx
- UserMatcher
- TODO
- .contains_date
- academic.ts
- .deactivate
- setup_logging

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 62 edges
2. `UserRepository` - 43 edges
3. `DestinationRepository` - 33 edges
4. `FlightModel` - 31 edges
5. `request()` - 31 edges
6. `AvailabilityRepository` - 29 edges
7. `Trip` - 28 edges
8. `get_collection()` - 28 edges
9. `Flight` - 28 edges
10. `RouteStats` - 24 edges

## Surprising Connections (you probably didn't know these)
- `list_users()` --calls--> `UserRepository`  [EXTRACTED]
  api/routes/admin.py → database/repositories/user_repo.py
- `_run_scrape()` --calls--> `AzairScraper`  [INFERRED]
  api/routes/scrape.py → scraper-azair/scraper.py
- `_run_scrape()` --calls--> `DateRange`  [INFERRED]
  api/routes/scrape.py → scraper-azair/scraper.py
- `run_pipeline()` --calls--> `AzairScraper`  [INFERRED]
  run_pipeline.py → scraper-azair/scraper.py
- `scrape_one_route()` --calls--> `FliScraper`  [INFERRED]
  scheduler/pool_scheduler.py → scraper-fli/scraper.py

## Import Cycles
- None detected.

## Communities (94 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (79): GET(), num(), numOrNull(), toIso(), GET(), num(), numOrNull(), toDate() (+71 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (58): GET(), citiesForOrigins(), GET(), GET(), QuerySchema, DateStr, GET(), QuerySchema (+50 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (10): CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName(), GroupTripRow(), Badge(), BadgeProps, BadgeVariant (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (16): BadgeState, buildMonths(), daysInMonth(), DragMode, DragState, Edge, firstWeekdayMonFirst(), fmtHour() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (26): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), Insert or update schedule state for an origin., Return state for all origins, sorted by origin code., Return state for a single origin., Remove all schedule state (e.g. after changing the origin list)., ScheduleRepository, Scheduler module for automated flight scraping. (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (41): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+33 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (35): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me (+27 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (19): Activate an availability window., Delete an availability window (hard delete)., Delete all availability windows for a user. Returns count deleted., Count availability windows for a user., Find all user IDs who want a specific destination.         Useful for reverse l, Get just the destination codes for a user (for scraper)., Update the priority of a destination preference., Update the max price for a destination preference. (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (19): PriceHistory, Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from MongoDB document., Create PriceHistory from flight data., PriceHistoryRepository, Get comprehensive stats for a route., Get monthly average prices for a route.          Returns:             Dict of (+11 more)

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
Cohesion: 0.06
Nodes (30): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+22 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (13): DestinationPreference, User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Create DestinationPreference from MongoDB document., Convert to dictionary for API responses., Find a specific destination preference for a user., Find high priority (priority=1) destinations for a user. (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (13): Create User from MongoDB document., User, Update an existing user.          Args:             user: User object with up, Update a user's password., Find an existing user by email or create a new one (no password required)., Authenticate a user by email and password.          Args:             email:, Hash a password using bcrypt., Verify a password against its hash. (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (10): PersonLabel(), InviteCard(), Button(), ButtonProps, addGroupMember(), getFriends(), rotateGroupInvite(), FriendEntry (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.14
Nodes (23): addDays(), addMonths(), clampDayInMonth(), dayStr(), isWeekend(), MONTHS_LONG, MonthSpec, pad() (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (10): FliAirport, FliScraper, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: two, Call SearchDates with error handling. Returns list of {out_date, ret_date, price, One-way SearchDates grid. Returns {date_str: cheapest one-way price}., Phase 2: Get full flight details for each cheap date combo., Call SearchFlights with error handling. Returns list of Flight dataclass objects (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (31): ScrapeTargetModel, Insert a 'running' record. Returns the inserted _id as str., Most recent runs, newest first., ScrapeRunRepository, datetime, Atomically claim the next-due enabled target.          Marks it as 'running' by, Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples. (+23 more)

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (15): AgendaMonth(), DaySheet(), TripPopover(), formatDelta(), TripTooltip(), BY_CODE, Destination, DESTINATIONS (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (10): OnewayFareModel, One-way fare grid for a directed leg.      MongoDB document structure:     {, Unique identifier for this directed leg., Convert to dictionary for MongoDB storage., Create OnewayFareModel from MongoDB document., Wholesale-replace each leg's fare grid.          Returns:             {"new": X,, Get the fare grid for one directed leg., All legs departing from an airport. (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (5): LINKS, Navigation(), NavigationProps, NavLink, ShieldIcon()

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (38): Database, DatabaseConnection, get_database(), Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Get the database instance., Close the database connection., Check if connected to MongoDB. (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (14): Availability model - user's available date ranges for travel., Destination preference model - user's preferred travel destinations., Price history model - historical price snapshots for flights., Route statistics model - aggregated price data for routes., ScrapeRun model — one document per scraper execution of one route.  Pure observa, ScrapeRunModel, ScrapeTarget model — one document per (origin, destination) route in the pool., User model with embedded airports and notification preferences. (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (29): AdminTargetSummarySchema, CityBestSchema, CitySummarySchema, DateStringSchema, DealTierSchema, DirectoryUserSchema, FriendEntrySchema, GroupMemberEntrySchema (+21 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): AzairScraper, main(), datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (15): filter_by_price(), Flight, flights_to_json(), Represents a flight deal., Filter flights by maximum price., Convert list of flights to JSON string., Save flights to a JSON file., Set scraped_at timestamp if not provided. (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (7): CalendarPage(), CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS, TierFilter, TIERS, getAvailability()

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (15): GET(), QuerySchema, combineGrids(), CombineOptions, GridCombo, nightsBetween(), getOpenJawTrips(), loadFareGrids() (+7 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (7): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     {

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (4): Find cheapest matching flights (deal scoring moved to frontend)., Get a summary of a user's matches.          Returns:             Dict with co, Get match summaries for all active users., Find flights matching a user's availability and preferences.          Args:

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (16): OnboardingWizard(), STEP_LABELS, OriginsStep(), AcademicCard(), OriginChips(), Mode, PreferencesCard(), Chip() (+8 more)

### Community 34 - "Community 34"
Cohesion: 0.23
Nodes (9): FriendsPage(), Mode, Status, getUsers(), removeFriend(), respondToFriendRequest(), sendFriendRequest(), DirectoryUser (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (29): GroupDetailPage(), Mode, CitiesParams, deleteGroup(), getCity(), getGroup(), getGroupTrips(), getSavedCities() (+21 more)

### Community 36 - "Community 36"
Cohesion: 0.20
Nodes (8): ExplorePage(), LandingPage(), BoardSkeleton(), DepartureBoardProps, DepartureRow, DealTier, getCities(), formatDateBoard()

### Community 37 - "Community 37"
Cohesion: 0.31
Nodes (8): NO_PERIODS, UniCalendarContext, UniCalendarValue, TUE_2026_2027, UniPeriod, UniPeriodKind, UNIVERSITY_CALENDARS, UniversityId

### Community 38 - "Community 38"
Cohesion: 0.15
Nodes (14): formatDelta(), TIER_BADGE, TripPopoverProps, TripTooltipProps, cache, pickExtensions(), StayExtension, useStayExtensions() (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): API (`api/`), Architecture, Components, Data Flow, Database (`database/`), Dependencies, Frontend (`frontend/`), Pipeline (`run_pipeline.py`) (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): Architectural Decisions, Architecture, Current Status, graphify, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (20): AdminPage(), LiveBoard(), PoolTiles(), PoolTilesProps, PoolTilesSkeleton(), RunFeed(), Status, STATUS_STYLE (+12 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (17): BestPerMonth(), BestPerMonthProps, buildSlots(), MONTHS_SHORT, MonthSlot, nightsBetween(), TripRowProps, AgendaMonthProps (+9 more)

### Community 43 - "Community 43"
Cohesion: 0.24
Nodes (9): CityCardProps, CityCardSkeleton(), DestinationsStep(), groupByRegion(), BOX, ICON, StarButton(), StarButtonProps (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (15): CityDetail(), CityDetailFallback(), CityDetailProps, ORIGIN_NAME, ExploreControls(), ExploreControlsProps, FavouritesStrip(), FavouritesStripProps (+7 more)

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (7): _build_google_flights_url(), _fli_to_flight(), _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Convert minutes to '2h 30m' format., Build a Google Flights search URL., Convert a Fli round-trip result tuple into our Flight dataclass.

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (10): Cross-cutting rules (all phases), Multi-City / Open-Jaw — Full Roadmap, Phase 0 — Data foundation ✅ (reference), Phase 1 — Combo engine + API (origin-side, no UI), Phase 2 — Origin-side UI: City page + booking links, Phase 3 — Origin-side UI: Explore + Calendar, Phase 4 — Destination-side pairing data + engine extension, Phase 5 — Destination-side UI: twin-city trips (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (5): FavouritesCard(), EMPTY, SavedCitiesContext, SavedCitiesValue, useSavedCities()

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): deduplicate(), filter_direct_only(), normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t (+5 more)

### Community 49 - "UserMatcher"
Cohesion: 0.31
Nodes (9): buildDensity(), GroupTripsCalendar(), GroupTripsCalendarProps, monthSpan(), todayStr(), useIsMobile(), GroupTripsData, useUniCalendar() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): User, Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., _window_trip_range()

### Community 51 - "Community 51"
Cohesion: 0.38
Nodes (9): build_airports_ts(), build_destinations_ts(), destination_line(), main(), origin_line(), Codegen: export scraper/targets.py pool data to TypeScript for the frontend.  Wr, JSON string literal == valid TS string literal. Keep unicode readable., ts_str() (+1 more)

### Community 52 - "Where It's Going"
Cohesion: 0.15
Nodes (12): Beyond, Current Capabilities, Deploy, Design Principles, Email Notifications, Multi-User, Next (near-term), Price Trends (+4 more)

### Community 53 - ".contains_date"
Cohesion: 0.22
Nodes (5): Return all airports (home + nearby) for searching., Convert to dictionary for MongoDB storage., Convert to dictionary without sensitive fields (for API responses)., User model with embedded preferences.      MongoDB document structure:     {, User

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
Cohesion: 0.18
Nodes (9): GroupsPage(), Mode, DangerZone(), Phase, adminWipe(), ApiError, createGroup(), getGroups() (+1 more)

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

### Community 78 - ".create"
Cohesion: 0.25
Nodes (5): datetime, Find active availability windows that overlap with a given date range., Update the dates of an availability window., Create a new availability window.          Args:             user_id: User's, Create multiple availability windows at once.          Args:             user

### Community 79 - "route.ts"
Cohesion: 0.20
Nodes (10): matchesSelection(), CityCard(), COUNTRY_NAMES, countryName(), KIND_LABEL, SearchableCity, SearchCombobox(), SearchComboboxProps (+2 more)

### Community 80 - "main"
Cohesion: 0.18
Nodes (13): nightsBetween(), TripRow(), TripRowSkeleton(), Spark(), SparkPoint, SparkProps, Origin, ORIGINS (+5 more)

### Community 81 - "YearPaint"
Cohesion: 0.39
Nodes (9): addDays(), buildRoles(), keysBetween(), keysToWindows(), prettyDay(), todayKey(), toKey(), windowsToKeys() (+1 more)

### Community 82 - "layout.tsx"
Cohesion: 0.36
Nodes (5): bricolage, instrument, splineMono, metadata, viewport

### Community 83 - "FareTag.tsx"
Cohesion: 0.25
Nodes (5): FareTagProps, FareTagSize, SIZE_CLASSES, SKELETON_SIZES, TIER_CLASSES

### Community 84 - "admin.py"
Cohesion: 0.08
Nodes (24): get_connection_string(), MongoDB configuration settings.  Uses environment variables with sensible defa, Build MongoDB connection string., close_connection(), get_collection(), MongoDB connection manager.  Singleton pattern to ensure a single database con, Get a collection by name., Close the database connection. (+16 more)

### Community 85 - "admin.py"
Cohesion: 0.29
Nodes (6): clear_all_data(), get_schedule(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Delete all scraped flight data. User accounts and preferences are untouched.

### Community 86 - "CheckInStep.tsx"
Cohesion: 0.33
Nodes (5): FlapText(), FlapTextProps, SIZE_CLASSES, CheckInStep(), PITCH_ROWS

### Community 87 - "Providers.tsx"
Cohesion: 0.47
Nodes (4): Providers(), EXEMPT_PREFIXES, OnboardingGate(), UniCalendarProvider()

### Community 88 - "UserMatcher"
Cohesion: 0.50
Nodes (4): get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses, Service for matching flights to user preferences.      Usage:         matcher, UserMatcher

### Community 89 - "TODO"
Cohesion: 0.33
Nodes (5): Done (for reference), Long Term — Auth, Notifications & Reach, Medium Term — Pool-based scraping (in progress), Short Term — Auth, UI & Test Deployment, TODO

### Community 90 - ".contains_date"
Cohesion: 0.40
Nodes (3): datetime, Check if a date falls within this availability window., Check if this availability overlaps with a given date range.

### Community 91 - "academic.ts"
Cohesion: 0.70
Nodes (4): generateFreeWindows(), isoWeekday(), pad(), toStr()

### Community 97 - "setup_logging"
Cohesion: 0.67
Nodes (3): Logger, Configure logging for the scraper., setup_logging()

## Knowledge Gaps
- **274 isolated node(s):** `Current Status`, `Architecture`, `How to Run`, `Key Files`, `Key Config` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 7` to `Community 5`, `Community 8`, `Community 15`, `admin.py`, `admin.py`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `AzairScraper` connect `Community 26` to `Community 10`, `Community 27`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Flight` connect `Community 27` to `Community 10`, `Community 45`, `Community 48`, `Community 18`, `Community 26`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Current Status`, `Architecture`, `How to Run` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._