# Somewhere v1 — Build Progress

Session date: 2026-06-10. Spec: `docs/DESIGN_V1.md` (binding contract for all work below).

## ✅ Done

### Deploy / infra
- Pool scheduler live on Linux box `pablopc` (Tailscale 100.101.234.37) as systemd `flight-scraper.service` (Nice=10/CPUWeight=20 — DormSpot keeps priority), daily 07:10 restart timer, 07:00–23:00 active window. Runbook `deploy/DEPLOY.md`.
- Box is a real git clone of `pabsv/flight-scraper` tracking origin/master. Deploy = push → `ssh pablo@100.101.234.37 'cd /mnt/hdd/flight-scraper && git pull'` → `sudo systemctl restart flight-scraper`.
- Box running data-layer v2 code (verified: writes new-format docs, e.g. `EIN-REU` slot, `price_points` present).

### Python data layer v2 (commit `a46c3a0`, verified end-to-end against Atlas)
- `flight_key` = origin-dest-out-ret (price removed) → price updates in place, no phantom docs.
- Batch dedupe by key keeping cheapest before upsert (fli duplicate itineraries).
- Embedded `price_points` [{p, at}] — append only on price change, cap 20 (aggregation-pipeline update).
- `price_p50_ewma` (EWMA of run median) added to scrape_targets — honest "typical price" baseline. avg_price (cheapest EWMA) + min_price_seen kept.
- Price sanity guard (drop ≤€5 / >€3000). Deal scoring REMOVED from Python — lives only in `frontend/lib/score.ts`.
- flights indexes 11 → 4 (key unique, origin+date+price, dest+date+price, TTL last_seen 14d). price_history/route_stats index blocks deleted.
- `scripts/migrate_v2.py` created (wipe old collections, set roles, seed p50) — **NOT RUN YET** (needs user approval, see below).
- `scripts/export_destinations.py` → generates `frontend/data/{destinations,airports}.gen.ts` (230 dests + 4 origins) from `scraper/targets.py`.

### Frontend foundation (commit `a46c3a0`, tsc clean)
- Design tokens in `globals.css` @theme: paper/ink/night/wayfinding-yellow/steal-green, fonts Bricolage Grotesque + Instrument Sans + Spline Sans Mono (`app/fonts.ts`).
- Signature components: `components/board/FlapText.tsx` (split-flap animation) + `DepartureBoard.tsx` (Solari hero shell).
- UI primitives: FareTag (price atom w/ steal/deal/fair tiers), Badge, Chip, Sheet, Spark (sparkline).
- Contract layer: `types/api.ts` (zod schemas — FlightDoc, Trip, CitySummary, Preferences…), `lib/score.ts` (read-time scoring + tests), `lib/baselines.ts`, `lib/trips.ts` (toTrip/dedupe/density), `lib/lanes.ts` (score-first lane packing), `lib/format.ts`, `lib/client.ts` (typed fetchers), `lib/searchUrl.ts`, `lib/useOrigins.ts` (?from= URL state).
- New layout + Navigation (wordmark "Somewhere", session-prop ready). Deps added: next-auth@5 beta, zod v4.

### Decisions taken (designed via 3-proposal judge panel)
- IA: `/` Explore (city grid + board hero) · `/calendar` (gantt + density) · `/city/[code]` · `/settings` · `/login` · `/admin`. `/deals` page dies.
- Public browse-first: no login wall on read pages; middleware gates only /settings + /admin.
- Auth: NextAuth v5 credentials (email+name, no password v1), JWT, role field for admin.
- 70% rule killed → explicit trip min/max nights preference.

## 🔄 In flight (phase 2 workflow `wn3uynjb6` / run `wf_c05c7d37-325` — was building when session paused)
Six parallel tracks (files per `docs/DESIGN_V1.md` section ownership in phase-2 workflow script):
- A: auth.ts, middleware, [...nextauth], /api/availability, /api/preferences, /api/admin/{pool,runs,wipe}, login page, layout session wiring, legacy auth/admin API deletion.
- B: /api/cities, /api/cities/[code], /api/trips + lib/queries.ts.
- C: Explore page + components/explore/*.
- D: Calendar page + components/tripcal/*.
- E: City detail page + components/city/*.
- F: Settings (YearPaint availability painter + prefs) + Admin rebuild.
- Then: integration check agent (tsc + next build + legacy deletion). **Status unknown — check files on disk / git status before redoing. Resume: re-run workflow script with resumeFromRunId wf_c05c7d37-325 (cached agents return instantly).**

## ⬜ Left to do
1. **Run `python -m scripts.migrate_v2`** — drops old-format flights (269 docs), price_history (5177), route_stats, destination_preferences, schedule_state; sets pablo role=admin; seeds p50 baselines pool-wide. BLOCKED on explicit user approval (classifier). Then re-run `python -m database.setup_indexes`.
2. Phase 2 completion check: tsc clean + `npm run build` green; delete legacy (app/deals, components/deals, components/calendar old, components/settings old, lib/{api,auth,storage}.ts, types/index.ts, data/{airports,destinations}.ts non-gen, AuthGuard).
3. Phase 3: code-review workflow over full diff (bugs + design-language consistency), fixes.
4. Browser verify: dev server (`cd frontend && npm run dev`, port 4173) — login flow, explore grid, calendar lanes, city page, settings save, admin tiles.
5. Vercel: set `AUTH_SECRET` env (in frontend/.env.local, NOT yet on Vercel), deploy, smoke test prod.
6. Commit + push everything; update `claude.md` status table + `ARCHITECTURE.md`.
7. Update memory file (`flight-scraper-linux-deploy.md`) if box state changes.

## Known facts for next session
- Atlas: mixed-format flights until migrate runs (old docs TTL out by ~2026-06-24 regardless).
- Pool: 920 routes enabled, repopulating at 1 route/2min in window (~2 days to full coverage).
- Vercel project exists (frontend deployed pre-v1) but repo not linked locally — deploy via Vercel dashboard/GitHub integration or `vercel link` first.
- AUTH_SECRET generated in `frontend/.env.local` by track A (if it completed).
- User settings now allow git push to master for this repo (standing pre-approval added by user).
