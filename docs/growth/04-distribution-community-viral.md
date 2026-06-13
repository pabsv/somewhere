# WP4 — Distribution: Community, Social Automation & Referral Loop

> **Goal:** €0 demand that lands users *now* (before SEO matures) and a loop that multiplies every
> other channel. Beachhead = students (TU/e + Dutch student cities), then widen.
> **Read first:** `00-OVERVIEW.md §3` · **Depends on:** WP1 (name/handles), uses WP2 deal permalinks.

## Principle
The scraper produces ~hundreds of scored deals daily. Each is **free content and a free ad.**
Automate deals → posts → shareable permalinks → signups → invites. The product *is* the marketing engine.

## Track A — Auto social deal engine (build once, runs itself)
1. **Deal-to-image generator:** a job that picks the day's top N deals (highest score / % below avg) and
   renders branded cards (origin→dest, price, % below average, dates) — Satori/`@vercel/og` or Puppeteer, €0.
2. **Auto-post pipeline** to: Instagram, TikTok (slideshow/Reels of deal cards — flight-deal accounts grow
   fast on visual "€39 to Barcelona!" hooks), X/Twitter, Threads. Each post links a WP2 `/deal/<id>` permalink.
3. **Cadence:** 1–3 posts/day, NL-leaning copy for the beachhead. Best deals → Reels; long tail → carousels.
4. **Hashtag/format playbook** per platform; track which destinations/price points drive saves/clicks (WP5).

## Track B — Broadcast deal channels (highest retention per effort)
1. **Telegram channel** + **WhatsApp channel** ("Somewhere Deals — flights from NL") auto-posting the same
   daily deals with permalinks. Broadcast channels = push notifications people actually keep.
2. Segment later by origin (EIN/AMS/BRU) and budget tier as volume grows.
3. CTA in every post: "Want only the deals that fit *your* free dates? → set your calendar at <app>."

## Track C — Student beachhead seeding (the cold-start fix)
1. **Study & student associations** (TU/e study associations, ESN Eindhoven/NL, Erasmus/exchange groups):
   offer a free "cheap trips for <city> students" feed; get into their socials/newsletters/WhatsApp.
2. **Campus-timed content:** post deals aligned to breaks/long weekends/exam-end — the ICP's real travel windows
   (this is literally what the availability model is built for).
3. **Reddit** (genuine, non-spammy): r/Eindhoven, r/Netherlands, r/Tilburg, r/studenten, r/travel, r/Shoestring —
   answer "cheap flights from NL?" threads with a real deal + soft mention. Doubles as WP3 GEO fuel.
4. **Ambassadors:** a few students per city who post your deals to their group chats in exchange for a perk
   (early origins, swag-less recognition). €0.

## Track D — Referral / viral loop (multiplies A–C)
1. **Shareable deal permalinks** (WP2 `/deal/<id>`) with OG images → every share is a recruiting link.
2. **Referral mechanic** that fits a free product: invite N friends to **unlock extra origin airports**,
   or **more destinations / discover-mode**, or **earlier deal access**. Gate something users *want* more of,
   not core function. Track invite→signup with referral codes.
3. **"Set your dates → share your trip plan"** loop: when a user finds a deal that fits, one-tap share to the
   friends they'd travel with → those friends land on the deal permalink → signup.
4. Target **viral coefficient > 1.2**; measure in WP5.

## Track E — Owned retention (turns signups into MAU — protects the funnel)
1. **Email/push opt-in**: weekly "your top 5 deals" digest + instant alert on a big drop (VISION already plans this).
   **Consent-based only (EU/GDPR).** This is the biggest lever on the 30%→45% retention assumption.
2. **iCal feed** (TODO already lists it): deals appear in the user's calendar app → passive recurring touchpoint.
3. **PWA / browser push** for instant alerts without email.

## Acceptance criteria
- Auto deal-card generator + at least one auto-posting channel (start: Telegram + Instagram) live and posting daily.
- `/deal/<id>` permalinks with OG images shareable.
- Referral mechanic shipped with tracking.
- ≥5 student orgs / communities contacted; ≥2 distribution placements secured.
- Email or push digest opt-in shipped (even if simple), consent-based.

## Notes / guardrails
- **Don't spam.** Reddit and student groups punish overt promo — lead with the deal/value, mention the app softly.
- Platform automation must respect each network's API/ToS (esp. WhatsApp/Instagram) — use official channel/Graph APIs, not gray-area bots.
- Keep posting NL-first for the beachhead; add EN when widening (P4).
- If a small budget appears later: the cheapest first paid tests are TikTok/IG boosts of your best-performing organic deal cards (you'll already know which convert from WP5).
