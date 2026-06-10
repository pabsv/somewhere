# Somewhere — v1 Design Contract

Single source of truth for the v1 build. All builder agents follow this exactly.
Wordmark: **Somewhere** ("Fly somewhere. Cheap.")

## Product thesis

Audience does NOT know when/where they want to go. The app answers "where could I
go cheap?" (Explore city grid) and "when could I go?" (Calendar) with **zero
configuration**. Preferences narrow results, never gate them. Every price ships
with an anchor: "% below typical for this route".

## A. Information architecture

| Route | Name | Auth | Purpose |
|---|---|---|---|
| `/` | Explore | public | Hero standout + city grid, search, region filter, sort |
| `/calendar` | Calendar | public | 6-month vertical-scroll gantt, lane-packed trip bars + density |
| `/city/[code]` | City detail | public | Best per month, all upcoming trips for one destination |
| `/settings` | Settings | session | Availability paint calendar, origin chips, trip length, direct-only |
| `/login` | Sign in | — | NextAuth credentials (email + name, auto-create) |
| `/admin` | Admin | admin role | Read-only pool health, run feed, wipe buttons |

**Deleted:** `/deals` page, `/api/deals`, `/api/admin/scrape` (python spawner),
`/api/admin/schedule`, `lib/storage.ts` mock layer, `X-User-ID` convention,
`data/destinations.ts` + `data/airports.ts` (replaced by generated files),
`destination_preferences` collection.

Nav: sticky top bar — wordmark left, Explore · Calendar · Settings right, session
name or "Sign in" far right. Origin selection = query-param state `?from=EIN,AMS`
(default all 4), shared across Explore/Calendar/City. When signed in AND
availability windows exist: persistent chip toggle "Only my free dates"
(**off by default**).

## B. Data layer (Python side — phase 0)

1. **flight_key drops price**: `"{origin}-{dest}-{out_date}-{ret_date}"`. One doc
   per itinerary date-pair, price updates in place.
2. **Batch dedupe before upsert** (flight_repo): group scraped batch by new
   flight_key keeping LOWEST price (fli returns duplicate itineraries).
3. **price_points embedded array** on flight doc: `[{p: number, at: ISO}]`,
   `$push` ONLY when price differs from current stored price, `$slice: -20`.
   Implementation: aggregation-pipeline update (`$concatArrays` + conditional) —
   do NOT mix pipeline and classic operators in one UpdateOne.
4. **Baseline fix** (scrape_target_repo.record_run_result): current `avg_price` is
   EWMA of CHEAPEST-per-run (keep it, still useful). ADD `price_p50_ewma`: EWMA
   (alpha 0.3) of the MEDIAN price of each run. Migration seeds
   `price_p50_ewma = avg_price * 1.3` where avg_price exists.
5. **Python computes NO deal scores.** Remove `is_deal`/`deal_score` from
   FlightModel and flight_service. Scoring lives in ONE place:
   `frontend/lib/score.ts` (read-time, against scrape_targets baselines).
6. **Price sanity guard** in flight_service: drop flights with
   `price <= 5 or price > 3000` (log count).
7. **Indexes v2** (setup_indexes.py): flights gets exactly 4 —
   `flight_key` unique, `(origin, outbound_date, price)`,
   `(destination, outbound_date, price)`, TTL `last_seen_at` 14d.
   Drop all other flights indexes BY NAME. Remove price_history + route_stats
   index blocks entirely. users gets `email` unique. availability keeps
   `(user_id, end_date)`. scrape_targets/scrape_runs unchanged.
8. **Migration** `scripts/migrate_v2.py`: drop `flights`, `price_history`,
   `route_stats`, `destination_preferences`, `schedule_state`; set
   `role: "admin"` on the existing pablo user, `role: "user"` default elsewhere;
   seed `price_p50_ewma` on scrape_targets; print summary. Idempotent.
9. **Codegen** `scripts/export_destinations.py`: reads `scraper/targets.py`,
   writes `frontend/data/destinations.gen.ts` (230 dests: code, name, country,
   region, tier) + `frontend/data/airports.gen.ts` (4 origins + commented
   extras) with `// GENERATED — edit scraper/targets.py, run scripts/export_destinations.py`.
   Exports: `DESTINATIONS: Destination[]`, `ORIGINS: Origin[]`,
   `getDestination(code)`, `REGIONS: string[]`.

