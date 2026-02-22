# Frontend TODO

## Design Philosophy

- **Simple, timeless, professional** - no trends that age poorly
- **Intuitive** - users know what to do without thinking
- **No fluff** - every element earns its place
- **No AI aesthetic** - no gradients, excessive emojis, rounded-everything boxes
- **Dense but readable** - show information efficiently
- **Monochrome with purpose** - color only when it communicates something

---

## Page Structure

### 1. `/` - Deals Calendar (Main Page)
The homepage shows **flight deals on a calendar**. Users see their availability windows and which dates have deals. This is the primary output view.

- 2-month calendar view (current + next month)
- Days with deals are marked (dot or highlight)
- Click a day to see deals for that date range
- User's availability windows shown as subtle background highlights
- Quick stats: "12 deals found in your windows"

### 2. `/deals` - Deals List/Dashboard
Alternative view of the same data in list/card format.

- Compact deal cards (not oversized)
- Smart filters: origin, destination, price range, direct only, date range
- Sort: price, deal score, departure date
- No pagination initially (load ~50, scroll)
- Quick actions: click to open Azair booking link

### 3. `/settings` - User Preferences
Where users configure their search criteria. This is the INPUT page.

**Section A: Availability (Calendar)**
- 2-month calendar view
- Click & drag to select date ranges
- Multiple windows allowed
- No list of ranges shown below - the calendar IS the visual representation
- Clear button to reset

**Section B: Departure Airports**
- Select home airport from dropdown
- Auto-suggest nearby airports (within ~200km)
- Toggle nearby airports on/off
- Show distance/drive time if useful

**Section C: Destinations**
- Grouped by region (Southern Europe, Eastern Europe, etc.)
- Multi-select chips
- "Select all" / "Clear" per group
- Search/filter destinations

**Section D: Trip Preferences**
- Min/max trip length (days)
- Max price threshold
- Direct flights only toggle

---

## Component Architecture

```
components/
├── calendar/
│   ├── MonthGrid.tsx        # Single month grid
│   ├── DayCell.tsx          # Individual day (handles clicks, states)
│   └── CalendarNav.tsx      # Month navigation arrows
├── deals/
│   ├── DealCard.tsx         # Compact deal display
│   ├── DealFilters.tsx      # Filter controls
│   └── DealCalendarDay.tsx  # Day cell with deal indicators
├── settings/
│   ├── AirportSelector.tsx  # Home + nearby airports
│   ├── DestinationPicker.tsx # Grouped destination selection
│   └── TripPreferences.tsx  # Days, price, direct toggle
├── ui/
│   ├── Button.tsx           # Consistent button styles
│   ├── Chip.tsx             # Selectable chip/tag
│   ├── Input.tsx            # Form inputs
│   └── Select.tsx           # Dropdown select
└── layout/
    └── Navigation.tsx       # Top nav bar
```

---

## Mock Data Structure

Create `/data/` folder with JSON files matching backend format:

### `data/mock-deals.ts`
```typescript
export const mockDeals: Deal[] = [
  {
    id: "ein-bcn-2026-03-15",
    origin: "EIN",
    destination: "BCN",
    destination_city: "Barcelona",
    outbound_date: "2026-03-15",
    return_date: "2026-03-19",
    price: 89,
    airline: "Ryanair",
    is_direct: true,
    deal_score: 85,
    is_hot_deal: true,
    azair_link: "https://azair.eu/..."
  },
  // ... more deals
]
```

### `data/mock-user.ts`
```typescript
export const mockUser: UserPreferences = {
  home_airport: "EIN",
  nearby_airports: ["AMS", "BRU", "DUS"],
  destinations: ["BCN", "LIS", "ATH", "BUD", "RAK"],
  availability: [
    { start: "2026-03-01", end: "2026-03-15", label: "Spring break" },
    { start: "2026-04-25", end: "2026-05-05", label: "May holiday" },
  ],
  min_days: 2,
  max_days: 7,
  max_price: 150,
  direct_only: false,
}
```

### `data/airports.ts`
```typescript
export const airports = [
  { code: "EIN", name: "Eindhoven", country: "NL", lat: 51.45, lng: 5.37 },
  { code: "AMS", name: "Amsterdam Schiphol", country: "NL", lat: 52.31, lng: 4.76 },
  // ...
]

export const nearbyAirports: Record<string, string[]> = {
  "EIN": ["AMS", "BRU", "DUS", "CGN"],
  "AMS": ["EIN", "RTM", "BRU"],
  // ...
}
```

---

## Task List

### Phase 1: Data & Structure
- [ ] Create `/data/` folder with mock data files
- [ ] Define TypeScript types (`types/index.ts`)
- [ ] Create user preferences context/store (localStorage for now)

### Phase 2: Core Components
- [ ] Build `MonthGrid` component (2-month capable)
- [ ] Build `DayCell` component (multiple states: empty, available, has-deals, selected)
- [ ] Build `DealCard` component (compact, information-dense)
- [ ] Build reusable UI components (Button, Chip, Input, Select)

### Phase 3: Settings Page (Input)
- [ ] Rebuild calendar with 2-month view, no list below
- [ ] Build `AirportSelector` with nearby suggestions
- [ ] Rebuild `DestinationPicker` with regions and search
- [ ] Build `TripPreferences` section
- [ ] Wire up localStorage persistence

### Phase 4: Main Page - Deals Calendar (Output)
- [ ] Create calendar view showing deals
- [ ] Show availability windows as background color
- [ ] Click day to see deals starting that day
- [ ] Quick stats header

### Phase 5: Deals Dashboard (Output)
- [ ] Redesign deal cards (compact, clean)
- [ ] Better filter UI (inline, not bulky)
- [ ] Add date range filter
- [ ] Add destination filter
- [ ] Sort controls

### Phase 6: Polish
- [ ] Consistent spacing system
- [ ] Typography hierarchy
- [ ] Hover/focus states
- [ ] Loading states (for future API)
- [ ] Empty states
- [ ] Mobile responsive

---

## UI Guidelines

### Colors
- **Background**: White (`#fff`) or very light gray (`#fafafa`)
- **Text**: Near-black (`#111`) for primary, gray (`#666`) for secondary
- **Accent**: Single blue (`#2563eb`) for interactive elements
- **Deals**: Subtle green or orange for hot deals - don't overdo it
- **Borders**: Light gray (`#e5e5e5`)

### Typography
- **Font**: System font stack (fast, native feel)
- **Sizes**: 14px base, 12px small, 16px headings, 20px page titles
- **Weight**: 400 normal, 500 medium, 600 semibold

### Spacing
- **Base unit**: 4px
- **Common**: 8px, 12px, 16px, 24px, 32px
- **Consistent padding**: 16px for cards, 24px for sections

### Components
- **Buttons**: Subtle, not oversized. Primary = filled, Secondary = outline
- **Cards**: Thin border, minimal shadow (or none), square or barely rounded corners
- **Inputs**: Simple border, no fancy focus rings
- **Icons**: Minimal, functional, not decorative

---

## File Structure Target

```
frontend/
├── app/
│   ├── page.tsx              # Deals calendar (main)
│   ├── deals/page.tsx        # Deals dashboard
│   ├── settings/page.tsx     # User preferences
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── calendar/
│   ├── deals/
│   ├── settings/
│   ├── ui/
│   └── layout/
├── data/
│   ├── mock-deals.ts
│   ├── mock-user.ts
│   ├── airports.ts
│   └── destinations.ts
├── types/
│   └── index.ts
├── lib/
│   └── storage.ts            # localStorage helpers
└── TODO.md
```
