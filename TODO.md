# TODO

## Short Term — Auth, UI & Test Deployment

- [ ] **Proper user creation with password**
  - Add password field to signup and login forms
  - Hash passwords with bcrypt on save (infrastructure already in `user_repo.py`)
  - Validate password on login — replace header trust with session token or signed cookie
  - Basic validation: min length, confirm password field on signup
  - Keep existing MongoDB user model — just add `password_hash` field

- [ ] **UI improvements**
  - Mobile responsive layout — calendar needs list/card fallback on small screens; settings and deals page need layout pass
  - Loading skeletons on calendar and deals page (currently bare while fetching)
  - Empty states — deals page when no results, calendar when no deals exist yet
  - General visual polish pass before sharing with test users

- [ ] **Scheduler deployment to Linux box** (replaces "cloud deployment")
  - Currently on Windows for burn-in; once pool scheduler is steady, port to Linux.
  - Linux box `pablo@100.101.234.37` already hosts DormSpot scraper — same pattern.
  - Mirror DormSpot's `studentspot-scraper` systemd unit for `flight-scraper-pool`.

- [ ] **Deployment readiness**
  - Audit env vars — ensure nothing sensitive is hardcoded or leaked
  - Verify Vercel deployment is stable and all API routes are working
  - Smoke test full flow: login → set preferences → scraper runs → deals appear

---

## Medium Term — Pool-based scraping (in progress)

- [x] **Pool scheduler (2026-05-28)** — target-driven, user-agnostic scraping.
  - 6 origins (EIN, AMS, BRU, DUS, NRN, CRL) × 230 destinations = 1380 routes
  - Tier A (28 dests, 168 routes, daily) / B (84 dests, 504 routes, 3-day) / C (118 dests, 708 routes, weekly)
  - 2-min slots, 07-23 local window, ~437 routes/day average load
  - Per route: 3 trip-duration buckets × 2 sub-windows = 6 SearchDates + top 6 Phase-2 = ~12 fli HTTP calls / ~43s
  - State in `scrape_targets` + `scrape_runs`; flights TTL'd 14d after `last_seen_at`
  - First end-to-end test (EIN-BCN): 22 flights, 21 deals, €103 cheapest, 12 API calls, 43s
  - Shortcuts: `indexes`, `seed`, `pool`

- [ ] **Burn-in on Windows (24-48h)** — verify pool scheduler steady-state
  - Watch `scheduler-pool.log` for rate-limit / parser breakage signals
  - Check `seed --stats` daily — `success_runs` should grow, `disabled` should stay 0
  - Decide on duration buckets if too many empty routes (`empty_runs` >> `success_runs`)

- [ ] **Port pool scheduler to Linux box (`pablo@100.101.234.37`)**
  - Clone repo into `~/flight-scraper`
  - Install Python deps, copy `.env` with `MONGODB_URI`
  - systemd unit `flight-scraper-pool` mirroring DormSpot's `studentspot-scraper`
  - Linux box already runs 07:00–23:00, matches active window naturally
  - Keep Windows scheduler off after Linux confirmed running

- [ ] **Match user criteria against the pool**
  - Today `/api/deals` reads all flights and filters per-user via UserMatcher (TS)
  - Confirm this still works once pool dumps 5k+ flights/day into Atlas
  - Frontend may need pagination + better deduplication on the dashboard

- [ ] **Deal prioritisation logic**
  - Watchlist deals (user's saved destinations): shown first, always visible
  - Discover deals (anything else from the pool): shown below, ranked by deal score
  - Add a "destination type" tag on deal cards (Watchlist / Discover)
  - Settings: toggle discover mode on/off

- [ ] **Alternative departure airport costs**
  - Allow users to set alternative departure airports beyond their home airport (e.g. they'd travel to a nearby city to fly)
  - Each alternative airport gets an associated "positioning cost" (train/bus/car estimate)
  - Scraper searches from all configured airports; deal score factors in the positioning cost
  - UI in settings to add/remove alternative airports with cost per airport
  - Deal cards show total effective cost (flight + positioning) and which airport it departs from

- [ ] **Deal freshness**
  - Don't surface deals scraped >48h ago as if they're current
  - Add `scraped_at` age indicator on deal cards
  - Auto-hide or grey out stale deals

- [ ] **Price trend indicator**
  - `price_history` collection is already populated
  - Small ↑/↓ % badge on deal cards showing movement vs last week
  - Purely a UI addition — data is already there

---

## Long Term — Auth, Notifications & Reach

- [ ] **Auth0 integration**
  - Upgrade from custom password auth to Auth0
  - Remove session token logic — validate via Auth0 JWT on all API routes
  - Update login/signup UI to use Auth0 hosted or embedded flow
  - Keep per-user MongoDB documents tied to Auth0 user ID

- [ ] **Calendar subscriptions (iCal)**
  - Expose a `/api/calendar/feed.ics` endpoint per user
  - Deals appear as events in Google Calendar / Apple Calendar
  - Auto-updates as new deals come in (subscribe once, always current)

- [ ] **Email notifications**
  - Daily digest: top deals matching user preferences
  - Hot deal alert: instant email when a price drops significantly below route average
  - Toggle in settings (on/off, min score threshold)
  - `email-service/` module exists but is empty — implement via Gmail SMTP or Resend

---

## Done (for reference)

- ✅ Run shortcuts — `simulate.bat`, `scrape.bat`, `api.bat` in project root
- ✅ Deploy — Frontend on Vercel, DB on MongoDB Atlas, scheduler on home PC
- ✅ Scheduler timeline — visual bar on admin page, live "now" cursor, per-origin status
- ✅ Scheduler reads DB preferences — origins/destinations/availability at job runtime
- ✅ Admin page — scheduler section, clear data, users table
- ✅ Deal scoring — absolute price threshold + % below route historical average
- ✅ Calendar view — deal bars with destination + price, deduplication by best deal
- ✅ Deals page — sort by score/price/date, filter by destination
- ✅ Settings — availability calendar, airport picker, destination picker
- ✅ DB write optimisation — bulk_write cuts ~1800 Atlas round trips to ~4 per run
- ✅ Login deduplication — atomic upsert, unique index on email
