# Frontend → Backend Connections TODO

All items below are implemented. Delete this file when the real API is connected and verified.

---

## ✅ 1. `lib/api.ts` abstraction layer
Created. Pages import `getDeals()`, `getPreferences()`, `savePreferences()` from here.
Set `USE_MOCK = false` and `NEXT_PUBLIC_API_URL` to connect to the real API.

## ✅ 2. Field mismatch: `airline` vs `airlines`
Resolved in `transformFlight()` inside `lib/api.ts`.
Backend `airlines: string[]` → frontend `airline: string` via `.join(", ")`.

## ✅ 3. Missing `destination_city`
Resolved in `transformFlight()`: looks up `destination` code in `data/destinations.ts`,
falls back to the IATA code if not found.

## ✅ 4. `Deal.id` → backend `flight_key`
Resolved in `transformFlight()`: `id = f.flight_key`.

## ✅ 5. Date parsing bug in `DealCard.tsx`
Fixed. Uses `parseLocalDate()` (same pattern as `DealsCalendar.tsx`) instead of `new Date(str)`.

## ✅ 6. User availability not shown on main calendar
`app/page.tsx` loads `getPreferences()` alongside deals and passes `availability` to
`DealsCalendar` as `availabilityWindows`. Future dates inside a window get a `bg-blue-50` tint.

## ✅ 7. Dynamic color system
`data/colors.ts` now uses a polynomial hash on the IATA code → 16-color palette.
Deterministic, stateless, scales to all 57 destinations. Same function signatures.

## ✅ 8. Loading and empty states
Added to `app/page.tsx` and `app/deals/page.tsx`. Minimal per design philosophy.

## ✅ 9. Settings: individual availability range removal
`app/settings/page.tsx` shows compact chips below the calendar (date range + ×).
Uses the `label` field if set, otherwise formats the date range.
