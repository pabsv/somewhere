# WP5 — Keywords, Analytics & Tracking (do this FIRST)

> **Goal:** The map and the instruments. The keyword universe that WP2/WP3 target, plus the
> analytics + rank + AI-citation tracking that tells you whether any of this is working.
> **Read first:** `00-OVERVIEW.md §3` · **Depends on:** nothing — start here in week 1.

## Part 1 — Keyword map (NL-first for the beachhead, EN for scale)

Group by intent. NL has *far* lower competition than EN — that's the beachhead advantage. Build
content/pages for these in WP2; the **transactional + flexible-destination clusters convert best.**

**A. Flexible-destination / "where can I go" (Somewhere's core wedge — own this):**
- `weekendje weg`, `weekendje weg vliegen`, `waar kan ik goedkoop heen`, `goedkope bestemmingen vanaf [airport]`
- EN: `where can I fly cheap`, `cheap weekend trips from [city]`, `flights anywhere under 100`

**B. Transactional route (programmatic SEO core — high volume, long tail):**
- `goedkope vluchten [origin] [bestemming]`, `vliegtickets [stad]`, `goedkope vliegtickets [stad]`
- EN: `cheap flights [origin] to [dest]`, `flight deals from [airport]`

**C. Origin-anchored (the student "from my airport" intent):**
- `goedkope vluchten vanaf Eindhoven / Schiphol / Brussel / Düsseldorf / Charleroi / Weeze`
- `vliegen vanaf Eindhoven goedkoop`, `Eindhoven Airport bestemmingen`

**D. Deal/alert intent (matches the product):**
- `vluchtdeals`, `error fare`, `prijsfout vliegticket`, `last minute vliegtickets`, `vliegticket alert`
- EN: `flight deal alerts`, `cheap flight alerts Europe`, `mistake fares`

**E. Student / budget (the ICP):**
- `goedkoop reizen student`, `goedkope stedentrip student`, `budget reizen vanaf Nederland`
- EN: `student cheap flights Europe`, `budget travel from Netherlands`

**F. Competitor / comparison (GEO + comparison pages):**
- `Skyscanner alternatief`, `Going alternative Europe`, `beste app goedkope vluchten`, `Jack's Flight Club alternative`

**Tasks:**
1. Pull rough volumes/difficulty per keyword — free tools: Google Keyword Planner, Google autocomplete + "People also ask", Bing, AnswerThePublic free tier, Reddit/forum mining. Record in a sheet.
2. Map each keyword cluster → a WP2 page type (route/city/origin/budget/comparison).
3. Flag **quick wins** = decent volume × low difficulty × matches existing data (likely the NL origin-hub + flexible-destination clusters).
4. Build the **GEO question set** (the natural-language versions in WP3) from clusters A/D/E/F.

## Part 2 — Analytics & tracking stack (all free)

1. **Web analytics:** privacy-friendly + free — Plausible (free self-host) or **Vercel Analytics** (you're on Vercel) or **GA4**. Pick one, install on the public site.
2. **Search Console + Bing Webmaster Tools:** verify the domain on **both** (Bing = ChatGPT prerequisite). Track impressions/clicks/positions per page; this is the WP2 scoreboard.
3. **Rank tracking (free):** a small script that checks positions for the top ~30 keywords weekly (or free tier of a tracker). Log to a sheet.
4. **AI-citation tracking (the GEO KPI):** monthly, run the WP3 question set through ChatGPT, Perplexity, Gemini, Google AI Overviews; log appearance + position + whether it links you. Even a manual monthly checklist is fine to start.
5. **The funnel dashboard** — the numbers that actually decide if 50k is on track. Instrument these events:
   - `visit → signup → activated (set prefs / saw matched deal) → M1 active → MAU`
   - Per acquisition channel (SEO / social / community / referral / direct) via UTM tags.
   - **Referral/viral coefficient** (invites sent → accepted) from WP4.
   - Retention cohorts (W1/M1/M3).

## The KPI tree (review monthly against `00-OVERVIEW §3`)
```
MAU (north star: 50k)
├── New signups/mo        ← traffic × signup-rate
│   ├── Organic SEO sessions   (GSC + analytics)
│   ├── AI-assisted sessions   (GEO tracking + referrer)
│   ├── Social/community sessions (UTMs)
│   └── Referral signups       (viral coefficient)
├── Activation rate        (signup → set prefs / matched deal)
└── Retention (M1 → MAU)    (digest/iCal/push impact)
```

## Acceptance criteria
- Keyword sheet: ≥60 keywords across clusters A–F, each with rough volume/difficulty + mapped page type + quick-win flag.
- Analytics installed; GSC **and** Bing verified.
- Weekly rank-tracking and monthly AI-citation tracking sheets created with the question set.
- Funnel events instrumented with per-channel UTMs; a single dashboard/sheet showing the KPI tree.

## Notes
- Do this **before** WP2 ships so the first indexed pages are measured from day one.
- Keep it free: GSC + Bing + Vercel/Plausible/GA4 + a sheet cover everything at this stage.
- The funnel dashboard is what converts "did stuff" into "are we on the 50k path" — don't skip Part 2.5.
