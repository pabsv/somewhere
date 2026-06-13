# Somewhere — Growth Master Plan (→ 50k active users)

> **Owner:** Pablo · **Created:** 2026-06-13 · **Budget:** €0 (organic-only) · **Beachhead:** students (TU/e + Dutch student cities) → widen to Benelux/DE
> **Monetization:** free for now · **North-star:** 50,000 monthly active users (MAU)

This is the master document. It holds the *analysis* (brand, competition, baseline math)
and the *strategy* (which channels, in what order, and why). The actual execution work is
split into five numbered work packages (WPs) in this folder. **Each WP is sized to be run
in its own ultra-code chat** — open the file, paste it as the brief, execute, commit.

| WP | File | What it delivers | Depends on |
|----|------|------------------|------------|
| 1 | `01-brand-and-naming.md` | Brand decision: keep "Somewhere" vs rename. Name shortlist, domain/trademark checks, positioning + tagline. | — |
| 2 | `02-seo-programmatic.md` | The growth engine: turn the scraped deal pool into thousands of indexable route/city/deal pages. | WP1 (name) |
| 3 | `03-geo-ai-visibility.md` | Get Somewhere cited by ChatGPT/Perplexity/Gemini/Google AI Overviews. | WP2 |
| 4 | `04-distribution-community-viral.md` | €0 demand: auto-posted deals to social/Telegram/WhatsApp, student-org seeding, referral loop. | WP1 |
| 5 | `05-keywords-and-tracking.md` | Keyword map (NL + EN), analytics, rank + AI-citation tracking, the funnel dashboard. | — (do early) |

---

## 0. The one-paragraph thesis

Somewhere already does the hard part: every day a pool of **1,380 routes** (6 origins × 230
destinations) is scraped, scored against historical baselines, and stored with price history.
**That fresh, structured, scored deal data is the entire growth engine — it's just trapped
behind a login.** The plan is to turn that data into three free, compounding distribution
assets: **(1) indexable SEO pages** ("goedkope vluchten Eindhoven → Barcelona", live price),
**(2) AI-citable structured content** so LLMs recommend Somewhere, and **(3) auto-generated
social/community deal posts** with shareable permalinks that pull people back. Data →
distribution, fully automatable, €0. SEO + GEO compound slowly; community + social give
early momentum; a referral loop multiplies all of it.

---

## 1. Brand analysis (summary — full detail in WP1)

**Does the name exist? Yes, heavily — "Somewhere" is a generic dictionary word, which is the core problem.**

- **`somewhere.com`** is owned by a **well-funded global recruiting/hiring marketplace**
  (formerly *Shepherd*). You will not get the .com, and it already ranks for "somewhere".
- **Travel collisions:** an **`AnywhereFlight`** app exists on the App Store — same
  "fly anywhere / surprise destination" concept and a near-synonym. "Somewhere"/"Anywhere"
  is a *crowded conceptual space* (KAYAK "Anywhere", Skyscanner "Everywhere", Google
  "Anywhere", Hopper "anywhere" watches).
- **Trademark:** generic single words are weak/hard to register in travel (class 39/9/42).
  *Booking.com* only won trademark protection after proving massive consumer recognition —
  you have none yet. A bare "Somewhere" mark is near-impossible to defend.
- **SEO:** ranking for "somewhere" is hopeless (lyrics, dictionary, the recruiting co.).
  You'd *always* need a qualifier in search ("somewhere flights"), which means the bare
  name does no SEO work for you.

**Verdict / recommendation:** the *concept* ("we tell you where you can afford to go") is
great and worth keeping as positioning. The *bare word* "Somewhere" is a poor standalone
brand for a €0, SEO-dependent product. **Strong recommendation: keep the spirit, fix the
mark** — either a distinctive coined name, or "Somewhere" + an ownable qualifier
(e.g. a `flysomewhere` / `gosomewhere` style lockup with a matching domain you can actually
get). WP1 runs the decision with a real name shortlist + live domain/trademark checks. You
said you like the idea and are open if we find better — WP1 is built to make that call with
evidence, not vibes.

---

## 2. Competitive analysis (summary — full detail in WP5)

