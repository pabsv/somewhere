# Vision

## What This Is

A personal flight deal finder. You tell it when you're free and where you want to go — it watches Azair every day and surfaces the best deals on a visual calendar. When something good comes up, you'll know.

The goal is to cut through the noise: instead of checking flight prices manually or getting blasted with irrelevant newsletters, you get a dashboard that shows only flights that fit *your* dates, *your* airports, *your* budget.

---

## The Core Experience

1. **Set it once.** Open settings, drag availability windows on the calendar, pick your airports and destinations, set a max price. Save.

2. **Scraper runs daily.** Every morning it searches all your routes across all your available dates. Deals get scored against historical averages.

3. **Open the app, see what's good.** The home calendar shows all matching flights as coloured bars — one per destination. Hover for a quick summary, click for full details with a direct booking link.

4. **Book or keep watching.** Two options: jump straight to the exact Azair result, or open a flexible search (±3 days, ±2 days stay) to browse alternatives.

---

## Design Principles

- **Minimal.** No clutter. No accounts to manage, no marketing. The app is for one person.
- **Fast to scan.** The calendar view lets you see a month of deals in seconds. Dense information, not dense UI.
- **Actionable.** Every deal links directly to Azair. No dead ends.
- **Local-first.** Runs on your machine, your MongoDB, your data. No cloud dependencies required (for now).

---

## Current Capabilities

- Scrapes EIN, AMS, BRU, DUS, CGN → 57 European & North African destinations
- Filters by your availability windows (with a 70% overlap rule for trip length)
- Deal scoring: absolute price thresholds + % below route historical average
- Dashboard: calendar view, deals list with filters, settings page
- Manual scrape trigger from the UI with live progress
- Two booking paths: exact flight link + flexible Azair search URL
- Single user, no login required

---

## Where It's Going

### Next (near-term)
Make the core loop complete and reliable. Everything works but needs end-to-end testing with real data and a few rough edges smoothed out. See `TODO.md` for specifics.

### Email Notifications
The dashboard is great for browsing, but for hot deals you want a push. Daily digest email: your top 5 deals for the week. Instant alert when a price drops >30% below the route average. Gmail SMTP, simple HTML template.

### Multi-User
Right now it's single-user by design. Adding auth (JWT, login/signup) would let anyone use it — friends, family. The architecture already supports it: the user model exists, everything is per-user in MongoDB. It's a frontend + auth middleware addition.

### Deploy
Move from local to cloud: Vercel for the frontend, Railway or Render for the API, MongoDB Atlas for the database. The scheduler would move to a cron job or a small always-on server (Railway background worker).

### Price Trends
The price history collection is already being populated. Visualising it — e.g. a sparkline on each deal card showing how the price has moved — would make the deal scores more meaningful.

### Beyond
- Mobile responsive layout (currently desktop-first)
- Browser notifications / PWA for instant alerts without email
- Calendar export (iCal) so deals show up in your calendar app
- More scraper sources (Kiwi, Google Flights API) for price comparison
- Historical deal charts per route
