# Somewhere (flight scraper) — AI Context

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
| **v1** | **"Somewhere" rebuild** — data-layer v2 (flight_key drops price, embedded price_points, p50 EWMA baseline, read-time scoring), new IA (Explore / Calendar / City / Settings / Admin), NextAuth credentials, departure-board design system | ✅ Built + verified locally (commit `2c5126c`). Spec `docs/DESIGN_V1.md`, progress `docs/V1_PROGRESS.md`. Atlas migrated via `scripts/migrate_v2.py` (2026-06-10). Frontend builds green (16 routes + middleware). **Production promoted 2026-07-14** — `master` (cb3545f) live at fly-somewhere.vercel.app, incl. Google OAuth |

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
seed              # one-time: upsert 1150 routes into scrape_targets (staggered 24h)
seed --stats      # show pool stats
pool              # continuous loop, 24h (00:00–24:00), 2-min slots
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
├── scraper/targets.py            # POOL definition — 5 ORIGINS + 230 DESTINATIONS w/ tiers
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

- **Pool scraping (2026-05-28):** decoupled scraping from users. Pool of 1150 (origin, dest) routes lives in `scrape_targets`, tier A/B/C cadenced (24h / 72h / 168h). Scheduler claims one route per 2-min slot, 24h (widened from 07-23 on 2026-07-14 — box runs always-on). Users will be matched to the pool later, but scraping does not depend on user prefs.
- **Origins (5):** EIN, AMS, BRU, CRL, MST — airports closest to Eindhoven with usable coverage. MST (Maastricht) added 2026-07-14 by user request; small airport, so most of its routes will come back empty and auto-disable. DUS / NRN commented out in `targets.py` for easy re-add.
- **Currency pinned to EUR (2026-07-14):** Google Flights picks the response currency itself (GeoIP) unless the request URL pins it — `?gl=NL&hl=en&curr=EUR` is appended to both fli endpoints in `FliScraper.__init__`. Before the pin, ~30% of stored flights were GBP/DKK/CZK/HKD/... with their raw numbers treated as EUR. A save-time guard in `flight_service.py` drops any non-EUR fare as defense in depth. Legacy non-EUR docs age out via the 14d flights TTL.
- **Destinations (230):** Europe + N.Africa + Levant + Türkiye + Atlantic. Curated in `scraper/targets.py`. Tier A=28 popular, B=84 mid, C=118 long-tail.
- **Per-route scrape recipe (2026-07-17 — any-duration one-way sweeps):** Phase 1 = 2 one-way SearchDates sweeps (O→D over 181d ≈ 3 HTTP calls after fli's internal 61-day chunking; D→O over ~189d ≈ 4 calls); every (out, ret) pair with 2–10 nights combined in memory (estimated price = sum of one-ways). Phase 2 = top 10 cheapest pairs (max 2 per departure date — `SCRAPE_MAX_PER_OUT_DATE`) via SearchFlights, real round-trip prices stored. ≈17 fli HTTP calls per route per cycle. If one-way grids come back empty, falls back to round-trip grids (durations 2/6/10) so the route doesn't count toward auto-disable. Knobs: `SCRAPE_MIN_NIGHTS` / `SCRAPE_MAX_NIGHTS` / `SCRAPE_TOP_N_CHEAP_DATES` in `database/config.py` (replaced `SCRAPE_DURATION_BUCKETS`).
- **One-way fare grids / open-jaw foundation (2026-07-17):** the Phase-1 one-way SearchDates grids (both directions, previously discarded after pair ranking) are now persisted to a new `oneway_fares` collection — **one doc per directed leg** (`leg_key` = `"EIN-BCN"`, `prices: {date: cheapest one-way €}` replaced wholesale each scrape, ~2300 docs ≈ 12MB, TTL 21d on `scraped_at`). Zero extra API calls. Pieces: `database/models/oneway_fare.py`, `database/repositories/oneway_fare_repo.py`, `FlightService.save_oneway_grids` (past-date + price-sanity filter; empty result skips the leg so the old grid survives), scraper exposes grids via `stats["oneway_grids"]`, pool scheduler saves best-effort/non-fatal (skipped on `--direct-only`). Purpose: future open-jaw/multi-city = two `find_by_leg` lookups + in-memory date join — origin-side (`EIN→BCN` × `BCN→AMS`) and destination-side (`EIN→BCN` × `MAD→EIN`) both covered since every pool route is swept both directions; combo price = sum of one-ways = real bookable price (two tickets). No UI/read path built yet. Caveat: return-direction grids start ~today+min_nights.
- **TTL cleanup:** `flights.last_seen_at` 14d (re-scraping refreshes the touch), `scrape_runs.started_at` 30d, `price_history.scraped_at` 180d, `oneway_fares.scraped_at` 21d. Past-date trips drop naturally because SearchDates only returns future dates.
- **Auto-disable:** a route is `enabled=false` after 5 consecutive empty/error runs. `seed --prune` resets orphans; `repo.reenable_all()` resurrects disabled routes.
- **Fli backend:** `scraper-fli/scraper.py`. Single instance per slot. No NordVPN rotation yet — add only if Google starts rate-limiting (DormSpot pattern).
- Azair only — Kiwi dropped (too rate-limited). Azair scraper kept as fallback backend.
- Multi-user, no password — identity via `X-User-ID` header (stored in localStorage). Login is name + email only.
- Frontend connects directly to Atlas via Next.js API routes (serverless) — no backend HTTP server needed
- **Landing / Explore split (2026-06-13):** `/` (`app/page.tsx`) is now a promo landing page — pitch headline ("Open to go anywhere, on any free day."), the live cheapest-steals `DepartureBoard`, CTA → `/explore`. `/explore` (`app/explore/page.tsx`) is the moved browsing page: board + grid. Explore sort is **cheapest-only** (no Best score / Most trips); the old region chip row + text input are replaced by one `SearchCombobox` (city / country / region typeahead, `components/explore/SearchCombobox.tsx` → `SearchSelection`); the "Only my free dates" toggle sits in the search row's trailing slot. Nav "Explore" + city back-link point at `/explore`; the wordmark points at `/`.
- **Interest cities / saved (2026-06-13):** users star destinations as focus points. Stored as `users.saved_cities: string[]` (uppercase IATA, sanitized + capped 500). Route `app/api/saved-cities/route.ts` (GET + PUT replace-all, session-gated, mirrors `/api/availability`). Shared client state via `SavedCitiesProvider` / `useSavedCities()` (`lib/saved-cities.tsx`) — one fetch per signed-in session, optimistic toggle that reconciles with the server's sanitized response, mounted inside `SessionProvider` in `components/layout/Providers.tsx`. UI: reusable `components/ui/StarButton.tsx` (filled brand star = saved) on `CityCard` (top-right cluster, only when signed in) + `CityHeader` (via an `action` slot). Explore **pins saved cities to the top** within the cheapest sort and adds a "★ Saved (n)" filter chip; Calendar adds the same chip (client-side filter on `trip.destination`; density underlay still reflects the full set). Stars render only when `signedIn`. Saved-only filter auto-clears if the last star is removed.
- **Favourites (upgrade of saved cities, 2026-07-17):** the ★ star IS now the "favourite" concept — a place the user *wants* (would take on a merely-good fare) or a "home" to fly to whenever cheap + free. **No storage change** — still `users.saved_cities` + `/api/saved-cities` + `useSavedCities()` (only header comment reworded; provider/hook/route names unchanged, no migration). Two behaviours added, both **display-time + client-side only** (server scoring stays favourite-agnostic since favourites are per-user): (1) **relaxed tier promotion** via `promoteFavouriteTier(tier, score, price)` in `lib/score.ts` (FAV_STEAL_SCORE=75 / FAV_STEAL_PRICE=50 / FAV_DEAL_SCORE=55; never demotes, never promotes over `MAX_DEAL_PRICE`) — a favourite's "deal" reads as "steal", "fair" as "deal". Applied to the FareTag on `CityCard`, to all trips on `CityDetail` (a favourite's city page promotes every bar), and to favourite bars on Calendar (`shownTrips` maps promoted `deal_tier`). **Calendar limitation:** the tier filter runs server-side (`params.tier`) *before* promotion, so a favourite only promoted-to-steal won't appear under a "steal" filter — cosmetic only; a `fav=` param on `/api/trips` is the follow-up. (2) **"Your favourites" strip** on Explore (`components/explore/FavouritesStrip.tsx`, mounted between hero board + controls) — shows each favourite's cheapest current fare regardless of tier, with promoted colouring; **fetches its OWN unfiltered `getCities({from})`** (NOT the grid's array — the grid may be narrowed to "only my free dates", but a favourite's price is worth showing regardless); favourites with no scraped fares show a muted "no fares yet" chip (name via `getDestination`). **Settings manager:** `components/settings/FavouritesCard.tsx` — reuses `SearchCombobox` (widened to accept a structural `SearchableCity[]` + optional `placeholder`, so it takes the full static `DESTINATIONS` catalog incl. cities with no fares) to add favourites via typeahead (acts only on `kind:"city"` picks) + removable pills; shares state with the stars live via `useSavedCities`. Copy renamed user-facing: "★ Saved" chip → "★ Favourites" on Explore + Calendar; StarButton a11y → "Add to favourites" / "Favourited — click to remove". Follow-up idea (not built): aggregate distinct `saved_cities` across users to bump scraper tier cadence for wanted destinations.
- **Open-jaw combo engine + API — Phase 1 of docs/MULTICITY_PLAN.md (2026-07-17):** origin-side open-jaw (out `EIN→BCN`, back `BCN→AMS`) computed read-time from the `oneway_fares` grids — no new scraping, no UI yet. Pieces: `frontend/lib/openjaw-core.ts` (pure `combineGrids` date-join, kept Mongo-free so it's unit-testable — `npx tsx --test lib/__tests__/openjaw-core.test.ts`, 9 tests), `frontend/lib/openjaw.ts` (`loadFareGrids` + `getOpenJawTrips`: per ordered origin pair combines O1→dest × dest→O2, dedupes, caps 50 cheapest), `GET /api/openjaw?dest=BCN&from=EIN,AMS&min_nights&max_nights&max_price&avail=1` (public; avail=1 = date-level `fitsAnyWindow` only — grids have no times, so edge hours + `direct_only` can never apply). Types in `types/api.ts`: `OnewayFareDoc`, `OpenJawLeg`/`OpenJawTrip` (leg-based so Phase 4 destination-side reuses it — `back.origin` is the away city). `vs_roundtrip` = best stored round-trip for the exact dates − combo total (positive = open-jaw wins; null = no round trip stored). Same-origin pairs (two singles) emitted only when they beat or fill a hole in round-trip data, flagged `same_origin: true`. Combo price = sum of one-ways = real bookable price (two tickets), stamped with the older grid `scraped_at`. Verified against live Atlas grids (EIN-BCN 55 + BCN-EIN 31 = 86 ✓); cross-origin combos appear as grid coverage densifies (~1 week of pool cycles).
- **Open-jaw UI on the City page — Phase 2 of docs/MULTICITY_PLAN.md (2026-07-17):** “Mix & match” section on `/city/[code]`, below the trips list — rendered OUTSIDE the cold-empty ternary because combos come from `oneway_fares`, which can have data even when the round-trip board is empty. Pieces: `buildGoogleFlightsOneWayUrl(origin, dest, date)` in `lib/searchUrl.ts` (text-query one-way form — an open-jaw combo gets TWO links, one per ticket), `getOpenJaw()` in `lib/client.ts`, `components/city/OpenJawRow.tsx` (each leg is its own Google Flights anchor + total + “€N under round trip” steal-green badge when `vs_roundtrip > 0` / “no round trip these dates” when null; `2 SINGLES` vs `2 TICKETS` badge from `same_origin`), `components/city/OpenJawSection.tsx` (client fetch; renders ONLY with ≥2 origins selected AND ≥1 combo — hidden silently otherwise, mirroring the stay-longer empty convention; top 5 collapsed + “Show all N”; footer states one-way fares “checked Nh ago” from the oldest `scraped_at`, naive-UTC parsed with the `+ "Z"` rule). `direct_only` can never be honored (grids carry no stops data) — when that chip is on the section shows an explanatory note instead of rows. Verified live: EIN→BCN 15 Dec €55 link opened on Google Flights at ≈€54 ✓.
- **Dev-server CSS 500s are cache corruption, not a code bug (2026-07-17):** Turbopack dev servers on this repo intermittently 500 every page with `Parsing CSS source code failed` on mojibake'd `pt-[env(safe-area-inset-top)]` utilities (from `Navigation.tsx`/`layout.tsx`). Sources are clean UTF-8 — the Tailwind scanner occasionally gets a corrupted read (likely mid-write/AV/OneDrive race, worsened by 3 concurrent dev servers) and the bad classname sticks in the Turbopack persistent cache across restarts. Fix: stop the server, delete its distDir (`.next`, `.next-alt`, `.next-alt2`), start again. Production `next build` is unaffected. Third dev-server slot exists: `npm run dev:alt2` → port 4175, distDir `.next-alt2` (+ `frontend-alt2` in `.claude/launch.json`).
- **Google OAuth / Sign in with Google (2026-07-14):** NextAuth v5 gains a `Google` provider alongside `Credentials` (`frontend/auth.ts`). No DB adapter — the `jwt` callback resolves/creates the `users` doc **by email**, so a Google sign-in and an email/password sign-in with the same address land on the **same** Mongo `_id` (and thus the same account/session everywhere). New Google-only users get `role: "user"` + `google_id`; existing email accounts get `google_id` backfilled on first Google login. Verified-email gate in the `signIn` callback. UI: shared `components/auth/GoogleButton.tsx` ("Continue with Google") on `/login` (redirects to `callbackUrl`) and `/register` (→ `/`). Env: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in `frontend/.env.local` **and** Vercel. OAuth client redirect URIs: `http://localhost:4173/api/auth/callback/google` + `https://fly-somewhere.vercel.app/api/auth/callback/google`.
- **Availability edge times (2026-07-14):** `DateWindow` gains optional `start_time` (int 5–23, "free from" on the window's first day) and `end_time` (int 1–23, "back by" on the last day); absent = all day, mid-window days are always full days. UI (Settings → `YearPaint`): drag a window's first/last day **vertically** to scrub the hour (floating badge, partial yellow hatch = partial day, tiny `17→` / `→10` cell label); single-day windows split top half = start / bottom half = return; ArrowUp/Down (+Shift for return on single days) adjusts via keyboard; horizontal drag still paints ranges, tap still toggles. Stored on `availability` docs; validated in the PUT route (single-day `end_time > start_time`). `avail=1` filtering (`lib/queries.ts` `fitsAnyWindow`) enforces edge hours against flight `outbound_departure` / `return_arrival` — unparseable hours are never filtered out.
- **Friends v1 (2026-07-15):** request + accept friendships (mutual, consent-based — availability is private), no groups yet, no trip-matching UI yet. New `friendships` collection: `{requester_id, recipient_id, pair_key, status: "pending"|"accepted", created_at, responded_at}` — **user ids as strings** (same as `session.user.id`; deliberately not the availability collection's string/ObjectId dual-key mess), `pair_key` = sorted id pair with a **unique index** (dupe/race guard; indexes in `database/setup_indexes.py` `setup_friendship_indexes`, run on Atlas 2026-07-15). Decline/cancel/unfriend **delete the doc** (re-request always possible); requesting someone who already requested you auto-accepts. Server helpers `frontend/lib/friends.ts`: `loadFriendsState(userId)` (full `{friends, incoming, outgoing}` shape returned by **every** friends route so the client replaces state wholesale, no refetch) + `getAcceptedFriendIds(userId)` — the hook for the future "friends free on this trip" matching (fan `loadUserAvailability` over it, reuse `fitsAnyWindow`). Routes: `GET /api/friends`, `POST /api/friends/requests {email}` (email trimmed+lowercased; 404 unknown / 400 self / 409 dupe), `PATCH /api/friends/requests/[id] {action}` (recipient only), `DELETE /api/friends/[id]` (unfriend or cancel outgoing; pending recipient must decline instead — 404). UI `/friends` (middleware-gated): people directory (`GET /api/users` + `PeopleCard`) → add / accept / decline / cancel / remove; page owns one `FriendsResponse`. Never project `password_hash`/`google_id` in friend/user lookups.
- **Calendar "stay longer" hover (2026-07-17):** hovering a calendar bar fetches `GET /api/trips/extensions?from&to&outbound` (public; pins origin+dest+outbound_date, returns ALL stored return-date variants as slim `TripVariant[]`, `getTripExtensionsData` in `lib/queries.ts`) and shows: dashed ghost tail after the bar (`components/tripcal/GhostExtension.tsx`, rendered by MonthBlock in the month containing return_date only — no cross-month ghost) + "STAY LONGER" rows in `TripTooltip` + interactive rows in `TripPopover` (mobile/click path, links via `getSearchUrl`). Client hook `components/tripcal/useStayExtensions.ts`: 200ms debounce, session Map cache keyed `origin|dest|outbound`, clamps suggestions to the availability window containing the trip (when signed in + "Only my free dates" on) else `return_date + 3` days, max 3 rows, later returns only. Empty variants = silent (sparse data is normal; suggestions densify as the any-duration scraper recipe accumulates — recipe caps 2 stored pairs per outbound date per cycle).
- Legacy `scheduler/scheduler.py` writes state to `schedule_state` and reads from user prefs at runtime. Still works, but pool scheduler is the production path now.
- FastAPI (`api/`) still exists and works locally but is not used by the deployed frontend
- **Trip date-range = overlap semantics (2026-07-15):** `buildTripFilter` (`frontend/lib/queries.ts`) matches trips whose `[outbound_date, return_date]` interval OVERLAPS `[start, end]` (`return_date >= start`, `outbound_date <= end`), not only trips departing inside the range — so DaySheet's `start=end=day` returns every trip spanning that day. `outbound_date` is always floored at today (already-departed trips are unbookable, never shown).
- Frontend deduplicates deals on calendar view (best per destination+outbound+return dates)
- `buildAzairSearchUrl()` in `lib/api.ts` builds ±3 day flexible search URLs
- All datetime ISO strings from backend get `+ "Z"` suffix so JS parses as UTC
- **Groups v1 (2026-07-16):** friends can form a group (embedded `members: [{user_id, role: owner|member, joined_at}]` array on a `groups` doc, capped 12 members / 20 groups-per-user) and invite anyone via a shareable multi-use link (`invite: {token, created_by, created_at}` embedded in the group doc, plain-text token, rotate = revoke). No email sending — `/join/[token]` is a public page that routes through login/register (callbackUrl round-trip) and auto-joins. Each group gets a detail page: members, a "when everyone's free" shared-windows strip, and a matched-trips board ranking upcoming trips by how many members are free (`lib/queries.ts` `getGroupTripsData`, reusing `buildTripFilter`/`fitsAnyWindow` — Explore/Calendar plumbing untouched). Members with zero availability windows count as "unknown": excluded from the free/known denominator, never block a full-group highlight. New `frontend/lib/groups.ts` mirrors the `lib/friends.ts` pattern (full-state responses on every mutation, ids as strings, orphan-row dropping). **Group calendar (2026-07-16):** the group page's trips section has a List ⇄ Calendar chip toggle — `components/groups/GroupTripsCalendar.tsx` reuses the personal calendar's `MonthBlock`/`AgendaMonth` unchanged, feeding `GroupTrip[]` as bars, `shared_windows` mapped to `DateWindow` as the steal-green underlay, client-side density from the curated set, plus an "Everyone's free only" chip; day-click is a no-op (DaySheet isn't group-aware — follow-up).
- **First-run onboarding wizard (2026-07-17):** `/welcome` — a 6-step "boarding sequence" (CHECK-IN, ORIGINS, CALENDAR, DESTINATIONS, ALERTS, DEPARTURES) shown once after signup. Hard-gated: `users.onboarding_pending: true` set only at account creation (`app/api/auth/register/route.ts` insert + Google-insert branch in `auth.ts`) so existing accounts never have the field and are structurally immune, no migration. `components/onboarding/OnboardingGate.tsx` (mounted in `Providers.tsx`) redirects any signed-in page load to `/welcome` while the session token carries `onboarding_pending`; `/welcome` itself re-checks DB truth via `GET /api/onboarding` (new route, also `POST` to clear the flag + stamp `onboarded_at`) so a stale token never traps a completed user. Every write reuses existing plumbing: `putPreferences`/`putAvailability` for origins + quick-setup busy-weekdays (extracted from `PreferencesCard`/`AcademicCard` into `components/settings/OriginChips.tsx` + `lib/useQuickSetup.ts` so Settings and onboarding share one code path), and `useSavedCities().toggle` for the destinations-star step (zero new favourites storage — same `users.saved_cities` field the Settings "Favourite destinations" UI reads). New `preferences.notify_optin` flag captures interest in deal-alert emails (Phase 5, not built yet). A session `update()` trigger (`auth.ts` `trigger === "update"`) plus a `somewhere:onboarding-done` sessionStorage flag cover the gap between completing the wizard and the JWT actually refreshing. Landing page gained a "Get started" to `/register` CTA shown only when signed out.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
