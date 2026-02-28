# TODO

## Medium Term — Core Features

- [ ] **Email notifications**
  - Gmail SMTP via `email-service/` module (currently empty)
  - Daily digest: top deals, formatted HTML email
  - Scheduler hooks into email after each scrape run
  - Toggle in settings UI (on/off, min deal score threshold)

- [ ] **Price trend indicator** — `price_history` collection is already populated. Add a small up/down indicator or % delta on deal cards to show if the price has moved vs last week.

---

## Long Term — Scale & Polish

- [ ] **Multi-user auth: add passwords**
  - Currently: login is name + email only, no password — `X-User-ID` header trusted as-is
  - bcrypt infrastructure already in `user_repo.py` (hash_password, verify_password, authenticate)
  - To upgrade: add password field to login form, validate in `/api/auth/login`, replace header trust with JWT

- [ ] **Mobile responsive layout** — currently desktop-first. Deals page grid already has `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. The calendar (`DealsCalendar`, `TwoMonthCalendar`) needs a list/card fallback on small screens. Settings page needs layout work too.

- [ ] **Price trend charts**
  - Sparkline per route showing price history (7/30 day)
  - Route stats page: cheapest month, best day of week to fly

- [ ] **Calendar export (iCal)**
  - Export matching deals as `.ics` file / subscribe link

- [ ] **Browser notifications / PWA**
  - Service worker for background push notifications
  - "Install as app" on mobile

- [ ] **Smarter deal scoring**
  - Seasonality adjustment
  - Weekend vs weekday premium
  - Airline reliability weighting

---

## Done (for reference)

- ✅ Calendar deal bars show destination code — `BCN €89` instead of just `€89`
- ✅ DB write optimization — pre-fetch route stats + bulk_write cuts ~1800 Atlas round trips to ~4 per scrape run
- ✅ Airport/destination picker UX — chips shown above search, dropdown stays open while picking, no "home" label
- ✅ Admin: clear all users button — wipes users, availability, destination_preferences (with confirm step)
- ✅ Login deduplication — atomic findOneAndUpdate upsert prevents duplicate user creation; unique index on email
- ✅ Deploy to cloud — Frontend on Vercel, DB on MongoDB Atlas, scheduler runs on home PC writing to Atlas
- ✅ Settings: collapsible availability section — starts open, state persisted in localStorage
- ✅ Settings: "Clear all dates" button below availability calendar
- ✅ Scheduler timezone fix — ISO strings from backend get "Z" suffix; all times display in user's local timezone
- ✅ Scheduler timeline — visual bar on admin page showing cycle progress, origin slots, live "now" cursor
- ✅ Scheduler auto-starts with API — BackgroundScheduler in api/main.py, simulate mode (60 min/cycle)
- ✅ Scheduler reads DB preferences — origins from user.all_airports, destinations/availability at job runtime
- ✅ schedule_state collection — per-origin state written immediately on configure (timeline visible before first run)
- ✅ Admin page — scheduler section, clear data, users table
- ✅ Clear all flight data on admin page (flights + price_history + route_stats, with confirm step)
- ✅ Sort by score/price/date on deals page — all three implemented
- ✅ Destination filter shows city names — `DealFilters.tsx` uses `d.name`
- ✅ Error state in UI — `.catch()` added to home and deals page
- ✅ Mock data files deleted — `mock-deals.ts`, `mock-user.ts` removed
