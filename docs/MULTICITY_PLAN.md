# Multi-City / Open-Jaw — Full Roadmap

Master plan for open-jaw and multi-city support in Somewhere. Executed **one phase per chat session, consecutively**. Each phase is self-contained, shippable, and verified before the next starts. Update the status table as phases land.

**Final goal:** the app surfaces trips where you leave from one city and come back to (or from) a different one — both flavors:

- **Origin-side open jaw** — out `EIN→BCN`, back `BCN→AMS`. Same destination, different home airport. All 5 home origins are near Eindhoven, so mixing them often beats a round trip.
- **Destination-side multi-city** — out `EIN→BCN`, ground travel, back `MAD→EIN`. Two cities in one trip.

**Core insight (why this is cheap to build):** the pool scraper's Phase-1 sweep fetches one-way price calendars in *both* directions for every route. Since 2026-07-17 these are persisted to the `oneway_fares` collection. Every leg needed for both flavors is already being collected — an open-jaw combo is just two grid lookups + a date join, and its price (sum of two one-ways) is the **real bookable price** (two separate tickets), unlike round-trip estimates.

---

## Status

| Phase | What | Status |
|-------|------|--------|
| 0 | Data foundation — persist one-way fare grids | ✅ Done 2026-07-17 (`98788bb`), live on pablopc |
| 1 | Combo engine + API (origin-side, no UI) | ✅ Done 2026-07-17 — `lib/openjaw-core.ts` (pure join, 9 unit tests) + `lib/openjaw.ts` + `GET /api/openjaw`; verified via curl against live grids |
| 2 | Origin-side UI — City page + booking links | ✅ Done 2026-07-17 — `buildGoogleFlightsOneWayUrl`, `getOpenJaw()` client, `OpenJawRow` + `OpenJawSection` ("Mix & match") on `/city/[code]`; verified live (links, direct-only note, 1-origin + no-grid hiding) |
| 3 | Origin-side UI — Explore + Calendar integration | ✅ Done 2026-07-18 — `getBestOpenJawByDest` + `getOpenJawCalendarTrips` in `lib/openjaw.ts`, `CitySummary.openjaw` chip on CityCard, calendar-mode `/api/openjaw` (no `dest`), "⇄ Mix & match" chip + `CalTrip` bars on `/calendar` (TripBar `2×`/`→AMS` markers, open-jaw tooltip + popover with two booking links), `Preferences.allow_open_jaw` opt-out (Settings toggle, gates Explore/Calendar/City) |
| 4 | Destination-side pairing data + engine extension | 🔴 |
| 5 | Destination-side UI — twin-city trips | 🔴 |
| 6 | Polish — availability edge cases, saved cities, groups, admin observability | 🔴 |

---

## Phase 0 — Data foundation ✅ (reference)

What exists, for later phases to build on:

