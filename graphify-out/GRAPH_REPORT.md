# Graph Report - somewhere  (2026-07-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1260 nodes · 2428 edges · 74 communities (66 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

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
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
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

## God Nodes (most connected - your core abstractions)
1. `UserRepository` - 43 edges
2. `getDb()` - 35 edges
3. `DestinationRepository` - 33 edges
4. `FlightModel` - 31 edges
5. `AvailabilityRepository` - 29 edges
6. `Flight` - 28 edges
7. `get_collection()` - 26 edges
8. `Trip` - 26 edges
9. `RouteStats` - 24 edges
10. `FlightRepository` - 24 edges

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

## Communities (74 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (68): GET(), num(), numOrNull(), toIso(), GET(), num(), numOrNull(), toDate() (+60 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (45): GET(), citiesForOrigins(), GET(), DateStr, GET(), QuerySchema, asNumberOrNull(), fetchBaselines() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (37): ExplorePage(), matchesSelection(), LandingPage(), BoardSkeleton(), DepartureBoardProps, DepartureRow, FlapText(), FlapTextProps (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (31): GoogleButton(), PersonLabel(), addDays(), BadgeState, buildMonths(), buildRoles(), daysInMonth(), DragMode (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (33): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), clear_all_data(), get_schedule(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Delete all scraped flight data. User accounts and preferences are untouched. (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (40): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (28): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, DateWindow, get_preferences(), BaseModel, GET  /api/preferences — read the full UserPreferences object PUT  /api/preferen, save_preferences() (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (20): Deactivate an availability window., Activate an availability window., Delete an availability window (hard delete)., Delete all availability windows for a user. Returns count deleted., Count availability windows for a user., Find all user IDs who want a specific destination.         Useful for reverse l, Get just the destination codes for a user (for scraper)., Update the priority of a destination preference. (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (20): PriceHistory, Price history model - historical price snapshots for flights., Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from MongoDB document., Create PriceHistory from flight data., PriceHistoryRepository, Get comprehensive stats for a route. (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (18): get_connection_string(), MongoDB configuration settings.  Uses environment variables with sensible defa, Build MongoDB connection string., close_connection(), get_collection(), MongoDB connection manager.  Singleton pattern to ensure a single database con, Get a collection by name., Close the database connection. (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (16): Availability, datetime, Availability model - user's available date ranges for travel., User's availability window for travel.      MongoDB document structure:     {, Return the number of days in this availability window., Check if a date falls within this availability window., Check if this availability overlaps with a given date range., Convert to dictionary for MongoDB storage. (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (13): Create FlightModel from MongoDB document., FlightRepository, Find a flight by its unique key., Find flights by route., Find flights from an origin., Find flights to a destination., Find flights within a date range.          Args:             start_date: Earlies, Find flights under a certain price. (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (13): DestinationPreference, User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Create DestinationPreference from MongoDB document., Convert to dictionary for API responses., Find a specific destination preference for a user., Find high priority (priority=1) destinations for a user. (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (13): Create User from MongoDB document., User, Update an existing user.          Args:             user: User object with up, Update a user's password., Find an existing user by email or create a new one (no password required)., Authenticate a user by email and password.          Args:             email:, Hash a password using bcrypt., Verify a password against its hash. (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (12): Destination preference model - user's preferred travel destinations., Route statistics model - aggregated price data for routes., ScrapeRun model — one document per scraper execution of one route.  Pure observa, ScrapeRunModel, User model with embedded airports and notification preferences., User's airport preferences., User's notification preferences., User's search preferences. (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (20): clampDayInMonth(), dayStr(), isWeekend(), MONTHS_LONG, MonthSpec, pad(), spansMonth(), toDateStr() (+12 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (16): FliAirport, _build_google_flights_url(), _fli_to_flight(), FliScraper, _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: Sear (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (8): ScrapeTarget model — one document per (origin, destination) route in the pool., ScrapeTargetModel, datetime, ScrapeTargetRepository — manages the route pool.  Core operations:   bulk_upsert, Atomically claim the next-due enabled target.          Marks it as 'running' by, Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples., ScrapeTargetRepository

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (13): CalendarPage(), CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS, TierFilter, TIERS, addMonths(), monthSpan() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (18): BestPerMonthProps, MonthSlot, AgendaMonth(), AgendaMonthProps, WeekGroup, DaySheet(), DaySheetProps, TripTooltip() (+10 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (11): bricolage, instrument, splineMono, metadata, viewport, LINKS, Navigation(), NavigationProps (+3 more)

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (16): Most recent runs, newest first., ScrapeRunRepository, _ensure_file_logging(), in_active_window(), main(), datetime, Pool Scheduler — target-driven, user-agnostic flight scraping.  Pulls due routes, Run Fli for a single route and persist results.      Returns: {"status": ..., "f (+8 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (12): AcademicCard(), WEEKDAYS, clampNights(), Mode, PreferencesCard(), generateFreeWindows(), isoWeekday(), pad() (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (12): TIER_BADGE, TripPopoverProps, Badge(), BadgeProps, BadgeVariant, DEFAULT_LABEL, VARIANT_CLASSES, Sheet() (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.16
Nodes (11): Logger, AzairScraper, datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+3 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (10): Flight, flights_to_json(), Represents a flight deal., Convert list of flights to JSON string., Set scraped_at timestamp if not provided., Check if both legs are direct flights., Unique key for this route (for grouping)., Unique identifier for this specific flight. (+2 more)

### Community 28 - "Community 28"
Cohesion: 0.17
Nodes (15): MongoDB index setup script (v2).  Run this once to create all necessary indexes, Create the v2 index set for the flights collection and drop everything     else, Create indexes for scrape_targets collection (pool scheduler)., Create indexes for scrape_runs collection (observability log)., Create all indexes for all collections., Create indexes for users collection., Create indexes for availability collection., Create indexes for friendships collection (written by the frontend). (+7 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (9): LiveBoard(), RunFeed(), Status, STATUS_STYLE, TargetsTable(), timeAgo(), adminRuns(), AdminRunsResponse (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (13): Database, get_database(), Get the database instance., Get the database instance., drop_all_indexes(), list_all_indexes(), List all indexes in all collections., Drop all indexes (except _id) from all collections. Use with caution! (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (7): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     {

### Community 32 - "Community 32"
Cohesion: 0.21
Nodes (8): get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses, Find cheapest matching flights (deal scoring moved to frontend)., Get a summary of a user's matches.          Returns:             Dict with co, Get match summaries for all active users., Service for matching flights to user preferences.      Usage:         matcher, Find flights matching a user's availability and preferences.          Args:, UserMatcher

### Community 33 - "Community 33"
Cohesion: 0.23
Nodes (9): CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName(), TIER_BAR, TripBar(), TripBarProps, formatPrice() (+1 more)

### Community 34 - "Community 34"
Cohesion: 0.18
Nodes (4): CityDetailFallback(), CityDetailProps, TripRowSkeleton(), CityDetailResponse

### Community 35 - "Community 35"
Cohesion: 0.18
Nodes (11): CitiesParams, getCity(), qs(), QueryValue, TripsParams, AvailabilityResponse, CitiesResponse, SavedCitiesResponse (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.36
Nodes (9): BestPerMonth(), buildSlots(), MONTHS_SHORT, nightsBetween(), nightsBetween(), TripRow(), TripRowProps, formatRange() (+1 more)

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (7): filter_by_price(), Filter flights by maximum price., DateRange, Find deals under a certain price.          Convenience method that searches an, Represents a date range for availability., Full search across multiple origins, destinations, and date ranges.          Sam, Phase 1: Use SearchDates to find cheapest dates per route.          Returns list

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (8): expand_routes(), origin_codes(), Scrape target pool — origins, destinations, and tier assignments.  Pool-based sc, Yield (origin, destination, tier) for every valid route in the pool.      Skips, Quick stats for logging., summary(), main(), Seed scrape_targets from scraper/targets.py.  Idempotent — safe to re-run after

### Community 39 - "Community 39"
Cohesion: 0.20
Nodes (6): DatabaseConnection, Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Close the database connection., Check if connected to MongoDB., MongoClient

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (5): Return all airports (home + nearby) for searching., Convert to dictionary for MongoDB storage., Convert to dictionary without sensitive fields (for API responses)., User model with embedded preferences.      MongoDB document structure:     {, User

### Community 41 - "Community 41"
Cohesion: 0.31
Nodes (6): AdminPage(), PoolTiles(), PoolTilesProps, PoolTilesSkeleton(), adminPool(), AdminPoolSummary

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (8): FriendsPage(), Mode, getFriends(), getUsers(), removeFriend(), request(), respondToFriendRequest(), sendFriendRequest()

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (8): TripPopover(), Origin, ORIGINS, buildAzairSearchUrl(), buildGoogleFlightsSearchUrl(), getOriginName(), getSearchUrl(), SearchableTrip

### Community 44 - "Community 44"
Cohesion: 0.20
Nodes (8): deduplicate(), filter_direct_only(), Filter to only include direct flights., Sort flights by price ascending., Remove duplicate flights based on unique_key., sort_by_price(), Full search across multiple origins, destinations, and date ranges.          A, Print scraping statistics.

### Community 45 - "Community 45"
Cohesion: 0.38
Nodes (9): build_airports_ts(), build_destinations_ts(), destination_line(), main(), origin_line(), Codegen: export scraper/targets.py pool data to TypeScript for the frontend.  Wr, JSON string literal == valid TS string literal. Keep unicode readable., ts_str() (+1 more)

### Community 46 - "Community 46"
Cohesion: 0.29
Nodes (7): login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me, Find or create a user by email. Returns user_id, name, email.     No password r, Validate a stored user ID. Returns user info or 401.     Called on app load to

### Community 47 - "Community 47"
Cohesion: 0.25
Nodes (5): FareTagProps, FareTagSize, SIZE_CLASSES, SKELETON_SIZES, TIER_CLASSES

### Community 48 - "Community 48"
Cohesion: 0.32
Nodes (7): normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t, Parse a single flight result div.

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (4): datetime, Update the dates of an availability window., Create a new availability window.          Args:             user_id: User's, Create multiple availability windows at once.          Args:             user

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): User, Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., _window_trip_range()

### Community 52 - "Community 52"
Cohesion: 0.33
Nodes (5): SortDir, SortKey, TargetsTableProps, TargetsTableSkeleton(), AdminTargetSummary

### Community 53 - "Community 53"
Cohesion: 0.38
Nodes (6): getSavedCities(), putSavedCities(), EMPTY, SavedCitiesContext, SavedCitiesProvider(), SavedCitiesValue

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (4): Any, Create FlightModel from scraper's Flight dataclass.          Args:             f, Any, Save flights from scraper to database.          Steps:           1. Convert scra

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (3): Upsert a single flight. Returns {"new": 0|1, "updated": 0|1}., Alias for bulk_upsert. Returns {"new": X, "updated": Y}., Upsert many flights in a single bulk_write call.          v2 semantics:

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (4): DangerZone(), Phase, adminWipe(), ApiError

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
Cohesion: 0.50
Nodes (4): main(), Flight Scraper Pipeline - Phase 3 Integration  This script connects the scrape, Run the scraper and save results to database.      Args:         full_scan: I, run_pipeline()

### Community 62 - "Community 62"
Cohesion: 0.50
Nodes (4): Save flights to a JSON file., save_flights_json(), main(), Test the scraper with a small search.

## Knowledge Gaps
- **168 isolated node(s):** `install.sh script`, `PutBodySchema`, `DEFAULTS`, `PutBodySchema`, `DateStr` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 7` to `Community 5`, `Community 8`, `Community 10`, `Community 46`, `Community 15`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `AzairScraper` connect `Community 26` to `Community 37`, `Community 5`, `Community 7`, `Community 44`, `Community 27`, `Community 60`, `Community 62`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `FlightModel` connect `Community 31` to `Community 32`, `Community 7`, `Community 10`, `Community 12`, `Community 16`, `Community 50`, `Community 54`, `Community 55`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `install.sh script`, `PutBodySchema`, `DEFAULTS` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._