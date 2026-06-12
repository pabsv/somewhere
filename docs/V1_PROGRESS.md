# Somewhere v1 — Build Progress

Spec: `docs/DESIGN_V1.md` (binding contract). Last updated 2026-06-10.

## ✅ Done

### Data layer v2 (commit `a46c3a0`) + Atlas migration (run 2026-06-10)
- `python -m scripts.migrate_v2` executed against Atlas: dropped legacy `flights`
  (415), `price_history` (5177), `route_stats`, `destination_preferences`,
  `schedule_state`; set pablo `role=admin`; seeded `price_p50_ewma` on 13 targets.
- `python -m database.setup_indexes` re-run: flights down to 4 indexes (key
  unique, origin+date+price, dest+date+price, TTL last_seen 14d).
- Pool repopulating live on `pablopc` (1 route/2min, 07–23 window). ~210 flights
  within the first hour post-wipe; climbing toward ~20K steady state.

### Frontend v1 rebuild (commit `2c5126c`, tsc clean, `next build` green — 16 routes + middleware)
Built via 6 parallel agent tracks + integration, all against `docs/DESIGN_V1.md`:
- **Auth (A):** `auth.config.ts` (edge-safe) + `auth.ts` (Credentials, Mongo
  upsert), `middleware.ts` gates `/settings` + `/admin/:path*` (JWT id+role),
  `/api/auth/[...nextauth]`, login page, layout SessionProvider wiring.
- **Public APIs (B):** `lib/queries.ts` shared server layer, `/api/cities`,
  `/api/cities/[code]`, `/api/trips` (curation + density over UNFILTERED match).
- **Explore (C):** `app/page.tsx` + `components/explore/*` — DepartureBoard hero
  (FlapText), scored city grid, search/region/origin chips, sort.
- **Calendar (D):** `app/calendar/page.tsx` + `components/tripcal/*` — 6-month
  gantt, lane packing, density strip, day sheet, trip popover, mobile agenda.
- **City (E):** `app/city/[code]/page.tsx` + `components/city/*` — best-per-month
  + all trips, sparklines.
- **Settings + Admin (F):** YearPaint availability painter + prefs;
  `/api/availability`, `/api/preferences`; `/api/admin/{pool,runs,wipe}` + admin
  page (pool tiles, run feed, danger zone).
- Legacy deleted: `/deals` page+api, old calendar/deals/settings components,
  `lib/{api,auth,storage}.ts`, `types/index.ts`, non-gen data files, AuthGuard,
  `X-User-ID` admin/auth routes.

### Verified locally (dev server :4173, real Atlas data)
- `/api/cities` → 46 cities scored/tiered/baselined. `/api/trips` → 153 bars +
  187 density days, `truncated:true` (curation working).
- Gating: `/api/preferences` 401, `/api/admin/pool` 403 unauthed; `/settings` +
  `/admin` → 307 redirect to `/login?callbackUrl=`.
- Screenshots confirm design system: Solari board hero, split-flap codes, steal
  (green) / deal (yellow) / fair (plain) FareTags, yellow scarcity respected.

### Vercel
- Project `flight-scraper` linked. `AUTH_SECRET` + `AUTH_TRUST_HOST` set on
  Production (+ AUTH_SECRET on Development). `MONGODB_URI` already present.
- Preview deployment built READY (`vercel` CLI). Preview URL is SSO-protected
  (project Deployment Protection) → 401 for anonymous; owner can view logged in.

## ⬜ Left to do
1. **Production promotion** (`vercel deploy --prod` or promote the preview) →
   clean public test URL `https://fly-somewhere.vercel.app`. BLOCKED on explicit
   user approval (safety classifier flags prod deploys).
2. **Push to GitHub master** — committed locally as `2c5126c`. Holding because a
   push may trigger Vercel's GitHub auto-deploy to production. Push together with
   (1) once approved.
3. Preview env: `AUTH_SECRET`/`AUTH_TRUST_HOST` not set on Preview env (CLI wants
   an interactive git-branch prompt). Only matters if testing via preview URLs.
4. Optional polish from spec not yet eyeballed in-browser at desktop width: the
   calendar **gantt** view (preview harness forced agenda/mobile mode); confirm
   on a real >768px browser.

## Known facts for next session
- Multiple lockfiles warning: stray `C:\Users\20231423\package-lock.json` makes
  Next infer the wrong workspace root. Harmless; silence by removing it or setting
  `turbopack.root`.
- `frontend/.env.local` holds `MONGODB_URI` + `AUTH_SECRET` + `AUTH_TRUST_HOST`
  (gitignored). AUTH_SECRET also on Vercel Production.
- `.claude/` and `scratch_*.py` now gitignored.
- Scoring lives only in `frontend/lib/score.ts` (thresholds 85/35/68). Baselines
  seeded as `avg*1.3` so early cold data reads very "below typical" — expected.