FlightModel v2 fields: flight_key, origin, destination, outbound_date,
return_date (YYYY-MM-DD strings), duration_days, price, currency, airlines[],
outbound_departure/arrival/duration/stops, return_departure/arrival/duration/stops,
search_link, source, price_points[], first_seen_at, last_seen_at, scraped_at.
(azair_link dropped — azair fallback builds URLs client-side.)

Steady state: ~920 routes × ~22 date-pairs ≈ 20K flight docs, bounded by 14d TTL.

## C. Scoring (TypeScript, read-time — `frontend/lib/score.ts`)

```
baseline = scrape_targets[route_key].price_p50_ewma  (null when cold)
delta_pct = (price - baseline) / baseline * 100      (negative = below typical)
score: null baseline -> fallback score = clamp(round((150 - price)/1.5), 0, 100)
       else            score = clamp(round(50 - delta_pct * 2.5), 0, 100)
deal_tier: "steal" if score >= 85 or price <= 35
           "deal"  if score >= 68
           "fair"  otherwise
```
Baselines fetched via `frontend/lib/baselines.ts`: reads scrape_targets
(projection route_key, price_p50_ewma, min_price_seen, avg_price), cached 10 min
(unstable_cache). "Never red": above-typical prices simply lack a badge.

## D. API contract (Next.js routes, zod-validated at boundary)

Single shared types module `frontend/types/api.ts` imported by handlers AND
client code. All dates YYYY-MM-DD strings. All handlers wrap Mongo docs through
zod schemas — unexpected shape fails loudly with route+field in the error.

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/cities` | GET | public | `?from=EIN,AMS&window=all` → `{ cities: CitySummary[], updated_at }` |
| `/api/cities/[code]` | GET | public | `?from=` → `{ city, baseline, trips: Trip[] }` |
| `/api/trips` | GET | public | `?from&start&end&maxPrice&minNights&maxNights&direct&tier&avail` → `{ trips: Trip[], density: Record<date, count>, truncated }` |
| `/api/availability` | GET/PUT | session | PUT `{ windows: DateWindow[] }` replace-all |
| `/api/preferences` | GET/PUT | session | `{ origins, trip_min_nights, trip_max_nights, direct_only, max_price }` |
| `/api/auth/[...nextauth]` | * | — | NextAuth v5 |
| `/api/admin/pool` | GET | admin | tiles + per-target summaries |
| `/api/admin/runs` | GET | admin | `?limit=` recent runs + 24h stats |
| `/api/admin/wipe` | POST | admin | `{ collection: "flights" }` only |

```ts
// CitySummary
{ code, name, country, region, tier, min_price, trip_count,
  baseline: number|null,
  best: { origin, price, outbound_date, return_date, duration_days, nights,
          score, delta_pct, deal_tier, airlines, is_direct, search_link } }
// Trip
{ key, origin, destination, city, outbound_date, return_date, duration_days,
  price, currency, airlines, is_direct,
  score, delta_pct, deal_tier,
  outbound: { dep, arr, duration, stops }, ret: { dep, arr, duration, stops },
  price_points: { p, at }[], search_link, last_seen_at }