- **Collection `oneway_fares`** — one doc per directed leg: `{leg_key: "EIN-BCN", origin, destination, currency: "EUR", prices: {"2026-07-20": 45.0, ...}, price_count, min_price, first_seen_at, scraped_at}`. Prices map replaced wholesale each scrape. TTL 21d on `scraped_at`. Indexes: `leg_key` unique, `origin`, `destination`.
- Backend pieces: `database/models/oneway_fare.py`, `database/repositories/oneway_fare_repo.py`, `FlightService.save_oneway_grids` (past-date + sanity filters), `stats["oneway_grids"]` from `FliScraper.search_one_route`, best-effort save in `pool_scheduler` (skipped on `--direct-only`).
- **Data caveats every later phase must respect:**
  - Return-direction grids start at ~today+`SCRAPE_MIN_NIGHTS` (sweep window is shifted) — the first ~2 days in that direction may be missing.
  - Grids are `date → price` **only**. No departure times, stops, or airline. Availability *edge-hour* filtering (`start_time`/`end_time`) cannot be enforced on combos; date-level filtering can.
  - Coverage densifies over ~1 week (tier cadence 24h/72h/168h). Engine must tolerate missing/sparse grids gracefully.
  - Grids exist for `(home origin ↔ destination)` pairs only — there are no `BCN→MAD` grids (dest↔dest legs are not in the pool, and shouldn't be: ground travel covers that gap).

---

## Phase 1 — Combo engine + API (origin-side, no UI)

**Goal:** pure logic + one API route that answers "what are the best open-jaw options to destination X?" Testable via curl before any UI exists.

**Build (all frontend/TS — frontend reads Atlas directly):**

1. **Types** in `frontend/types/api.ts`:
   - `OnewayFareDoc` (mirror of the Mongo doc).
   - `OpenJawTrip`: `{key, destination, city, out: {origin, date, price}, back: {origin, date, price}, total_price, nights, vs_roundtrip?: number}` — `out.origin ≠ back.origin` for origin-side. Keep the shape leg-based so Phase 4 (destination-side) extends it with `back.destination` instead of forking a new type.
2. **Engine** — new `frontend/lib/openjaw.ts`:
   - `loadFareGrids(filter)` — fetch `oneway_fares` docs via `lib/mongodb.ts` (project only needed fields).
   - `combineGrids(outGrid, backGrid, {minNights, maxNights, maxPrice})` — date join, mirrors the Python Phase-1 pairing (`scraper-fli/scraper.py` `search_one_route`). Pure function, no I/O — unit-testable.
   - `getOpenJawTrips(dest, origins, opts)` — for each ordered origin pair `(O1, O2), O1 ≠ O2`: combine `O1→dest` × `dest→O2`. Dedupe to best per `(out.origin, back.origin, out.date, back.date)`; cap results (e.g. top 50 by price).
   - **Comparison baseline:** for each combo also compute the best *round-trip* price for the same dest + dates from the `flights` collection (reuse `buildTripFilter` from `lib/queries.ts`) → `vs_roundtrip` delta. This is the "is this actually a win?" signal — open-jaw is only interesting when it beats (or enables dates missing from) the round-trip data.
3. **API route** `frontend/app/api/openjaw/route.ts` — `GET /api/openjaw?dest=BCN&from=EIN,AMS&min_nights=2&max_nights=10&max_price=...`. Public (like trips/extensions). Mirror existing route conventions.
4. **Availability hook (date-level only):** accept `avail=1` — filter combos where both dates fit a window via `fitsAnyWindow` (`lib/queries.ts`), but skip edge-hour enforcement (no time data — pass unparseable-hour rule).

**Decisions locked in:**
- Same-origin one-way pairs (`EIN→BCN` + `BCN→EIN` as two singles) are **also** emitted when cheaper than the stored round trip — flag `same_origin: true`. Costs nothing in the engine and sometimes two singles beat a return fare.
- No deal-tier scoring against p50 baselines in this phase — `vs_roundtrip` delta is the ranking signal. Baseline scoring only if it proves needed.

**Verify:** `curl "localhost:4173/api/openjaw?dest=BCN&from=EIN,AMS,BRU"` returns sane combos; hand-check 2-3 prices against the raw grids in Atlas; unit-test `combineGrids` edge cases (empty grid, sparse dates, min/max nights bounds).

---

## Phase 2 — Origin-side UI: City page + booking links

**Goal:** a user on `/city/BCN` sees open-jaw options and can book them.

**Build:**

1. **One-way booking URL builder** in `frontend/lib/searchUrl.ts`: `buildGoogleFlightsOneWayUrl(origin, dest, date)` (text-query form, like `buildGoogleFlightsSearchUrl` but "one way on ..."). An open-jaw combo gets **two** links — one per ticket.
2. **City page section** — new `frontend/components/city/OpenJawRow.tsx` + a "MIX & MATCH" / "OPEN JAW" section in `CityDetail`, fed by `/api/openjaw` (client fetch, only when ≥2 origins selected in `useOrigins`). Row shows `EIN → BCN · 3 Oct · €45` / `BCN → AMS · 8 Oct · €38` / total + `vs_roundtrip` badge ("€27 cheaper than round trip"). Respect the departure-board design system.
3. **Estimate honesty:** label prices as of last scrape (`scraped_at`); the two Google links are the confirmation path. No fake precision.
4. Respect existing filters where they map: nights range, max price, "only my free dates" (date-level). `direct_only` **cannot** be honored (no stops data) — hide the section or show a note when that filter is on.

**Verify:** local dev against real Atlas data (grids dense by now); click both booking links for one combo and confirm Google shows ~the stored prices; check with 1 origin selected (section hidden), with `direct_only` on, and for a destination with no grids yet.

---

## Phase 3 — Origin-side UI: Explore + Calendar

**Goal:** open-jaw wins are discoverable without already knowing the destination.

**Build:**

1. **Explore:** extend `getCitiesData` (`lib/queries.ts`) or a parallel light query to compute each destination's best open-jaw total; when it beats the round-trip best, show it on `CityCard` (e.g. "open-jaw €83" chip or swap the headline price with a mix-badge). Keep it cheap: `oneway_fares` is ~2,300 small docs — one indexed fetch per selected origin set, join in memory, consider caching.
2. **Calendar:** open-jaw combos as bars in the personal calendar — reuse `MonthBlock`/`TripBar` with a visual marker for "returns to different airport" (e.g. `→AMS` suffix on the bar label / distinct tooltip). Wire `TripTooltip`/`TripPopover` to show both legs with their two booking links. Decide whether combos appear by default or behind a chip ("Open-jaw" toggle chip, like "★ Saved").
3. **Preference:** `Preferences.allow_open_jaw` (default on) in settings + PUT route, so users who hate split tickets can turn it off globally.

**Verify:** Explore shows chips only where open-jaw genuinely beats round-trip; calendar bars render sanely across months; toggle chip + preference both hide everything; dedupe against normal trips is correct (no duplicate bars for same-origin pairs).

---

## Phase 4 — Destination-side pairing data + engine extension

**Goal:** the engine can answer "fly into Barcelona, out of somewhere reachable overland" — the multi-city flavor.

**Build:**

1. **Ground-pairing data** — the missing piece: which destination pairs are sensibly connected overland. Curate in `scraper/targets.py` (single source of truth, next to `DESTINATIONS`): `GROUND_PAIRS: [(D1, D2, hours), ...]` — e.g. `("BCN","MAD",3), ("BCN","VLC",3), ("OPO","LIS",3), ("VIE","BUD",2.5), ("PRG","VIE",4), ("MXP","VCE",2.5), ("FCO","NAP",1.2), ...`. Symmetric. Start ~40-60 curated pairs (train-friendly Europe first); regenerate `frontend/data/*.gen.ts` the same way `ORIGINS`/destinations are generated so the frontend gets it typed.
2. **Engine extension** in `lib/openjaw.ts`: `getMultiCityTrips(dest, origins, opts)` — for each ground pair containing `dest`: combine `O→D1` grid × `D2→O'` grid (same-origin `O = O'` allowed and default here; different origin on top = both flavors at once). Enforce `minNights` across the whole span; expose `ground: {from, to, hours}` on the trip object. Extend `OpenJawTrip` → `back.destination` now differs from `out.destination`.
3. **API:** extend `/api/openjaw` with `mode=origin|multicity|all`.

**Decisions locked in:**
- Curated pairs over geo-distance computation: 230 destinations = manageable list, and "3h train BCN↔MAD" is knowledge a distance formula gets wrong (mountains, ferries, no rail). Curation is also a taste filter.
- Ground cost/time is displayed, not priced — the trip total stays flights-only, with the ground hop shown as info.

**Verify:** unit tests on pairing; `curl "/api/openjaw?dest=BCN&mode=multicity"` returns BCN-in/MAD-out style combos with sane totals; confirm no dest↔dest flight legs are ever attempted (grids don't exist).

---

## Phase 5 — Destination-side UI: twin-city trips

**Goal:** multi-city trips visible and bookable.

**Build:**

1. **City page:** "TWIN CITY" section on `/city/BCN` — "BCN in, MAD out" rows: both flight legs + ground hop indicator (`BCN ⇢ MAD · ~3h train`) + two booking links. Link the second city name to its own city page.
2. **Explore:** decide surface — minimal: a "+MAD" style hint on CityCard when a twin combo meaningfully beats the single-city best. Avoid clutter; Explore stays cheapest-single-city-first.
3. **Calendar:** twin-city bar spans out-date → back-date, label `BCN+MAD`; popover shows leg/ground/leg timeline.
4. Reuse everything from Phases 2-3 (rows, links, chips, preference) — this phase is mostly composition, not new machinery.

**Verify:** end-to-end: find a twin-city trip in UI, open both Google links, prices match ~grids; calendar + popover render; city cross-links work.

---

## Phase 6 — Polish + integrations

**Goal:** open-jaw becomes a first-class citizen of existing features. Grab-bag — trim to what proves useful.

- **Availability edge times:** document (in UI copy) that open-jaw can't honor edge *hours* — or optionally add a scheduler-side detail-fetch for top-N open-jaw combos (Python `SearchFlights` one-way calls) to get real times/stops for the best combos only. Only do this if hour-filtering proves to matter; it costs API calls.
- **Saved cities / stars:** open-jaw sections respect `useSavedCities` pinning; twin-city combos count as saved if either city is starred.
- **Groups:** `getGroupTripsData` extension — group members free across an open-jaw combo's dates (reuse `fitsAnyWindow` fan-out).
- **Stay-longer hover:** ghost-extension equivalent for open-jaw bars (later returns from the same back-grid — trivially available, same data).
- **Admin/observability:** grid coverage stats on `/admin` (docs count, median price_count, stale grids); alert if grids stop refreshing.
- **CLAUDE.md + docs:** keep Architectural Decisions current per phase (already the habit).

---

## Cross-cutting rules (all phases)

- **Never** invent legs that aren't in the pool (no dest↔dest flights).
- Combos are **estimates as of `scraped_at`** — always link out per one-way leg for confirmation; never imply a bookable package.
- Engine tolerates sparse/missing grids silently (mirrors the "stay longer" empty-variants convention).
- Frontend work happens in `frontend/`; the only Python surface left is the optional Phase-6 detail fetch.
- After each phase: run/build green, verify per phase checklist, commit, update the status table above, update `CLAUDE.md`.
