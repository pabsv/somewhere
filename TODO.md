# TODO

## Short Term — Remaining

Nothing left here.

---

## Medium Term — Core Features

- [ ] **Settings: clear all availability** — individual × buttons work; add a "Clear all dates" shortcut button below the calendar.

---

## Long Term — Scale & Polish

- [ ] **Deploy to cloud**
  - Frontend → Vercel
  - API → Railway or Render (free tier)
  - Database → MongoDB Atlas (free tier, 512MB)
  - Scheduler → runs inside API process (already), so deploys with it
  - Update CORS origins, set env vars

- [ ] **Multi-user auth: add passwords**
  - Currently: login is name + email only, no password — `X-User-ID` header trusted as-is
  - bcrypt infrastructure already in `user_repo.py` (hash_password, verify_password, authenticate)
  - To upgrade: add password field to login form, validate in `/api/auth/login`, replace header trust with JWT

- [ ] **Email notifications**
  - Gmail SMTP via `email-service/` module (currently empty)
  - Daily digest: top deals, formatted HTML email
  - Scheduler hooks into email after each scrape run
  - Toggle in settings UI (on/off, min deal score threshold)

- [ ] **Mobile responsive layout** — currently desktop-first. Deals page grid already has `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. The calendar (`DealsCalendar`, `TwoMonthCalendar`) needs a list/card fallback on small screens. Settings page needs layout work too.

- [ ] **Price trend indicator** — `price_history` collection is already populated. Add a small up/down indicator or % delta on deal cards to show if the price has moved vs last week.

- [ ] **Price trend charts**
  - Sparkline per route showing price history (7/30 day)
  - Route stats page: cheapest month, best day of week to fly

- [ ] **Calendar export (iCal)**
  - Export matching deals as `.ics` file / subscribe link

- [ ] **Browser notifications / PWA**
  - Service worker for background push notifications
  - "Install as app" on mobile

- [ ] **More scraper sources**
  - Kiwi API (originally planned, dropped)
  - Cross-source price comparison

- [ ] **Smarter deal scoring**
  - Seasonality adjustment
  - Weekend vs weekday premium
  - Airline reliability weighting


---

## Done (for reference)

- ✅ Scheduler timezone fix — ISO strings from backend get "Z" suffix; all times display in user's local timezone
- ✅ Scheduler timeline — visual bar on admin page showing cycle progress, origin slots, live "now" cursor
- ✅ Scheduler auto-starts with API — BackgroundScheduler in api/main.py, simulate mode (60 min/cycle)
- ✅ Scheduler reads DB preferences — origins from user.all_airports, destinations/availability at job runtime
- ✅ schedule_state collection — per-origin state written immediately on configure (timeline visible before first run)
- ✅ Admin page — manual scraper, scheduler section, clear data, users table
- ✅ Run scraper moved to admin page only (removed from settings)
- ✅ Clear all flight data on admin page (flights + price_history + route_stats, with confirm step)
- ✅ Settings: "Clear all dates" button below availability calendar
- ✅ API port — frontend defaults to 9000, API runs on 9000, no env file needed
- ✅ Scraper uses saved preferences — `api/routes/scrape.py` reads airports, destinations, availability from MongoDB
- ✅ API scrape route uses user's airports — `user.all_airports` + repos, fully wired
- ✅ Destination management — `DestinationPicker` saves via `PUT /api/preferences` on "Save changes"
- ✅ Airport management — same, `AirportSelector` → preferences → API
- ✅ Sort by score/price/date on deals page — all three implemented
- ✅ Destination filter shows city names — `DealFilters.tsx` uses `d.name`
- ✅ Error state in UI — `.catch()` added to home and deals page
- ✅ Mock data files deleted — `mock-deals.ts`, `mock-user.ts` removed
- ✅ API docstring fixed — port 9000