```

**`/api/cities` computation**: aggregation — `$match` origins + future
outbound_date, `$sort` price asc, `$group` by `{destination, origin}` →
`$first` doc + counts; TS scores the ≤920 candidates against baselines, picks
best per destination by score, joins city metadata from generated data.
Cached 15 min.

**`/api/trips` computation**: `$match` range + filters, minimal `$project`;
TS scores, dedupes by `destination|outbound_date|return_date` keeping cheapest;
curation: per destination per month top 2 by score (variety guard), global top
40 bars/month; everything else aggregates into `density` (count of trips
spanning each day, computed over the UNFILTERED match so the heat never lies).
`avail=1` + session → restrict to user's availability windows
(trip must fit inside one window, nights within user trip-length prefs).

## E. Auth — NextAuth (Auth.js) v5

- Credentials provider: email + display name, no password v1. authorize()
  upserts into `users` (email unique), returns `{id, email, name, role}`.
- JWT sessions; `id` + `role` in token via callbacks. `AUTH_SECRET` env.
- Files: `frontend/auth.ts`, `frontend/app/api/auth/[...nextauth]/route.ts`,
  `frontend/middleware.ts` (matcher: `/settings`, `/admin/:path*` → login
  redirect; admin additionally `token.role === "admin"`).
- Every `/api/admin/*` handler re-checks role server-side (defense in depth).
- Known v1 limitation (documented): no password → anyone can claim an email.
  Acceptable for personal app; password/OAuth later.

## F. Visual design system

Concept: **"the departure board, made personal."** Warm paper surfaces, one
ink-dark Solari board hero, wayfinding yellow as the single loud accent.

Fonts (`frontend/app/fonts.ts`, next/font/google, variable, swap):
- `Bricolage_Grotesque` → `--font-bricolage` — display (titles, city names)
- `Instrument_Sans` → `--font-instrument` — body/UI
- `Spline_Sans_Mono` → `--font-spline-mono` — ALL flight data (prices, dates,
  IATA codes), tabular-nums, uppercase tracking-wide for codes

`globals.css` Tailwind v4 `@theme` tokens (verbatim):
```css
--color-paper: #FAF7F0;  --color-card: #FFFFFF;  --color-line: #E7E1D3;
--color-ink: #1F242E;    --color-ink-muted: #5C6470;
--color-night: #14171D;  --color-board-tile: #1F232B;
--color-brand: #FFC72C;  --color-brand-ink: #3A2D00;
--color-steal: #0E9F6E;  --color-steal-ink: #06402D;
--color-alert: #D6453D;
--radius-card: 0.75rem;  --radius-tag: 0.375rem;
--shadow-card: 0 1px 2px rgb(20 23 29 / .05), 0 10px 28px -14px rgb(20 23 29 / .14);
--ease-out-quart: cubic-bezier(.25,1,.5,1); --ease-snap: cubic-bezier(.2,.9,.25,1.15);
```
Yellow scarcity rules — yellow ONLY as: (1) IATA code tags, (2) deal-tier
badges/bars, (3) availability hatch on calendar, (4) board header strip.
Steal-green is the only other chromatic. Cards `rounded-(--radius-card)` +
`shadow-(--shadow-card)`. Motion: 120ms entrances `--ease-out-quart`, 90ms
flaps `--ease-snap`, 1px hover lifts, `prefers-reduced-motion` → instant.

**Signature: `FlapText`** (`components/board/FlapText.tsx`) — renders text as
split-flap tiles (board-tile bg, mono font, 2px gap, hairline mid-seam),
animates char changes with vertical half-flip (CSS 3D rotateX, 90ms/flap, 30ms
stagger). Used in: Explore hero DepartureBoard, CityCard price changes.
Reduced-motion: instant swap. `DepartureBoard` hero shows top 5 steals as board
rows: `AMS → BCN  21 JUN  10 NTS  €38  STEAL`.

FareTag (`components/ui/FareTag.tsx`): the price atom — mono price in a
tag-shaped chip, tier-colored (steal=green fill, deal=yellow fill, fair=plain),
used everywhere incl. skeleton states.

## G. Calendar design (`/calendar`)

Months stacked vertically (6 months), each month = horizontal gantt block:
- Day columns, weekend faint tint, today marker line.
- Score-first lane packing (`lib/lanes.ts`): sort by score desc, greedy
  interval-place into ≤6 lanes (laneEnds < outbound_date), overflow → density.
- Bar: rounded pill spanning out→ret, mono "BCN €39" label at left end, color
  by tier (steal filled green, deal yellow outline-fill, fair ink outline).
- Density strip bottom row: per-day heat cells (opacity ~ count), "+118 more".
- Availability windows (signed-in): soft green underlay behind lanes.
- Hover bar → tooltip; click bar → TripPopover (details + Google Flights link +
  sparkline from price_points + "More trips to {city} →").
- Click day → DaySheet side panel: ALL trips spanning that date (separate fetch
  `/api/trips?start=X&end=X`), sorted by score.
- Mobile <768px: agenda mode — per-week stacked FareTag rows.

## H. Build phases

0. **Python data layer** (sequential, deploy to Linux box, repopulate starts)
1. **Foundation**: types/api.ts, zod schemas, lib/{score,baselines,lanes,format}.ts,
   fonts.ts, globals.css tokens, generated data files, ui primitives
   (FareTag, Badge, Chip, Sheet, Spark), nav/layout.
2. **Parallel tracks**: A auth+session APIs · B public APIs · C Explore ·
   D Calendar · E City detail · F Settings+Admin. Tracks touch DISJOINT files;
   all shared code lives in foundation (frozen during phase 2).
3. **Integration**: wire, delete legacy, build+lint, review workflow, browser
   verify, deploy Vercel, push, update CLAUDE.md/ARCHITECTURE.md.

Out of scope v1: notifications, password auth, FastAPI removal, legacy
scheduler removal.
