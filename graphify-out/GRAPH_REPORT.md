# Graph Report - somewhere  (2026-07-18)

## Corpus Check
- 223 files · ~122,516 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1741 nodes · 3522 edges · 100 communities (91 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 69 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41c4a271`
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
- get_collection
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
- searchUrl.ts
- DatabaseConnection
- .create
- CityDetail.tsx
- FareTag.tsx
- .contains_date
- admin.py
- User
- parseOrigins
- .deactivate
- trips.ts
- TODO
- YearPaint
- AdminTabs.tsx
- availability.py
- .create
- UserAirports
- Providers.tsx
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

## Communities (100 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (82): GET(), loadGridStats(), num(), numOrNull(), toIso(), toMs(), GET(), num() (+74 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (32): DateParam, GET(), QuerySchema, ALL_ORIGIN_CODES, AvailWindow, buildTripFilter(), clipRuns(), curateBars() (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (35): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (16): BadgeState, buildMonths(), daysInMonth(), DragMode, DragState, Edge, firstWeekdayMonFirst(), fmtHour() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (27): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), Schedule state repository.  One document per origin airport, upserted on each, Insert or update schedule state for an origin., Return state for all origins, sorted by origin code., Return state for a single origin., Remove all schedule state (e.g. after changing the origin list)., ScheduleRepository (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (42): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+34 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (21): get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses, get_connection_string(), MongoDB configuration settings.  Uses environment variables with sensible defa, Build MongoDB connection string., close_connection(), MongoDB connection manager.  Singleton pattern to ensure a single database con, Close the database connection. (+13 more)

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
Nodes (36): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+28 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (13): DestinationPreference, User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Create DestinationPreference from MongoDB document., Convert to dictionary for API responses., Find a specific destination preference for a user., Find high priority (priority=1) destinations for a user. (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (15): Create User from MongoDB document., User's search preferences., UserSearchPreferences, User, Update an existing user.          Args:             user: User object with up, Update a user's password., Find an existing user by email or create a new one (no password required)., Authenticate a user by email and password.          Args:             email: (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (7): GoogleButton(), PersonLabel(), Button(), ButtonProps, InputProps, FriendEntry, GroupMemberEntry

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (12): CalendarPage(), toCalTrip(), MonthBlockProps, StretchContext, StretchSelection, StretchCell, StretchOverlayProps, TIER_BAR (+4 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (10): FliAirport, FliScraper, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: two, Call SearchDates with error handling. Returns list of {out_date, ret_date, price, One-way SearchDates grid. Returns {date_str: cheapest one-way price}., Phase 2: Get full flight details for each cheap date combo., Call SearchFlights with error handling. Returns list of Flight dataclass objects (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (45): ScrapeTargetModel, Insert a 'running' record. Returns the inserted _id as str., Most recent runs, newest first., ScrapeRunRepository, datetime, Atomically claim the next-due enabled target.          Marks it as 'running' by, Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples. (+37 more)

### Community 20 - "Community 20"
Cohesion: 0.28
Nodes (13): BestPerMonth(), buildSlots(), MONTHS_SHORT, nightsBetween(), nightsBetween(), TripRow(), StretchLink(), formatDelta() (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (12): OnewayFareModel, One-way fare grid for a directed leg.      MongoDB document structure:     {, Unique identifier for this directed leg., Convert to dictionary for MongoDB storage., Create OnewayFareModel from MongoDB document., OnewayFareRepository, Wholesale-replace each leg's fare grid.          Returns:             {"new": X,, Get the fare grid for one directed leg. (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (5): LINKS, Navigation(), NavigationProps, NavLink, ShieldIcon()

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (32): Database, get_database(), Get the database instance., Get the database instance., drop_all_indexes(), list_all_indexes(), MongoDB index setup script (v2).  Run this once to create all necessary indexes, Create the v2 index set for the flights collection and drop everything     else (+24 more)

### Community 24 - "Community 24"
Cohesion: 0.07
Nodes (17): Availability model - user's available date ranges for travel., Destination preference model - user's preferred travel destinations., Route statistics model - aggregated price data for routes., ScrapeRun model — one document per scraper execution of one route.  Pure observa, ScrapeRunModel, ScrapeTarget model — one document per (origin, destination) route in the pool., User model with embedded airports and notification preferences., Return all airports (home + nearby) for searching. (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (52): AdminFriendRefSchema, AdminGridStatsSchema, AdminGroupMember, AdminGroupMemberSchema, AdminGroupSchema, AdminTargetSummarySchema, AdminUserGroupSchema, AdminUserPrefs (+44 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): AzairScraper, main(), datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (15): filter_by_price(), Flight, flights_to_json(), Represents a flight deal., Filter flights by maximum price., Convert list of flights to JSON string., Save flights to a JSON file., Set scraped_at timestamp if not provided. (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.23
Nodes (8): AdminPage(), agoLabel(), GridStatsCard(), PoolTiles(), PoolTilesProps, PoolTilesSkeleton(), adminPool(), AdminPoolSummary

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (33): calendarSweep(), DateParam, GET(), QuerySchema, CityLink(), BY_CODE, getDestination(), bestOpenJawInto() (+25 more)

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (7): checkedAgo(), OpenJawSection(), OpenJawSectionProps, checkedAgo(), TwinCitySection(), TwinCitySectionProps, getOpenJaw()

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (7): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     {

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (4): Find cheapest matching flights (deal scoring moved to frontend)., Get a summary of a user's matches.          Returns:             Dict with co, Get match summaries for all active users., Find flights matching a user's availability and preferences.          Args:

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (10): LandingPage(), BoardSkeleton(), DepartureBoardProps, DepartureRow, OnboardingWizard(), STEP_LABELS, DealTier, getCities() (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.10
Nodes (32): GroupDetailPage(), Mode, GroupsPage(), Mode, JoinPage(), InviteCard(), addGroupMember(), CitiesParams (+24 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (13): AdminUsersPage(), signupLabel(), SortDir, SortKey, UsersTable(), UsersTableProps, UsersTableSkeleton(), Tiles (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.21
Nodes (12): FavouritesStrip(), FavouritesStripProps, DestinationsStep(), POPULAR, FavouritesCard(), Destination, DESTINATIONS, EMPTY (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (11): CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName(), LegLink(), OpenJawRow(), OpenJawRowProps, formatDateShort() (+3 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (16): ExplorePage(), matchesSelection(), CityCard(), CityCardProps, CityCardSkeleton(), COUNTRY_NAMES, countryName(), KIND_LABEL (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): API (`api/`), Architecture, Components, Data Flow, Database (`database/`), Dependencies, Frontend (`frontend/`), Pipeline (`run_pipeline.py`) (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): Architectural Decisions, Architecture, Current Status, graphify, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (16): FlapText(), FlapTextProps, SIZE_CLASSES, GroupTripRow(), CheckInStep(), PITCH_ROWS, Badge(), BadgeProps (+8 more)

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (8): NO_PERIODS, UniCalendarContext, UniCalendarValue, TUE_2026_2027, UniPeriod, UniPeriodKind, UNIVERSITY_CALENDARS, UniversityId

### Community 43 - "TripRow.tsx"
Cohesion: 0.20
Nodes (11): GET(), GroupMemberRaw, GroupRaw, numOrNull(), toDateStr(), toIso(), AdminFriendRef, AdminGroup (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.28
Nodes (4): signupLabel(), UserDetailSheet(), WEEKDAYS, windowLabel()

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (7): _build_google_flights_url(), _fli_to_flight(), _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Convert minutes to '2h 30m' format., Build a Google Flights search URL., Convert a Fli round-trip result tuple into our Flight dataclass.

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (10): Cross-cutting rules (all phases), Multi-City / Open-Jaw — Full Roadmap, Phase 0 — Data foundation ✅ (reference), Phase 1 — Combo engine + API (origin-side, no UI), Phase 2 — Origin-side UI: City page + booking links, Phase 3 — Origin-side UI: Explore + Calendar, Phase 4 — Destination-side pairing data + engine extension, Phase 5 — Destination-side UI: twin-city trips (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.38
Nodes (5): getGroundLinks(), GROUND_PAIRS, GroundLink, GroundPair, LINKS

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): deduplicate(), filter_direct_only(), normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t (+5 more)

### Community 49 - "UserMatcher"
Cohesion: 0.11
Nodes (18): OriginsStep(), AcademicCard(), OriginChips(), Mode, PreferencesCard(), Chip(), ChipProps, SIZE_CLASSES (+10 more)

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): User, Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., _window_trip_range()

### Community 51 - "academic.ts"
Cohesion: 0.19
Nodes (7): CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS, clamp(), scoreTrip(), TripScore, DealTier

### Community 52 - "Where It's Going"
Cohesion: 0.15
Nodes (12): Beyond, Current Capabilities, Deploy, Design Principles, Email Notifications, Multi-User, Next (near-term), Price Trends (+4 more)

### Community 53 - "Providers.tsx"
Cohesion: 0.18
Nodes (6): PriceHistory, Price history model - historical price snapshots for flights., Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from flight data., Price history repository with aggregation queries.

### Community 54 - "Community 54"
Cohesion: 0.33
Nodes (4): Any, Create FlightModel from scraper's Flight dataclass.          Args:             f, Any, Save flights from scraper to database.          Steps:           1. Convert scra

### Community 55 - "Community 55"
Cohesion: 0.33
Nodes (3): Upsert a single flight. Returns {"new": 0|1, "updated": 0|1}., Alias for bulk_upsert. Returns {"new": X, "updated": Y}., Upsert many flights in a single bulk_write call.          v2 semantics:

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

### Community 62 - "get_collection"
Cohesion: 0.17
Nodes (8): clear_all_data(), get_schedule(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Delete all scraped flight data. User accounts and preferences are untouched., get_collection(), Get a collection by name.

### Community 74 - "Somewhere — v1 Design Contract"
Cohesion: 0.18
Nodes (10): A. Information architecture, B. Data layer (Python side — phase 0), C. Scoring (TypeScript, read-time — `frontend/lib/score.ts`), D. API contract (Next.js routes, zod-validated at boundary), E. Auth — NextAuth (Auth.js) v5, F. Visual design system, G. Calendar design (`/calendar`), H. Build phases (+2 more)

### Community 75 - "page.tsx"
Cohesion: 0.17
Nodes (5): DangerZone(), Phase, adminWipe(), ApiError, JoinInfoResponse

### Community 76 - "✅ Done"
Cohesion: 0.22
Nodes (8): Data layer v2 (commit `a46c3a0`) + Atlas migration (run 2026-06-10), ✅ Done, Frontend v1 rebuild (commit `2c5126c`, tsc clean, `next build` green — 16 routes + middleware), Known facts for next session, ⬜ Left to do, Somewhere v1 — Build Progress, Vercel, Verified locally (dev server :4173, real Atlas data)

### Community 77 - "Somewhere (flight scraper) — AI Context"
Cohesion: 0.25
Nodes (7): Architectural Decisions, Architecture, Current Status, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 78 - "searchUrl.ts"
Cohesion: 0.23
Nodes (11): ExploreControls(), ExploreControlsProps, SearchSelection, Origin, ORIGINS, buildAzairSearchUrl(), buildGoogleFlightsSearchUrl(), getOriginName() (+3 more)

### Community 79 - "DatabaseConnection"
Cohesion: 0.20
Nodes (6): DatabaseConnection, Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Close the database connection., Check if connected to MongoDB., MongoClient

### Community 80 - ".create"
Cohesion: 0.25
Nodes (5): datetime, Find active availability windows that overlap with a given date range., Update the dates of an availability window., Create a new availability window.          Args:             user_id: User's, Create multiple availability windows at once.          Args:             user

### Community 81 - "CityDetail.tsx"
Cohesion: 0.12
Nodes (10): CityDetail(), CityDetailFallback(), CityDetailProps, ORIGIN_NAME, TripRowSkeleton(), BOX, ICON, StarButton() (+2 more)

### Community 82 - "FareTag.tsx"
Cohesion: 0.22
Nodes (10): FriendsPage(), Mode, Status, getFriends(), getUsers(), removeFriend(), respondToFriendRequest(), sendFriendRequest() (+2 more)

### Community 83 - ".contains_date"
Cohesion: 0.40
Nodes (3): datetime, Check if a date falls within this availability window., Check if this availability overlaps with a given date range.

### Community 84 - "admin.py"
Cohesion: 0.26
Nodes (10): GET(), DateStr, GET(), QuerySchema, getCityData(), monthsAhead(), parseOrigins(), TripsSession (+2 more)

### Community 85 - "User"
Cohesion: 0.29
Nodes (10): StayStretch, addDays(), enumerateStretchCandidates(), ExactFare, nightsOf(), pad2(), priceStretchCandidates(), StretchCandidate (+2 more)

### Community 86 - "parseOrigins"
Cohesion: 0.18
Nodes (12): BestPerMonthProps, MonthSlot, TripRowProps, DaySheet(), DaySheetProps, Sheet(), SheetProps, getTrips() (+4 more)

### Community 88 - "trips.ts"
Cohesion: 0.25
Nodes (8): asNumberOrNull(), fetchBaselines(), getBaselines, RouteBaseline, applyAutoExtend(), buildDensity(), pad2(), FlightDoc

### Community 89 - "TODO"
Cohesion: 0.33
Nodes (5): Done (for reference), Long Term — Auth, Notifications & Reach, Medium Term — Pool-based scraping (in progress), Short Term — Auth, UI & Test Deployment, TODO

### Community 90 - "YearPaint"
Cohesion: 0.39
Nodes (9): addDays(), buildRoles(), keysBetween(), keysToWindows(), prettyDay(), todayKey(), toKey(), windowsToKeys() (+1 more)

### Community 92 - "availability.py"
Cohesion: 0.36
Nodes (5): bricolage, instrument, splineMono, metadata, viewport

### Community 93 - ".create"
Cohesion: 0.50
Nodes (7): citiesForOrigins(), GET(), withOpenJaw(), getCitiesData(), loadUserAvailability(), toDateStr(), CitiesResponseSchema

### Community 94 - "UserAirports"
Cohesion: 0.12
Nodes (24): buildDensity(), GroupTripsCalendar(), GroupTripsCalendarProps, AgendaMonth(), AgendaMonthProps, WeekGroup, addDays(), addMonths() (+16 more)

### Community 95 - "Providers.tsx"
Cohesion: 0.47
Nodes (4): Providers(), EXEMPT_PREFIXES, OnboardingGate(), UniCalendarProvider()

### Community 96 - "lanes.ts"
Cohesion: 0.40
Nodes (5): assignLanes(), Interval, LaneAssignment, LaneTrip, overlaps()

### Community 97 - "setup_logging"
Cohesion: 0.67
Nodes (3): Logger, Configure logging for the scraper., setup_logging()

### Community 99 - "ApiError"
Cohesion: 0.13
Nodes (14): LiveBoard(), RunFeed(), Status, STATUS_STYLE, SortDir, SortKey, TargetsTable(), TargetsTableProps (+6 more)

### Community 103 - "useStayExtensions.ts"
Cohesion: 0.12
Nodes (21): TIER_BADGE, TripPopover(), TripPopoverProps, cache, containingWindow(), EMPTY_STRETCHES, pickOpenJawExtensions(), pickStretches() (+13 more)

## Knowledge Gaps
- **318 isolated node(s):** `Current Status`, `Architecture`, `How to Run`, `Key Files`, `Key Config` (+313 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 2` to `Community 5`, `Community 7`, `Community 8`, `Community 15`, `get_collection`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `FlightModel` connect `Community 31` to `Community 32`, `Community 7`, `Community 12`, `Community 50`, `Community 54`, `Community 55`, `Community 24`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `RouteStats` connect `Community 3` to `Community 24`, `Community 7`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Current Status`, `Architecture`, `How to Run` to the rest of the system?**
  _318 weakly-connected nodes found - possible documentation gaps or missing edges._