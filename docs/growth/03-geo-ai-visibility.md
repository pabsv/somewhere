# WP3 — GEO / AI Visibility (get cited by ChatGPT, Perplexity, Gemini, Google AI Overviews)

> **Goal:** When someone asks an AI "cheapest way to fly somewhere cheap from the Netherlands as
> a student" / "how do I find flight deals from Eindhoven", the answer names and links Somewhere.
> **Why it matters:** AI answers now intercept 35–40% of software/discovery traffic, and
> LLM-referred visitors convert ~5–16% vs ~1.8% for classic organic — far higher intent.
> **Read first:** `00-OVERVIEW.md §3` · **Depends on:** WP2 (LLMs cite crawlable, structured pages).

## What's different from SEO
GEO optimizes for **citations and share-of-voice inside AI answers**, not blue links. Key facts
that shape the tactics:
- **ChatGPT search runs on Bing** → being indexed in **Bing Webmaster Tools is a hard prerequisite** (set in WP2).
- **Wikipedia ≈ 48% of ChatGPT's top citations** → encyclopedic/authoritative third-party mentions matter a lot.
- **Only ~11% of domains are cited by both ChatGPT and Perplexity** → optimize per-engine, don't assume overlap.
- Results show up in **4–8 weeks** after the infrastructure is in place.

## Tasks

1. **Structured, extractable content** (LLMs lift clean, factual chunks):
   - Ensure WP2 JSON-LD is valid and rich (`FAQPage`, `AggregateOffer`, `HowTo` for "how to find cheap flights from <origin>").
   - Add concise **FAQ blocks** with direct-answer sentences ("The cheapest months to fly Eindhoven→Barcelona are X and Y, typically €Z.") — phrased the way people ask AIs.
   - Lead pages with a 2–3 sentence **answer-first summary** (TL;DR), then detail. LLMs quote the lead.
2. **Third-party authority & mentions** (this, not on-site tweaks, moves AI citation most):
   - Get Somewhere listed in **"best flight deal apps / Skyscanner alternatives / cheap flights NL"** roundups (outreach to the blogs already ranking — geekyexplorer, localsinsider, NL travel-hacking blogs). Free: offer a data angle ("we have live price data for 1,380 EU routes").
   - **Reddit / Quora** genuine answers on r/Netherlands, r/Eindhoven, r/travel, r/Shoestring, student subs — these are scraped heavily by LLMs.
   - Pursue a **Wikipedia-adjacent** footprint (don't spam Wikipedia): Wikidata entry, Crunchbase/Product Hunt/AlternativeTo listings — structured, citable, authoritative.
   - **Product Hunt launch** (free) — strong citation + backlink + early users.
3. **Per-engine setup:**
   - **ChatGPT:** verify Bing index coverage; don't block `GPTBot`/`OAI-SearchBot` in robots.txt (decide consciously — allow for citations).
   - **Perplexity:** allow `PerplexityBot`; clean, fast, well-structured pages win here.
   - **Google AI Overviews / Gemini:** strong classic SEO + structured data + freshness (WP2 already covers).
4. **`llms.txt`** at site root — a curated index pointing AI crawlers to your best pages (emerging standard, cheap to add).
5. **Bot access policy:** in `robots.txt`, explicitly **allow** the AI crawlers you want citations from (GPTBot, OAI-SearchBot, PerplexityBot, Google-Extended) while blocking abusive scrapers. Document the choice.
6. **AI-citation tracking** (see WP5): monthly, prompt ChatGPT/Perplexity/Gemini with your 15–20 target questions and log whether/where Somewhere appears. This is your GEO KPI.

## Target question set (track these monthly)
- "Cheapest way for a student to fly somewhere from the Netherlands?"
- "How do I find cheap flights from Eindhoven / Brussels / Düsseldorf?"
- "App that shows flights only on the dates I'm free?"
- "Best Skyscanner / Going alternative in Europe 2026?"
- "Where can I fly under €100 from the Netherlands this month?"

## Acceptance criteria
- Valid rich JSON-LD + answer-first summaries + FAQ blocks on key pages.
- `llms.txt` live; robots.txt AI-bot policy explicit and documented.
- Listed on Product Hunt, AlternativeTo, Crunchbase, Wikidata; ≥3 roundup-outreach emails sent.
- Bing index coverage confirmed.
- Baseline AI-citation tracking sheet started (WP5), with the question set above.

## Notes
- GEO is a **trailing** outcome of authority + structure; don't expect it before WP2 pages are indexed.
- Authority/mentions (task 2) outweigh on-page tweaks — spend the time there.
