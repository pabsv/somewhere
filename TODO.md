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

- [ ] **Scheduler cloud deployment**
  - Move scheduler off home PC to Railway or Render background worker
  - Currently: if PC is off, nothing scrapes — unacceptable for test users
  - Only dependency is `MONGODB_URI` env var — should be straightforward

- [ ] **Deployment readiness**
  - Audit env vars — ensure nothing sensitive is hardcoded or leaked
  - Verify Vercel deployment is stable and all API routes are working
  - Smoke test full flow: login → set preferences → scraper runs → deals appear

---

## Medium Term — Smarter Scraping

- [ ] **"Discover" mode: scrape all European destinations**
  - Currently scraper only checks user's specified destination watchlist
  - New behaviour: scrape all European destinations from user's origins
  - Surface the best deals from anywhere — not just watchlisted places
  - Watchlisted destinations still get priority (scored/displayed first)
  - UI needs a way to distinguish "your picks" vs "discovered deals"

- [ ] **Deal prioritisation logic**
  - Watchlist deals: shown first, always visible
  - Discover deals: shown below, filterable, ranked by deal score
  - Add a "destination type" tag on deal cards (Watchlist / Discover)
  - Settings: toggle discover mode on/off

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
