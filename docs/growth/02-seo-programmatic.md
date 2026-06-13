# WP2 — Programmatic SEO (the growth engine)

> **Goal:** Turn the existing scraped deal pool into thousands of genuinely useful, indexable,
> public pages so Somewhere ranks for long-tail flight queries — for free, compounding monthly.
> **This is the single highest-leverage work package.** Target at maturity: 80–150k organic visits/mo.
> **Read first:** `00-OVERVIEW.md §3, §6` · **Depends on:** WP1 (final name/domain), WP5 (tracking live).

## Why this works
OTAs dominate "flights from X to Y" because they generate a crawlable landing page for **every
city pair**. Somewhere already *generates the data* for 1,380 routes daily, with price history
and deal scores — competitors template filler; you have **real live prices + proof it's a deal**.
That's the quality moat that keeps these pages from being flagged as thin/doorway content.

## The page architecture (all public, indexed, SSR/ISR)

1. **Route pages** — `/vluchten/eindhoven/barcelona` (NL) + `/flights/eindhoven/barcelona` (EN).
   ~1,380 × 2 langs. Content: current cheapest deal, deal score, price-history sparkline (you
   have `price_history`), typical price band, best months, "fits these free-date windows" CTA,
   direct book link (`buildAzairSearchUrl`). **Unique data per page = not thin.**
2. **City / destination pages** — `/bestemmingen/barcelona`. ~230. "Cheapest flights to Barcelona
   from EIN/AMS/BRU/DUS/NRN/CRL right now", monthly price calendar, when-to-go.
   *(Promote the existing `app/city/` pages to public + indexable — head start.)*
3. **Origin hubs** — `/vanaf/eindhoven`. 6 pages. "Where can you fly cheap from Eindhoven this
   month" — a ranked live deal board. Strong for the student "from my airport" intent.
4. **"Where can I go for €X" pages** — `/onder-100-euro`, `/weekendje-weg-onder-150`. Budget +
   trip-length landers — exactly the flexible-destination intent the ICP searches.
5. **Deal feed / permalink pages** — `/deal/<id>` — one shareable URL per live deal. Feeds WP4
   social + community posts; the share target for the referral loop.

## Tasks

1. **Decide rendering**: Next.js App Router — use **ISR** (revalidate ~6–24h) so pages are static-fast
   but refresh as the pool updates. Generate via `generateStaticParams` from `scrape_targets` (route/city
   lists) — the route universe already lives in `scraper/targets.py` / `scrape_targets`.
2. **Build the route page template** (`app/(public)/flights/[origin]/[dest]/page.tsx`):
   live cheapest deal, price sparkline from `price_history`, deal-score badge, "best months" from
   history, internal links to the city page + sibling routes, hard CTA to sign up ("see this on your
   calendar"). NL + EN variants (`/vluchten/...` + `/flights/...`).
3. **Build city + origin-hub + budget templates** (reuse the route data layer).
4. **Internal linking mesh**: every route page links to its city, origin hub, and 4–6 sibling routes;
   city pages link to all origins; hubs link to top routes. This is what gets the long tail crawled.
5. **Technical SEO foundation:**
   - Dynamic `sitemap.xml` (split, <50k URLs each) generated from the pool + `robots.txt`.
   - `<title>`/meta/canonical per page; hreflang for nl/en.
   - **JSON-LD structured data** (`Flight`, `Offer`, `AggregateOffer`, `FAQPage`, `BreadcrumbList`) —
     *also* the foundation for WP3 GEO.
   - Core Web Vitals: ISR + image discipline; keep pages light.
   - **Bing Webmaster Tools** submission (non-negotiable — it's how ChatGPT search finds you; see WP3) +
     Google Search Console.
6. **Quality / anti-thin guardrails:**
   - Only publish a route page if it has real recent data (≥N price points); otherwise `noindex` until it does.
   - Each page must carry ≥1 unique data element (live price, history chart, best-month stat) — no pure templates.
   - Add genuinely useful copy blocks (when's cheapest, baggage note, nearby-airport tip) — short, real, NL/EN.
7. **Freshness signals**: show "updated <date>", surface today's movers. Fresh travel data = recrawl magnet.
8. **Scale staging**: ship origin hubs + top-tier-A routes first (~168 routes), index, watch GSC, then
   roll out B/C tiers. Avoid dumping 3k thin pages on day one.

## Acceptance criteria
- Route + city + origin-hub templates live behind public URLs, NL + EN, ISR working.
- `sitemap.xml` + `robots.txt` generated from the pool; submitted to GSC **and** Bing.
- Valid JSON-LD on route/city pages (test in Google Rich Results + schema validator).
- Tier-A routes indexed (verify in GSC coverage) before B/C rollout.
- Lighthouse SEO ≥95, CWV green on a sample route page.

## Risks / notes
- **Thin-content / doorway penalty is the #1 risk** — the unique live-data + history requirement is the mitigation. If a page has nothing real, `noindex` it.
- Public pages raise scraper load + ToS exposure (Azair). Serve from **cached Atlas data**, never scrape on request; add a short "data & sources" page describing the stance.
- Don't expose anything that breaks the affiliate/booking deep-link or leaks PII.
