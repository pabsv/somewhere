# WP1 — Brand & Naming Decision

> **Goal:** Make an evidence-based call on the name, then lock positioning, tagline, and the
> domain/handles to register. Everything downstream (pages, social handles, GEO) bakes in this
> choice — so this is gated **first**.
> **Read first:** `00-OVERVIEW.md §1` (brand analysis summary).

## Context / the problem with "Somewhere"

- `somewhere.com` = a funded global recruiting marketplace (ex-*Shepherd*). The .com is gone and it owns the SERP for the bare word.
- The word is generic (dictionary/lyrics) → un-rankable alone, weak/undefendable trademark in travel.
- The concept space is crowded with near-synonyms: KAYAK **Anywhere**, Skyscanner **Everywhere**, an **AnywhereFlight** app, Hopper "anywhere" watches.
- **But** the *idea* ("we tell you where you can afford to go, when you're free") is strong and Pablo likes it. So: **keep the spirit, fix the mark.**

## Decision framework — pick ONE of three paths

1. **Keep "Somewhere" + ownable qualifier** (e.g. a `flysomewhere` / `gosomewhere` / `somewhere.app` style lockup).
   Pros: keeps the idea Pablo likes. Cons: still semantically generic; SEO mostly carried by the qualifier.
2. **Distinctive coined/twisted name** (invented or unexpected real word). Pros: rankable, trademark-able, ownable .com possible. Cons: needs brand-building from zero.
3. **Keep "Somewhere" as-is.** Only if domain + handle situation turns out workable and Pablo insists. Plan works around it.

**Recommendation going in:** lean toward **path 1 or 2**. Decide with the data the tasks below produce.

## Tasks

1. **Generate a shortlist of 12–15 candidate names** across two buckets:
   - *Somewhere-family*: FlySomewhere, GoSomewhere, Somewhere.app, SomewhereCheap, Elsewhere, Someplace, Anywhereish, etc.
   - *Distinctive*: short, travel-evocative, brandable coined words (2–3 syllables, easy to spell/say in NL + EN). Avoid trademark-heavy roots ("jet", "sky", "go", "trip", "fly" are crowded — check each).
2. **For each candidate, check availability (do this for real, don't assume):**
   - Domain: `.com`, `.app`, `.nl`, `.eu` — via WebFetch to a registrar/whois or `WebSearch` "<name> domain available". Record what's actually buyable and rough price.
   - App handles: Instagram, TikTok, X, Telegram channel name.
   - Trademark collision: EUIPO eSearch plus (https://www.tmdn.org / euipo.europa.eu) and BOIP (Benelux, boip.int) for classes **39** (travel/transport), **9** (software/app), **42** (SaaS). WebSearch the name + "trademark travel".
   - SERP collision: search the bare name — is page 1 ownable or owned by a big incumbent?
3. **Score each** in a table: brandability /5, NL+EN pronounceability /5, domain gettable (Y/N + which TLD), trademark risk (low/med/high), SEO ownability /5. Recommend the top 2.
4. **Lock positioning** (regardless of name):
   - One-line positioning: *"The only flight-deal app that shows just the trips that fit when you're free, from your airports, under your budget — on a calendar, no spam."*
   - ICP: students with fixed break/exam windows + tight budget + flexible destination.
   - 3 taglines (NL + EN), e.g. EN: *"Where can you afford to go?"* · NL: *"Waar kun je heen?"*
   - Anti-positioning: not a metasearch, not a newsletter firehose.
5. **Visual identity stub** (cheap/€0): pick primary color + font already in the `departure-board` design system (claude.md references it), define logo wordmark direction. Don't over-invest pre-traction.
6. **Output a `BRAND.md`** at repo root with: chosen name + rationale, positioning, taglines, voice, the domains/handles to register (with a checklist), and trademark stance.

## Acceptance criteria
- A filled scoring table for ≥12 names with **real** availability data (not guesses).
- A clear recommendation with a fallback.
- `BRAND.md` committed.
- A "register these now" checklist (domain + 4 social handles) for the chosen name.

## Notes / guardrails
- If the recommendation is to rename, **do not** start renaming code/repo in this chat — just produce the decision + `BRAND.md`. Renaming is a separate, mechanical follow-up once Pablo signs off.
- Verify domains/trademarks live — naming on stale assumptions is the classic failure here.
