# Graph Report - somewhere  (2026-07-19)

## Corpus Check
- 227 files · ~126,477 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1769 nodes · 3682 edges · 99 communities (88 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ef6c28d2`
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
- lanes.ts
- setup_logging
- ApiError
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

## Communities (99 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (82): GET(), loadGridStats(), num(), numOrNull(), toIso(), toMs(), GET(), num() (+74 more)

### Community 1 - "Community 1"
Cohesion: 0.33
Nodes (11): build_airports_ts(), build_destinations_ts(), build_groundpairs_ts(), destination_line(), ground_pair_line(), main(), origin_line(), Codegen: export scraper/targets.py pool data to TypeScript for the frontend.  Wr (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (36): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (25): addDays(), BadgeState, buildMonths(), buildRoles(), daysInMonth(), DragMode, DragState, Edge (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (28): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), get_schedule(), Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Insert or update schedule state for an origin., Return state for all origins, sorted by origin code., Return state for a single origin., Remove all schedule state (e.g. after changing the origin list). (+20 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (44): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+36 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (25): clear_all_data(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Delete all scraped flight data. User accounts and preferences are untouched., get_connection_string(), MongoDB configuration settings.  Uses environment variables with sensible defa, Build MongoDB connection string., close_connection() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (19): Deactivate an availability window., Activate an availability window., Delete an availability window (hard delete)., Delete all availability windows for a user. Returns count deleted., Count availability windows for a user., Find all user IDs who want a specific destination.         Useful for reverse l, Get just the destination codes for a user (for scraper)., Update the priority of a destination preference. (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.06
Nodes (19): PriceHistory, Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from MongoDB document., Create PriceHistory from flight data., PriceHistoryRepository, Get comprehensive stats for a route., Get monthly average prices for a route.          Returns:             Dict of (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (8): main(), Flight Scraper Pipeline - Phase 3 Integration  This script connects the scrape, Run the scraper and save results to database.      Args:         full_scan: I, run_pipeline(), DateRange, Represents a date range for availability., Full search across multiple origins, destinations, and date ranges.          Sam, Phase 1: Use SearchDates to find cheapest dates per route.          Returns list

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (12): Availability, User's availability window for travel.      MongoDB document structure:     {, Return the number of days in this availability window., Convert to dictionary for MongoDB storage., Create Availability from MongoDB document., Convert to dictionary for API responses., Find active availability windows that overlap with a given date range., Find all future availability windows for a user. (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (23): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Create FlightModel from MongoDB document., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     { (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+32 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (14): ExplorePage(), LandingPage(), BoardSkeleton(), DepartureBoardProps, DepartureRow, FlapText(), FlapTextProps, SIZE_CLASSES (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (10): User, Update an existing user.          Args:             user: User object with up, Update a user's password., Find an existing user by email or create a new one (no password required)., Authenticate a user by email and password.          Args:             email:, Hash a password using bcrypt., Verify a password against its hash., Create a new user.          Args:             email: User's email address (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (13): DestinationPreference, User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Create DestinationPreference from MongoDB document., Convert to dictionary for API responses., Find a specific destination preference for a user., Find high priority (priority=1) destinations for a user. (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (26): CityLink(), LegLink(), OpenJawRow(), OpenJawRowProps, MONTHS3, returnChip(), TIER_BAR, TripBar() (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (10): FliAirport, FliScraper, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: two, Call SearchDates with error handling. Returns list of {out_date, ret_date, price, One-way SearchDates grid. Returns {date_str: cheapest one-way price}., Phase 2: Get full flight details for each cheap date combo., Call SearchFlights with error handling. Returns list of Flight dataclass objects (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (14): _ensure_file_logging(), in_active_window(), main(), datetime, Pool Scheduler — target-driven, user-agnostic flight scraping.  Pulls due routes, Run Fli for a single route and persist results.      Returns: {"status": ..., "f, Claim the next-due target and scrape it.      Returns True if a route was scrape, Slot loop. Sleeps SLOT_MINUTES between attempts; idles outside active window. (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.15
Nodes (12): AdminPage(), DangerZone(), Phase, agoLabel(), GridStatsCard(), PoolTiles(), PoolTilesProps, PoolTilesSkeleton() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (10): OnewayFareModel, One-way fare grid for a directed leg.      MongoDB document structure:     {, Unique identifier for this directed leg., Convert to dictionary for MongoDB storage., Create OnewayFareModel from MongoDB document., Wholesale-replace each leg's fare grid.          Returns:             {"new": X,, Get the fare grid for one directed leg., All legs departing from an airport. (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (14): bricolage, instrument, splineMono, metadata, viewport, LINKS, Navigation(), NavigationProps (+6 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (32): Database, get_database(), Get the database instance., Get the database instance., drop_all_indexes(), list_all_indexes(), MongoDB index setup script (v2).  Run this once to create all necessary indexes, Create the v2 index set for the flights collection and drop everything     else (+24 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (19): Availability model - user's available date ranges for travel., Destination preference model - user's preferred travel destinations., Price history model - historical price snapshots for flights., Route statistics model - aggregated price data for routes., User model with embedded airports and notification preferences., Return all airports (home + nearby) for searching., Convert to dictionary for MongoDB storage., User's airport preferences. (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (46): AdminFriendRefSchema, AdminGridStatsSchema, AdminGroup, AdminGroupMember, AdminGroupMemberSchema, AdminGroupSchema, AdminTargetSummarySchema, AdminUserGroupSchema (+38 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): AzairScraper, main(), datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (12): Flight, flights_to_json(), Represents a flight deal., Convert list of flights to JSON string., Save flights to a JSON file., Set scraped_at timestamp if not provided., Check if both legs are direct flights., Unique key for this route (for grouping). (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (6): DatabaseConnection, Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Close the database connection., Check if connected to MongoDB., MongoClient

### Community 29 - "Community 29"
Cohesion: 0.17
Nodes (27): calendarSweep(), DateParam, GET(), QuerySchema, getDestination(), fitsAnyWindow(), bestOpenJawInto(), bestTwinInto() (+19 more)

### Community 30 - "Community 30"
Cohesion: 0.26
Nodes (11): destination_codes(), expand_routes(), origin_codes(), Scrape target pool — origins, destinations, and tier assignments.  Pool-based sc, Assert GROUND_PAIRS invariants: destination codes only (never origins),     no s, Yield (origin, destination, tier) for every valid route in the pool.      Skips, Quick stats for logging., summary() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (32): getBaselines, ALL_ORIGIN_CODES, buildTripFilter(), clipRuns(), curateBars(), curateGroupTrips(), DateRun, flightsCollection() (+24 more)

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (13): get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses, User, Find cheapest matching flights (deal scoring moved to frontend)., Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., Get a summary of a user's matches.          Returns:             Dict with co (+5 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (16): matchesSelection(), CityCard(), CityCardProps, CityCardSkeleton(), COUNTRY_NAMES, countryName(), ExploreControlsProps, KIND_LABEL (+8 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (34): FriendsPage(), Mode, GroupDetailPage(), Mode, InviteCard(), addGroupMember(), CitiesParams, deleteGroup() (+26 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (13): AdminUsersPage(), signupLabel(), SortDir, SortKey, UsersTable(), UsersTableProps, UsersTableSkeleton(), Tiles (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (14): DestinationsStep(), POPULAR, FavouritesCard(), BY_CODE, Destination, DESTINATIONS, REGIONS, getSavedCities() (+6 more)

### Community 37 - "Community 37"
Cohesion: 0.10
Nodes (16): signupLabel(), UserDetailSheet(), WEEKDAYS, windowLabel(), CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName() (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (8): ScrapeTarget model — one document per (origin, destination) route in the pool., ScrapeTargetModel, datetime, ScrapeTargetRepository — manages the route pool.  Core operations:   bulk_upsert, Atomically claim the next-due enabled target.          Marks it as 'running' by, Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples., ScrapeTargetRepository

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): API (`api/`), Architecture, Components, Data Flow, Database (`database/`), Dependencies, Frontend (`frontend/`), Pipeline (`run_pipeline.py`) (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): Architectural Decisions, Architecture, Current Status, graphify, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (25): BestPerMonth(), BestPerMonthProps, buildSlots(), MONTHS_SHORT, MonthSlot, nightsBetween(), nightsBetween(), TripRow() (+17 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (6): ScrapeRun model — one document per scraper execution of one route.  Pure observa, ScrapeRunModel, ScrapeRunRepository — append-only log of scrape executions.  One document per ro, Insert a 'running' record. Returns the inserted _id as str., Most recent runs, newest first., ScrapeRunRepository

### Community 43 - "TripRow.tsx"
Cohesion: 0.27
Nodes (10): GET(), GroupMemberRaw, GroupRaw, numOrNull(), toDateStr(), toIso(), AdminFriendRef, AdminUserGroup (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (6): CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS, Chip(), ChipProps, SIZE_CLASSES

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (7): _build_google_flights_url(), _fli_to_flight(), _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Convert minutes to '2h 30m' format., Build a Google Flights search URL., Convert a Fli round-trip result tuple into our Flight dataclass.

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (10): Cross-cutting rules (all phases), Multi-City / Open-Jaw — Full Roadmap, Phase 0 — Data foundation ✅ (reference), Phase 1 — Combo engine + API (origin-side, no UI), Phase 2 — Origin-side UI: City page + booking links, Phase 3 — Origin-side UI: Explore + Calendar, Phase 4 — Destination-side pairing data + engine extension, Phase 5 — Destination-side UI: twin-city trips (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.27
Nodes (9): GET(), DateStr, GET(), QuerySchema, monthsAhead(), parseOrigins(), TripsSession, CityDetailResponseSchema (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): deduplicate(), filter_direct_only(), normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t (+5 more)

### Community 49 - "UserMatcher"
Cohesion: 0.15
Nodes (13): AcademicCard(), Mode, PreferencesCard(), generateFreeWindows(), isoWeekday(), pad(), toStr(), getPreferences() (+5 more)

### Community 50 - "Community 50"
Cohesion: 0.31
Nodes (8): NO_PERIODS, UniCalendarContext, UniCalendarValue, TUE_2026_2027, UniPeriod, UniPeriodKind, UNIVERSITY_CALENDARS, UniversityId

### Community 51 - "academic.ts"
Cohesion: 0.14
Nodes (19): CalendarPage(), toCalTrip(), buildDensity(), GroupTripsCalendar(), GroupTripsCalendarProps, addMonths(), monthSpan(), todayStr() (+11 more)

### Community 52 - "Where It's Going"
Cohesion: 0.15
Nodes (12): Beyond, Current Capabilities, Deploy, Design Principles, Email Notifications, Multi-User, Next (near-term), Price Trends (+4 more)

### Community 53 - "Providers.tsx"
Cohesion: 0.40
Nodes (3): StretchCell, StretchOverlayProps, TIER_BAR

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (4): Any, Create FlightModel from scraper's Flight dataclass.          Args:             f, Any, Save flights from scraper to database.          Steps:           1. Convert scra

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (7): checkedAgo(), OpenJawSection(), OpenJawSectionProps, checkedAgo(), TwinCitySection(), TwinCitySectionProps, getOpenJaw()

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
Cohesion: 0.24
Nodes (8): OriginsStep(), OriginChips(), Origin, ORIGINS, buildAzairSearchUrl(), buildGoogleFlightsSearchUrl(), getOriginName(), SearchableTrip

### Community 79 - "DatabaseConnection"
Cohesion: 0.28
Nodes (6): AvailWindow, dayDiff(), nearMissWindow(), UserAvailability, isNearAvailWorthy(), windows

### Community 80 - "FreeStrip.tsx"
Cohesion: 0.32
Nodes (5): GroupsPage(), Mode, createGroup(), getGroups(), GroupsResponse

### Community 81 - "CityDetail.tsx"
Cohesion: 0.10
Nodes (17): CityDetail(), CityDetailFallback(), CityDetailProps, ORIGIN_NAME, TripRowSkeleton(), ExploreControls(), FavouritesStrip(), FavouritesStripProps (+9 more)

### Community 82 - "FareTag.tsx"
Cohesion: 0.21
Nodes (8): Status, PersonLabel(), Button(), ButtonProps, DirectoryUser, FriendEntry, FriendsResponse, GroupMemberEntry

### Community 83 - "page.tsx"
Cohesion: 0.33
Nodes (4): datetime, Update the dates of an availability window., Create a new availability window.          Args:             user_id: User's, Create multiple availability windows at once.          Args:             user

### Community 84 - "route.ts"
Cohesion: 0.52
Nodes (6): citiesForOrigins(), GET(), withOpenJaw(), loadUserAvailability(), toDateStr(), CitiesResponseSchema

### Community 85 - "User"
Cohesion: 0.29
Nodes (10): StayStretch, addDays(), enumerateStretchCandidates(), ExactFare, nightsOf(), pad2(), priceStretchCandidates(), StretchCandidate (+2 more)

### Community 86 - "parseOrigins"
Cohesion: 0.38
Nodes (5): getGroundLinks(), GROUND_PAIRS, GroundLink, GroundPair, LINKS

### Community 87 - "layout.tsx"
Cohesion: 0.40
Nodes (3): datetime, Check if a date falls within this availability window., Check if this availability overlaps with a given date range.

### Community 88 - "trips.ts"
Cohesion: 0.19
Nodes (12): asNumberOrNull(), fetchBaselines(), RouteBaseline, clamp(), GROUND_COMPETITIVE_CODES, isGroundCompetitive(), scoreTrip(), TripScore (+4 more)

### Community 89 - "TODO"
Cohesion: 0.33
Nodes (5): Done (for reference), Long Term — Auth, Notifications & Reach, Medium Term — Pool-based scraping (in progress), Short Term — Auth, UI & Test Deployment, TODO

### Community 92 - "route.ts"
Cohesion: 0.50
Nodes (4): DateParam, GET(), QuerySchema, ExtensionsResponseSchema

### Community 93 - ".find_deals"
Cohesion: 0.50
Nodes (3): filter_by_price(), Filter flights by maximum price., Find deals under a certain price.          Convenience method that searches an

### Community 96 - "lanes.ts"
Cohesion: 0.11
Nodes (29): AgendaMonthProps, addDays(), clampDayInMonth(), dayStr(), isWeekend(), MONTHS_LONG, MonthSpec, pad() (+21 more)

### Community 97 - "setup_logging"
Cohesion: 0.67
Nodes (3): Logger, Configure logging for the scraper., setup_logging()

### Community 99 - "ApiError"
Cohesion: 0.12
Nodes (15): LiveBoard(), RunFeed(), Status, STATUS_STYLE, SortDir, SortKey, TargetsTable(), TargetsTableProps (+7 more)

### Community 103 - "useStayExtensions.ts"
Cohesion: 0.22
Nodes (12): cache, containingWindow(), EMPTY_STRETCHES, pickOpenJawExtensions(), pickStretches(), plusDays(), StretchSet, toStretch() (+4 more)

## Knowledge Gaps
- **320 isolated node(s):** `install.sh script`, `GroupRaw`, `PutBodySchema`, `PatchBodySchema`, `PostBodySchema` (+315 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 2` to `Community 5`, `Community 7`, `Community 8`, `Community 15`, `Community 24`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `DestinationRepository` connect `Community 2` to `Community 5`, `Community 7`, `Community 8`, `Community 16`, `UserAirports`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `getDb()` connect `Community 0` to `TripRow.tsx`, `route.ts`, `trips.ts`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `install.sh script`, `GroupRaw`, `PutBodySchema` to the rest of the system?**
  _320 weakly-connected nodes found - possible documentation gaps or missing edges._