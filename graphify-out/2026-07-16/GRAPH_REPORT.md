# Graph Report - somewhere  (2026-07-16)

## Corpus Check
- 177 files · ~86,723 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1451 nodes · 2735 edges · 96 communities (86 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7998ca1a`
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
- .from_dict
- route.ts
- route.ts
- saved-cities.tsx
- auth.config.ts
- ScrapeRunModel
- route.ts
- route.ts
- route.ts
- ApiError
- lanes.ts
- TODO
- route.ts
- .find_by_date_range
- Input.tsx

## God Nodes (most connected - your core abstractions)
1. `UserRepository` - 43 edges
2. `DestinationRepository` - 33 edges
3. `getDb()` - 32 edges
4. `FlightModel` - 31 edges
5. `request()` - 30 edges
6. `AvailabilityRepository` - 29 edges
7. `Flight` - 28 edges
8. `Trip` - 26 edges
9. `get_collection()` - 26 edges
10. `RouteStats` - 24 edges

## Surprising Connections (you probably didn't know these)
- `list_users()` --calls--> `UserRepository`  [EXTRACTED]
  api/routes/admin.py → database/repositories/user_repo.py
- `DateWindow` --uses--> `UserRepository`  [INFERRED]
  api/routes/preferences.py → database/repositories/user_repo.py
- `UserPreferences` --uses--> `UserRepository`  [INFERRED]
  api/routes/preferences.py → database/repositories/user_repo.py
- `_run_scrape()` --calls--> `AzairScraper`  [INFERRED]
  api/routes/scrape.py → scraper-azair/scraper.py
- `_run_scrape()` --calls--> `DateRange`  [INFERRED]
  api/routes/scrape.py → scraper-azair/scraper.py

## Import Cycles
- None detected.

## Communities (96 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (31): POST(), POST(), POST(), PostBodySchema, DELETE(), DELETE(), GET(), PATCH() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (43): GET(), citiesForOrigins(), GET(), DateStr, GET(), QuerySchema, ALL_ORIGIN_CODES, AvailWindow (+35 more)

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (10): ExplorePage(), matchesSelection(), LandingPage(), CityCard(), CityCardSkeleton(), COUNTRY_NAMES, countryName(), getCities() (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (25): addDays(), BadgeState, buildMonths(), buildRoles(), daysInMonth(), DragMode, DragState, Edge (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (28): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), get_schedule(), Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Insert or update schedule state for an origin., Return state for all origins, sorted by origin code., Return state for a single origin., Remove all schedule state (e.g. after changing the origin list). (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (40): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (10): CityDetail(), CityDetailFallback(), CityDetailProps, ORIGIN_NAME, TripRowSkeleton(), BOX, ICON, StarButton() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (20): Deactivate an availability window., Activate an availability window., Delete an availability window (hard delete)., Delete all availability windows for a user. Returns count deleted., Count availability windows for a user., Find all user IDs who want a specific destination.         Useful for reverse l, Get just the destination codes for a user (for scraper)., Update the priority of a destination preference. (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (20): PriceHistory, Price history model - historical price snapshots for flights., Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from MongoDB document., Create PriceHistory from flight data., PriceHistoryRepository, Get comprehensive stats for a route. (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (29): clear_all_data(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Delete all scraped flight data. User accounts and preferences are untouched., get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses, get_connection_string(), MongoDB configuration settings.  Uses environment variables with sensible defa (+21 more)

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
Cohesion: 0.12
Nodes (9): DestinationPreference, User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Find a specific destination preference for a user., Update an existing destination preference., Create a new destination preference.          Args:             user_id: User (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (21): login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me, Find or create a user by email. Returns user_id, name, email.     No password r, Validate a stored user ID. Returns user info or 401.     Called on app load to, User (+13 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (5): User's airport preferences., Create User from MongoDB document., User's notification preferences., UserAirports, UserNotifications

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (17): addMonths(), clampDayInMonth(), dayStr(), isWeekend(), MONTHS_LONG, monthSpan(), MonthSpec, pad() (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.16
Nodes (11): FliAirport, FliScraper, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: Sear, Full search across multiple origins, destinations, and date ranges.          Sam, Phase 1: Use SearchDates to find cheapest dates per route.          Returns list, Call SearchDates with error handling. Returns list of {out_date, ret_date, price, Phase 2: Get full flight details for each cheap date combo. (+3 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (30): ScrapeTargetModel, Most recent runs, newest first., ScrapeRunRepository, datetime, Atomically claim the next-due enabled target.          Marks it as 'running' by, Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples., ScrapeTargetRepository (+22 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (12): CalendarPage(), CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS, TierFilter, TIERS, useIsMobile(), Chip() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (30): BestPerMonth(), BestPerMonthProps, buildSlots(), MONTHS_SHORT, MonthSlot, nightsBetween(), nightsBetween(), TripRow() (+22 more)

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (11): bricolage, instrument, splineMono, metadata, viewport, LINKS, Navigation(), NavigationProps (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (13): FriendsPage(), Mode, Status, PersonLabel(), Button(), ButtonProps, getUsers(), removeFriend() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.20
Nodes (9): AcademicCard(), WEEKDAYS, clampNights(), Mode, PreferencesCard(), todayStr(), getPreferences(), putAvailability() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (28): AdminTargetSummarySchema, CityBest, CityBestSchema, CitySummarySchema, DateStringSchema, DealTierSchema, DirectoryUserSchema, FlightDocSchema (+20 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): AzairScraper, main(), datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (12): Flight, flights_to_json(), Represents a flight deal., Convert list of flights to JSON string., Save flights to a JSON file., Set scraped_at timestamp if not provided., Check if both legs are direct flights., Unique key for this route (for grouping). (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (12): BoardSkeleton(), DepartureBoardProps, DepartureRow, FlapText(), FlapTextProps, SIZE_CLASSES, DealTier, FareTagProps (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (14): LiveBoard(), RunFeed(), Status, STATUS_STYLE, SortDir, SortKey, TargetsTable(), TargetsTableProps (+6 more)

### Community 30 - "Community 30"
Cohesion: 0.12
Nodes (21): drop_all_indexes(), list_all_indexes(), MongoDB index setup script (v2).  Run this once to create all necessary indexes, Create the v2 index set for the flights collection and drop everything     else, Create indexes for scrape_targets collection (pool scheduler)., Create indexes for scrape_runs collection (observability log)., Create all indexes for all collections., List all indexes in all collections. (+13 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (7): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     {

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (4): Find cheapest matching flights (deal scoring moved to frontend)., Get a summary of a user's matches.          Returns:             Dict with co, Get match summaries for all active users., Find flights matching a user's availability and preferences.          Args:

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (13): CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName(), TIER_BAR, TripBar(), TripBarProps, Badge() (+5 more)

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (14): InviteCard(), addGroupMember(), CitiesParams, getFriends(), QueryValue, rotateGroupInvite(), TripsParams, AvailabilityResponse (+6 more)

### Community 35 - "Community 35"
Cohesion: 0.21
Nodes (13): GroupDetailPage(), Mode, deleteGroup(), getCity(), getGroup(), getGroupTrips(), leaveGroup(), qs() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (4): JoinPage(), getJoinInfo(), joinGroup(), JoinInfoResponse

### Community 37 - "Community 37"
Cohesion: 0.18
Nodes (9): main(), Flight Scraper Pipeline - Phase 3 Integration  This script connects the scrape, Run the scraper and save results to database.      Args:         full_scan: I, run_pipeline(), filter_by_price(), Filter flights by maximum price., DateRange, Find deals under a certain price.          Convenience method that searches an (+1 more)

### Community 38 - "Community 38"
Cohesion: 0.19
Nodes (16): POST(), DELETE(), PATCH(), PatchBodySchema, POST(), PostBodySchema, GET(), GET() (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): API (`api/`), Architecture, Components, Data Flow, Database (`database/`), Dependencies, Frontend (`frontend/`), Pipeline (`run_pipeline.py`) (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): Architectural Decisions, Architecture, Current Status, graphify, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 41 - "Community 41"
Cohesion: 0.31
Nodes (6): AdminPage(), PoolTiles(), PoolTilesProps, PoolTilesSkeleton(), adminPool(), AdminPoolSummary

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (5): Destination preference model - user's preferred travel destinations., Route statistics model - aggregated price data for routes., ScrapeTarget model — one document per (origin, destination) route in the pool., User's search preferences., UserSearchPreferences

### Community 43 - "Community 43"
Cohesion: 0.15
Nodes (6): Create FlightModel from MongoDB document., Find flights by route., Find flights from an origin., Find flights under a certain price., Find recently scraped flights., Get cheapest flight per route.

### Community 44 - "Community 44"
Cohesion: 0.28
Nodes (7): _build_google_flights_url(), _fli_to_flight(), _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Convert minutes to '2h 30m' format., Build a Google Flights search URL., Convert a Fli round-trip result tuple into our Flight dataclass.

### Community 45 - "Community 45"
Cohesion: 0.38
Nodes (9): build_airports_ts(), build_destinations_ts(), destination_line(), main(), origin_line(), Codegen: export scraper/targets.py pool data to TypeScript for the frontend.  Wr, JSON string literal == valid TS string literal. Keep unicode readable., ts_str() (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (19): CityCardProps, ExploreControls(), ExploreControlsProps, KIND_LABEL, SearchCombobox(), SearchComboboxProps, SearchSelection, Suggestion (+11 more)

### Community 47 - "Community 47"
Cohesion: 0.12
Nodes (15): Database, DatabaseConnection, get_database(), Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Get the database instance., Close the database connection., Check if connected to MongoDB. (+7 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): deduplicate(), filter_direct_only(), normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t (+5 more)

### Community 49 - "Community 49"
Cohesion: 0.40
Nodes (5): assignLanes(), Interval, LaneAssignment, LaneTrip, overlaps()

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): User, Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., _window_trip_range()

### Community 51 - "Community 51"
Cohesion: 0.70
Nodes (4): generateFreeWindows(), isoWeekday(), pad(), toStr()

### Community 52 - "Where It's Going"
Cohesion: 0.15
Nodes (12): Beyond, Current Capabilities, Deploy, Design Principles, Email Notifications, Multi-User, Next (near-term), Price Trends (+4 more)

### Community 53 - "getDb"
Cohesion: 0.18
Nodes (12): asNumberOrNull(), fetchBaselines(), getBaselines, RouteBaseline, clamp(), scoreTrip(), TripScore, buildDensity() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (4): Any, Create FlightModel from scraper's Flight dataclass.          Args:             f, Any, Save flights from scraper to database.          Steps:           1. Convert scra

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (3): Upsert a single flight. Returns {"new": 0|1, "updated": 0|1}., Alias for bulk_upsert. Returns {"new": X, "updated": Y}., Upsert many flights in a single bulk_write call.          v2 semantics:

### Community 56 - "UserMatcher"
Cohesion: 0.10
Nodes (26): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, DateWindow, get_preferences(), BaseModel, GET  /api/preferences — read the full UserPreferences object PUT  /api/preferen, save_preferences() (+18 more)

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
Cohesion: 0.67
Nodes (3): Logger, Configure logging for the scraper., setup_logging()

### Community 74 - "Somewhere — v1 Design Contract"
Cohesion: 0.18
Nodes (10): A. Information architecture, B. Data layer (Python side — phase 0), C. Scoring (TypeScript, read-time — `frontend/lib/score.ts`), D. API contract (Next.js routes, zod-validated at boundary), E. Auth — NextAuth (Auth.js) v5, F. Visual design system, G. Calendar design (`/calendar`), H. Build phases (+2 more)

### Community 75 - "User"
Cohesion: 0.22
Nodes (5): Return all airports (home + nearby) for searching., Convert to dictionary for MongoDB storage., Convert to dictionary without sensitive fields (for API responses)., User model with embedded preferences.      MongoDB document structure:     {, User

### Community 76 - "✅ Done"
Cohesion: 0.22
Nodes (8): Data layer v2 (commit `a46c3a0`) + Atlas migration (run 2026-06-10), ✅ Done, Frontend v1 rebuild (commit `2c5126c`, tsc clean, `next build` green — 16 routes + middleware), Known facts for next session, ⬜ Left to do, Somewhere v1 — Build Progress, Vercel, Verified locally (dev server :4173, real Atlas data)

### Community 77 - "Somewhere (flight scraper) — AI Context"
Cohesion: 0.25
Nodes (7): Architectural Decisions, Architecture, Current Status, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 78 - ".from_dict"
Cohesion: 0.25
Nodes (4): Create DestinationPreference from MongoDB document., Find high priority (priority=1) destinations for a user., Find a destination preference by ID., Find all destination preferences for a user.          Args:             user_

### Community 79 - "route.ts"
Cohesion: 0.50
Nodes (7): GET(), num(), numOrNull(), toDate(), toIso(), VALID_STATUS, AdminRunsResponseSchema

### Community 80 - "route.ts"
Cohesion: 0.48
Nodes (6): GET(), num(), numOrNull(), toIso(), AdminPoolSummarySchema, Tier

### Community 81 - "saved-cities.tsx"
Cohesion: 0.38
Nodes (6): getSavedCities(), putSavedCities(), EMPTY, SavedCitiesContext, SavedCitiesProvider(), SavedCitiesValue

### Community 83 - "ScrapeRunModel"
Cohesion: 0.33
Nodes (3): ScrapeRun model — one document per scraper execution of one route.  Pure observa, ScrapeRunModel, Insert a 'running' record. Returns the inserted _id as str.

### Community 84 - "route.ts"
Cohesion: 0.47
Nodes (5): GET(), PUT(), PutBodySchema, AvailabilityResponseSchema, DateWindowSchema

### Community 85 - "route.ts"
Cohesion: 0.47
Nodes (5): DEFAULTS, GET(), PUT(), Preferences, PreferencesSchema

### Community 86 - "route.ts"
Cohesion: 0.60
Nodes (5): GET(), PUT(), PutBodySchema, sanitize(), SavedCitiesResponseSchema

### Community 87 - "ApiError"
Cohesion: 0.18
Nodes (9): GroupsPage(), Mode, DangerZone(), Phase, adminWipe(), ApiError, createGroup(), getGroups() (+1 more)

### Community 88 - "lanes.ts"
Cohesion: 0.18
Nodes (7): TIER_BADGE, TripPopoverProps, Sheet(), SheetProps, Spark(), SparkPoint, SparkProps

### Community 89 - "TODO"
Cohesion: 0.33
Nodes (5): Done (for reference), Long Term — Auth, Notifications & Reach, Medium Term — Pool-based scraping (in progress), Short Term — Auth, UI & Test Deployment, TODO

### Community 90 - "route.ts"
Cohesion: 0.83
Nodes (3): POST(), WipeBodySchema, WipeResponseSchema

## Knowledge Gaps
- **243 isolated node(s):** `Current Status`, `Architecture`, `How to Run`, `Key Files`, `Key Config` (+238 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 15` to `UserMatcher`, `Community 8`, `Community 10`, `Community 5`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `FlightModel` connect `Community 31` to `Community 32`, `Community 10`, `Community 43`, `Community 42`, `Community 12`, `Community 50`, `Community 54`, `Community 55`, `.find_by_date_range`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `AzairScraper` connect `Community 26` to `UserMatcher`, `Community 5`, `Community 27`, `Community 37`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Current Status`, `Architecture`, `How to Run` to the rest of the system?**
  _243 weakly-connected nodes found - possible documentation gaps or missing edges._