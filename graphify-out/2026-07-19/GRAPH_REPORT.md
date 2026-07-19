# Graph Report - somewhere  (2026-07-19)

## Corpus Check
- 224 files · ~123,974 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1751 nodes · 3666 edges · 97 communities (89 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8f4f9904`
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
- User
- parseOrigins
- .deactivate
- trips.ts
- TODO
- YearPaint
- AdminTabs.tsx
- .create
- UserAirports
- lanes.ts
- setup_logging
- ApiError
- route.ts
- useStayExtensions.ts

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 67 edges
2. `UserRepository` - 43 edges
3. `getDestination()` - 34 edges
4. `DestinationRepository` - 33 edges
5. `request()` - 33 edges
6. `FlightModel` - 31 edges
7. `AvailabilityRepository` - 29 edges
8. `get_collection()` - 28 edges
9. `Flight` - 28 edges
10. `Trip` - 26 edges

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

## Communities (97 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.20
Nodes (18): POST(), POST(), DELETE(), DELETE(), GET(), PATCH(), PatchBodySchema, GET() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (18): GroupTripsCalendarProps, ALL_ORIGIN_CODES, AvailWindow, clipRuns(), curateBars(), DateRun, GROUND_COMPETITIVE_NOR, GroupTripsData (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (33): get_current_user_id(), Shared dependencies for the API.  Multi-user mode: identity is established via, FastAPI dependency: reads user ID from the X-User-ID request header.     Return, get_deals(), GET /api/deals — return flights matching the default user's preferences.  Uses, DateWindow, get_preferences(), BaseModel (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (25): Create RouteStats from MongoDB document., Convert to dictionary for API responses., Aggregated statistics for a route.      MongoDB document structure:     {, Get the average for the current month., Get the average for a specific month., Check if a price is below the route average., Calculate how much below average a price is (negative = below)., Convert to dictionary for MongoDB storage. (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (24): addDays(), BadgeState, buildMonths(), buildRoles(), daysInMonth(), DragMode, DragState, Edge (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (33): Flight Scraper API — FastAPI application entry point.  Multi-user, no password, start_background_scheduler(), clear_all_data(), get_schedule(), list_users(), GET    /api/admin/users    — list all users GET    /api/admin/schedule — schedu, Returns the latest scheduler state per origin.     Written to MongoDB by the sc, Delete all scraped flight data. User accounts and preferences are untouched. (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (42): bcryptjs, eslint, eslint-config-next, dependencies, bcryptjs, mongodb, next, next-auth (+34 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (22): get_connection_string(), MongoDB configuration settings.  Uses environment variables with sensible defa, Build MongoDB connection string., close_connection(), get_collection(), MongoDB connection manager.  Singleton pattern to ensure a single database con, Get a collection by name., Close the database connection. (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (34): DestinationPreference, Destination preference model - user's preferred travel destinations., User's destination preference.      MongoDB document structure:     {, Return human-readable priority label., Convert to dictionary for MongoDB storage., Create DestinationPreference from MongoDB document., Convert to dictionary for API responses., Deactivate an availability window. (+26 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (15): Create PriceHistory from MongoDB document., PriceHistoryRepository, Get comprehensive stats for a route., Get monthly average prices for a route.          Returns:             Dict of, Repository for PriceHistory operations., Get daily price trend for a route.          Returns:             List of {"da, Record a price snapshot.          Args:             flight_key: Unique flight, Detect if there's been a significant price drop.          Returns: (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (8): main(), Flight Scraper Pipeline - Phase 3 Integration  This script connects the scrape, Run the scraper and save results to database.      Args:         full_scan: I, run_pipeline(), DateRange, Represents a date range for availability., Full search across multiple origins, destinations, and date ranges.          Sam, Phase 1: Use SearchDates to find cheapest dates per route.          Returns list

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (20): Availability, datetime, Availability model - user's available date ranges for travel., User's availability window for travel.      MongoDB document structure:     {, Return the number of days in this availability window., Check if a date falls within this availability window., Check if this availability overlaps with a given date range., Convert to dictionary for MongoDB storage. (+12 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (13): Create FlightModel from MongoDB document., FlightRepository, Find a flight by its unique key., Find flights by route., Find flights from an origin., Find flights to a destination., Find flights within a date range.          Args:             start_date: Earlies, Find flights under a certain price. (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (36): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+28 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (10): FavouritesStrip(), FavouritesStripProps, DestinationsStep(), POPULAR, FavouritesCard(), BY_CODE, Destination, DESTINATIONS (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (13): Create User from MongoDB document., User, Update an existing user.          Args:             user: User object with up, Update a user's password., Find an existing user by email or create a new one (no password required)., Authenticate a user by email and password.          Args:             email:, Hash a password using bcrypt., Verify a password against its hash. (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.23
Nodes (10): nightsBetween(), TripRow(), Spark(), SparkPoint, SparkProps, buildAzairSearchUrl(), buildGoogleFlightsSearchUrl(), getOriginName() (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (30): CityLink(), LegLink(), OpenJawRow(), GroupTripRow(), DaySheet(), StretchCell, StretchOverlayProps, TIER_BAR (+22 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (10): FliAirport, FliScraper, Google Flights scraper using the fli library.      Same interface as AzairScrape, Pool-mode scrape of a single (origin, destination) route.          Phase 1: two, Call SearchDates with error handling. Returns list of {out_date, ret_date, price, One-way SearchDates grid. Returns {date_str: cheapest one-way price}., Phase 2: Get full flight details for each cheap date combo., Call SearchFlights with error handling. Returns list of Flight dataclass objects (+2 more)

### Community 19 - "Community 19"
Cohesion: 0.05
Nodes (45): ScrapeTargetModel, Insert a 'running' record. Returns the inserted _id as str., Most recent runs, newest first., ScrapeRunRepository, datetime, Atomically claim the next-due enabled target.          Marks it as 'running' by, Finalize a target after a scrape attempt.          Computes next_due_at from tie, Seed `scrape_targets` from a list of (origin, destination, tier) tuples. (+37 more)

### Community 20 - "Community 20"
Cohesion: 0.26
Nodes (10): GET(), DateStr, GET(), QuerySchema, monthsAhead(), parseOrigins(), todayStr(), TripsSession (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.10
Nodes (12): OnewayFareModel, One-way fare grid for a directed leg.      MongoDB document structure:     {, Unique identifier for this directed leg., Convert to dictionary for MongoDB storage., Create OnewayFareModel from MongoDB document., OnewayFareRepository, Wholesale-replace each leg's fare grid.          Returns:             {"new": X,, Get the fare grid for one directed leg. (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.08
Nodes (20): bricolage, instrument, splineMono, metadata, viewport, LINKS, Navigation(), NavigationProps (+12 more)

### Community 23 - "Community 23"
Cohesion: 0.06
Nodes (38): Database, DatabaseConnection, get_database(), Singleton MongoDB connection manager.      Usage:         db = DatabaseConnec, Get the MongoDB client, creating it if necessary., Get the database instance., Close the database connection., Check if connected to MongoDB. (+30 more)

### Community 24 - "Community 24"
Cohesion: 0.06
Nodes (19): PriceHistory, Price history model - historical price snapshots for flights., Price snapshot for a flight.      MongoDB document structure:     {, Convert to dictionary for MongoDB storage., Create PriceHistory from flight data., Route statistics model - aggregated price data for routes., ScrapeTarget model — one document per (origin, destination) route in the pool., User model with embedded airports and notification preferences. (+11 more)

### Community 25 - "Community 25"
Cohesion: 0.04
Nodes (46): AdminFriendRefSchema, AdminGridStatsSchema, AdminGroupMember, AdminGroupMemberSchema, AdminGroupSchema, AdminTargetSummarySchema, AdminUserGroupSchema, AdminUserPrefs (+38 more)

### Community 26 - "Community 26"
Cohesion: 0.15
Nodes (12): AzairScraper, main(), datetime, Azair Flight Scraper - Phase 1 Complete  Features: - Multi-origin support (se, Build Azair search URL., Fetch URL with retry logic., Search a single route., Search multiple destinations from one origin. (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.12
Nodes (12): Flight, flights_to_json(), Represents a flight deal., Convert list of flights to JSON string., Save flights to a JSON file., Set scraped_at timestamp if not provided., Check if both legs are direct flights., Unique key for this route (for grouping). (+4 more)

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (10): calendarSweep(), DateParam, GET(), QuerySchema, CalendarOpenJawOptions, OpenJawOptions, loadUserAvailability(), toDateStr() (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.16
Nodes (25): getGroundLinks(), GROUND_PAIRS, GroundLink, GroundPair, LINKS, bestOpenJawInto(), bestTwinInto(), combineGrids() (+17 more)

### Community 30 - "Community 30"
Cohesion: 0.27
Nodes (9): OpenJawRowProps, checkedAgo(), OpenJawSection(), OpenJawSectionProps, checkedAgo(), TwinCitySection(), TwinCitySectionProps, getOpenJaw() (+1 more)

### Community 31 - "Community 31"
Cohesion: 0.13
Nodes (7): FlightModel, Unique identifier for this itinerary date-pair (price NOT included)., Key for route statistics., Check if both legs are direct flights., Convert to dictionary for MongoDB storage., Convert to dictionary for API responses., Flight model for database storage.      MongoDB document structure:     {

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (4): Find cheapest matching flights (deal scoring moved to frontend)., Get a summary of a user's matches.          Returns:             Dict with co, Get match summaries for all active users., Find flights matching a user's availability and preferences.          Args:

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (25): ExplorePage(), matchesSelection(), CityCard(), CityCardProps, CityCardSkeleton(), COUNTRY_NAMES, countryName(), ExploreControls() (+17 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (37): FriendsPage(), Mode, GroupDetailPage(), Mode, CityDetail(), ORIGIN_NAME, InviteCard(), addGroupMember() (+29 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (13): AdminUsersPage(), signupLabel(), SortDir, SortKey, UsersTable(), UsersTableProps, UsersTableSkeleton(), Tiles (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.29
Nodes (7): login(), LoginRequest, me(), BaseModel, POST /api/auth/login  — sign in or register (no password) GET  /api/auth/me, Find or create a user by email. Returns user_id, name, email.     No password r, Validate a stored user ID. Returns user info or 401.     Called on app load to

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (15): POST(), GET(), PUT(), PutBodySchema, GET(), POST(), DEFAULTS, GET() (+7 more)

### Community 38 - "Community 38"
Cohesion: 0.57
Nodes (6): citiesForOrigins(), GET(), withOpenJaw(), getCitiesData(), CitiesResponseSchema, parseFlightDoc()

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (12): API (`api/`), Architecture, Components, Data Flow, Database (`database/`), Dependencies, Frontend (`frontend/`), Pipeline (`run_pipeline.py`) (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.22
Nodes (8): Architectural Decisions, Architecture, Current Status, graphify, How to Run, Key Config, Key Files, Somewhere (flight scraper) — AI Context

### Community 41 - "Community 41"
Cohesion: 0.09
Nodes (19): LandingPage(), BoardSkeleton(), DepartureBoardProps, DepartureRow, FlapText(), FlapTextProps, SIZE_CLASSES, OnboardingWizard() (+11 more)

### Community 42 - "Community 42"
Cohesion: 0.24
Nodes (11): AgendaMonth(), AgendaMonthProps, NO_PERIODS, UniCalendarContext, UniCalendarValue, periodsInRange(), TUE_2026_2027, UniPeriod (+3 more)

### Community 43 - "TripRow.tsx"
Cohesion: 0.27
Nodes (10): GET(), GroupMemberRaw, GroupRaw, numOrNull(), toDateStr(), toIso(), AdminFriendRef, AdminUserGroup (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.11
Nodes (14): signupLabel(), UserDetailSheet(), WEEKDAYS, windowLabel(), CityHeader(), CityHeaderProps, COUNTRY_NAMES, countryName() (+6 more)

### Community 45 - "Community 45"
Cohesion: 0.28
Nodes (7): _build_google_flights_url(), _fli_to_flight(), _minutes_to_hm(), Fli-based flight scraper — queries Google Flights via the fli library.  Two-phas, Convert minutes to '2h 30m' format., Build a Google Flights search URL., Convert a Fli round-trip result tuple into our Flight dataclass.

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (10): Cross-cutting rules (all phases), Multi-City / Open-Jaw — Full Roadmap, Phase 0 — Data foundation ✅ (reference), Phase 1 — Combo engine + API (origin-side, no UI), Phase 2 — Origin-side UI: City page + booking links, Phase 3 — Origin-side UI: Explore + Calendar, Phase 4 — Destination-side pairing data + engine extension, Phase 5 — Destination-side UI: twin-city trips (+2 more)

### Community 47 - "Community 47"
Cohesion: 0.23
Nodes (11): DELETE(), PATCH(), PatchBodySchema, POST(), PostBodySchema, GET(), { handlers, auth, signIn, signOut }, FriendshipDoc (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (13): deduplicate(), filter_direct_only(), normalize_date(), parse_results(), parse_single_result(), Parse Azair search results HTML., Parse Azair search results HTML and extract flight deals.      Args:, Normalise Azair's raw date string to YYYY-MM-DD.      Azair returns dates in t (+5 more)

### Community 49 - "UserMatcher"
Cohesion: 0.14
Nodes (14): AcademicCard(), Mode, PreferencesCard(), generateFreeWindows(), isoWeekday(), pad(), toStr(), getPreferences() (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.33
Nodes (5): User, Find users who might be interested in a specific flight.          Useful for s, Find users who should be notified about a flight.          Args:, Derive the appropriate min/max trip duration for an availability window., _window_trip_range()

### Community 51 - "academic.ts"
Cohesion: 0.13
Nodes (16): CalendarPage(), toCalTrip(), buildDensity(), GroupTripsCalendar(), CalendarFiltersProps, CalendarFilterState, EMPTY_FILTERS, monthSpan() (+8 more)

### Community 52 - "Where It's Going"
Cohesion: 0.15
Nodes (12): Beyond, Current Capabilities, Deploy, Design Principles, Email Notifications, Multi-User, Next (near-term), Price Trends (+4 more)

### Community 53 - "Providers.tsx"
Cohesion: 0.60
Nodes (5): GET(), PUT(), PutBodySchema, sanitize(), SavedCitiesResponseSchema

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
Cohesion: 0.21
Nodes (12): POST(), PostBodySchema, POST(), PostBodySchema, GET(), POST(), getAcceptedFriendIds(), GroupCapReachedError (+4 more)

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

### Community 78 - "searchUrl.ts"
Cohesion: 0.50
Nodes (3): filter_by_price(), Filter flights by maximum price., Find deals under a certain price.          Convenience method that searches an

### Community 79 - "DatabaseConnection"
Cohesion: 0.32
Nodes (5): GroupsPage(), Mode, createGroup(), getGroups(), GroupsResponse

### Community 80 - ".create"
Cohesion: 0.33
Nodes (9): GET(), loadGridStats(), num(), numOrNull(), toIso(), toMs(), AdminGridStats, AdminPoolSummarySchema (+1 more)

### Community 81 - "CityDetail.tsx"
Cohesion: 0.13
Nodes (8): CityDetailFallback(), CityDetailProps, TripRowSkeleton(), BOX, ICON, StarButton(), StarButtonProps, CityDetailResponse

### Community 82 - "FareTag.tsx"
Cohesion: 0.12
Nodes (10): GoogleButton(), Status, PersonLabel(), Button(), ButtonProps, InputProps, DirectoryUser, FriendEntry (+2 more)

### Community 85 - "User"
Cohesion: 0.29
Nodes (10): StayStretch, addDays(), enumerateStretchCandidates(), ExactFare, nightsOf(), pad2(), priceStretchCandidates(), StretchCandidate (+2 more)

### Community 86 - "parseOrigins"
Cohesion: 0.23
Nodes (11): BestPerMonth(), BestPerMonthProps, buildSlots(), MONTHS_SHORT, MonthSlot, nightsBetween(), TripRowProps, WeekGroup (+3 more)

### Community 87 - ".deactivate"
Cohesion: 0.50
Nodes (7): GET(), num(), numOrNull(), toDate(), toIso(), VALID_STATUS, AdminRunsResponseSchema

### Community 88 - "trips.ts"
Cohesion: 0.16
Nodes (14): asNumberOrNull(), fetchBaselines(), RouteBaseline, clamp(), GROUND_COMPETITIVE_CODES, isGroundCompetitive(), scoreTrip(), TripScore (+6 more)

### Community 89 - "TODO"
Cohesion: 0.33
Nodes (5): Done (for reference), Long Term — Auth, Notifications & Reach, Medium Term — Pool-based scraping (in progress), Short Term — Auth, UI & Test Deployment, TODO

### Community 90 - "YearPaint"
Cohesion: 0.70
Nodes (4): GET(), filterExistingMemberIds(), memberOriginsUnion(), GroupTripsResponseSchema

### Community 93 - ".create"
Cohesion: 0.23
Nodes (15): DateParam, GET(), QuerySchema, getBaselines, curateGroupTrips(), flightsCollection(), getCityData(), getGroupTripsData() (+7 more)

### Community 94 - "UserAirports"
Cohesion: 0.21
Nodes (15): prettyDay(), addDays(), addMonths(), clampDayInMonth(), MONTHS_LONG, pad(), spansMonth(), toDateStr() (+7 more)

### Community 96 - "lanes.ts"
Cohesion: 0.17
Nodes (17): dayStr(), isWeekend(), MonthSpec, weekdayLetter(), DensityStrip(), DensityStripProps, FreeStripProps, MonthBlock() (+9 more)

### Community 97 - "setup_logging"
Cohesion: 0.67
Nodes (3): Logger, Configure logging for the scraper., setup_logging()

### Community 99 - "ApiError"
Cohesion: 0.08
Nodes (26): AdminPage(), DangerZone(), Phase, LiveBoard(), agoLabel(), GridStatsCard(), PoolTiles(), PoolTilesProps (+18 more)

### Community 101 - "route.ts"
Cohesion: 0.83
Nodes (3): POST(), WipeBodySchema, WipeResponseSchema

### Community 103 - "useStayExtensions.ts"
Cohesion: 0.22
Nodes (12): cache, containingWindow(), EMPTY_STRETCHES, pickOpenJawExtensions(), pickStretches(), plusDays(), StretchSet, toStretch() (+4 more)

## Knowledge Gaps
- **312 isolated node(s):** `install.sh script`, `GroupRaw`, `PutBodySchema`, `PatchBodySchema`, `PostBodySchema` (+307 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserRepository` connect `Community 2` to `Community 36`, `Community 5`, `Community 7`, `Community 8`, `Community 15`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `DestinationRepository` connect `Community 2` to `Community 8`, `Community 5`, `Community 7`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `AzairScraper` connect `Community 26` to `Community 2`, `Community 5`, `Community 10`, `searchUrl.ts`, `Community 27`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `UserRepository` (e.g. with `LoginRequest` and `DateWindow`) actually correct?**
  _`UserRepository` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `ObjectId` (e.g. with `.__post_init__()` and `.__post_init__()`) actually correct?**
  _`ObjectId` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DestinationRepository` (e.g. with `DateWindow` and `UserPreferences`) actually correct?**
  _`DestinationRepository` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `install.sh script`, `GroupRaw`, `PutBodySchema` to the rest of the system?**
  _312 weakly-connected nodes found - possible documentation gaps or missing edges._