| Player | Model | Strength | Gap Somewhere can exploit |
|---|---|---|---|
| **Skyscanner** | Free metasearch | "Everywhere" search, brand, scale | Generic; no *personal* "only my free dates" filter; no daily curation |
| **Google Flights / Explore** | Free, now AI deals | Map explore, price graph, default | Not curated/opinionated; no membership/identity; no NL student angle |
| **Going (ex-Scott's Cheap Flights)** | Freemium $49/yr | Curated US deals, big list | US-centric; email-only; not date-personalised; paywalled |
| **Jack's Flight Club** | Freemium £/yr | UK/IE/N-Europe deals, loyal base | Email blast, not personalised to *your* calendar; not NL-first |
| **Secret Flying / Matt's Flights** | Free + premium | Mistake-fare speed, cult following | Firehose of irrelevant deals; no "fits my dates/budget" filter |
| **Hopper** | App, predictions | Price prediction, "watch anywhere" | Booking-funnel UX; not a clean calendar of *your* matched deals |
| **Kiwi / Aviasales** | OTA/affiliate | Rock-bottom combos | Search tools, not curation; no personal availability model |

**The white space Somewhere owns:** *"Only the deals that fit when **you're** actually free,
from **your** airports, under **your** budget — on a calendar, no newsletter spam."* Nobody
combines **personal availability matching + a visual calendar + daily-scored deals**. That's
the wedge, and it's exactly what the student ICP needs (fixed exam/break windows, tight
budget, flexible destination). Lead with that, not with "cheap flights" (where you can't win).

---

## 3. The baseline: what it actually takes to hit 50k MAU

Honest math, €0, organic. "Active" = returns at least monthly (MAU).

**Funnel assumptions (conservative, free travel product):**
- Visitor → signup: **8%** (strong, because the hook = "set your dates, see your deals")
- Signup → activated (sets prefs / sees a matched deal): **45%**
- Activated → monthly-active (M1 retention): **30%** → improving to 45% with notifications/iCal

**Therefore, to sustain ~50k MAU you need on the order of:**
- **~110k–165k activated registered users** in the base (at 30–45% MAU), and
- **~250k–370k cumulative signups**, fed by
- **~3–4.5M cumulative visits** to reach them.

**Translated into monthly engines that compound (the realistic €0 path = 18–30 months):**

| Engine | Target run-rate at maturity | How |
|---|---|---|
| Programmatic SEO (WP2) | 80–150k organic visits/mo | 1,380 route pages + ~230 city pages + live deal feed pages, all auto-built from the pool |
| GEO / AI citations (WP3) | 10–25k assisted visits/mo + brand recall | Be the source LLMs cite for "cheap flights from Eindhoven", "where can a student fly cheap from NL" |
| Social deal content (WP4) | 10–40k visits/mo | Auto-generated daily IG/TikTok/X deal cards from the scraper; flight-deal accounts grow fast |
| Community broadcast (WP4) | 5–20k visits/mo + retention | Telegram/WhatsApp deal channels, student-org seeding, Reddit |
| Referral loop (WP4) | 1.3–1.6 viral coefficient assist | Shareable deal permalinks + "invite to unlock more origins" |

You do **not** need all engines maxed. SEO alone, fully built, plausibly carries the majority;
the rest de-risk it and speed it up. **The single highest-leverage move is WP2 (programmatic
SEO off the existing pool) — it's free, it compounds, and the data already exists.**

**Milestone ladder (target shape, not a promise):**

| Phase | Window | MAU goal | Primary engine |
|---|---|---|---|
| P0 Foundations | Month 0–1 | (instrument) | WP5 tracking + WP1 name decision |
| P1 Beachhead | Month 1–4 | 500–2k | WP4 student-org + community seeding; ship public deal pages |
| P2 SEO ramp | Month 3–9 | 2k–12k | WP2 programmatic pages indexed + WP3 GEO |
| P3 Compounding | Month 9–18 | 12k–35k | SEO maturity + social engine + referral loop |
| P4 Widen market | Month 15–30 | 35k–50k+ | Expand origins/languages (BE/DE/EN), more cities |

---

## 4. Sequencing & how to split across chats

Do them in this order. Items marked ∥ can run in parallel chats.

1. **WP5 (tracking) + WP1 (name)** — week 1. ∥ You can't manage what you can't measure, and
   every page/asset below bakes in the chosen name. Do these first, together.
2. **WP2 (programmatic SEO)** — the engine. Biggest build, biggest payoff. Start once name is set.
3. **WP4 (distribution)** ∥ with WP2 — community + social need no SEO and give early users + feedback.
4. **WP3 (GEO)** — after WP2 pages exist (LLMs need crawlable, structured content to cite).

```
Week 1 ─┬─ [Chat A] WP5 tracking & keyword map
        └─ [Chat B] WP1 brand/name decision
Week 2+ ─┬─ [Chat C] WP2 programmatic SEO build  (the engine)
         └─ [Chat D] WP4 distribution + social automation + referral
Week 6+ ── [Chat E] WP3 GEO / AI visibility
```

Each WP file is self-contained: context, goal, concrete tasks, acceptance criteria. Hand the
file to a fresh ultra-code session and it can execute without re-reading everything else.

---

## 5. Risks & honest caveats

- **€0 + 50k is a 1.5–2.5 year arc, not a quarter.** The plan is built to compound, not sprint.
  If a small budget opens later, WP4's paid section unlocks a faster path.
- **Programmatic SEO can be flagged as thin/doorway content** if pages aren't genuinely useful.
  WP2 mitigates with real live prices, price-history charts, and unique per-route data — not
  templated filler. This is the make-or-break quality bar.
- **Scraper dependency:** the whole engine assumes the Azair/fli pool keeps producing fresh
  data at scale. Public pages will increase load and legal/ToS exposure — WP2 covers caching,
  rate, and a "data source" stance.
- **Brand:** shipping public pages under a name you might change is wasteful — that's why
  WP1 is gated first.
- **GDPR/CAN-SPAM-equivalent:** email/notification growth must be consent-based (NL/EU). Noted in WP4.

---

## 6. What already exists in the repo that we exploit

- **The pool**: `scraper/targets.py` — 6 origins × 230 destinations, tiered A/B/C; daily scored deals in Atlas.
- **Price history**: `price_history` collection (180d TTL) → charts + "is this actually a deal" proof on pages.
- **Pages**: Explore / Calendar / **City** / Settings / Admin already exist (`frontend/app/`). City pages are a
  programmatic-SEO head start — WP2 turns them public + indexable and adds route pages.
- **Deal scoring**: 0–100 score + "% below route average" → ready-made social hooks and page headlines.
- **`buildAzairSearchUrl()`**: every deal already links out to book → natural future affiliate hook.

The build is mostly *exposing and packaging* data you already generate — which is exactly why €0 is viable.
