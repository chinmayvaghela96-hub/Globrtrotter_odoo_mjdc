# GlobeTrotter

Multi-city travel planning — build an itinerary, watch the budget, share the plan.
Odoo hackathon submission.

**Demo account:** `demo@globetrotter.app` / `demo1234`
**Admin account:** `admin@globetrotter.app` / `demo1234`
**Public share link:** `/t/sea-loop-demo`

---

## Run it

Three commands from a fresh clone produce an identical database.

```bash
npm install
docker compose up -d          # local Postgres on :5433
npx prisma migrate deploy     # replays committed migrations, in order
npm run db:seed               # idempotent — safe to run repeatedly
npm run dev
```

For a hosted database (Neon, Supabase), replace `DATABASE_URL` and `DIRECT_URL`
in `.env` and skip `docker compose`. Nothing else changes.
`DIRECT_URL` must point at the **non-pooled** host or `prisma migrate` will hang.

Copy `.env.example` to `.env` to start. Every variable is documented there;
`.env` itself is gitignored and `.env.example` holds no secrets.

### Maps are optional

The city map works with **no API key**. Leave `MAP_API_KEY` unset and
`/cities/[id]` plots the stored coordinates itself — real positions, correct
distances, no network call. Set a key to get real cartography:

```bash
MAP_PROVIDER="maptiler"   # or "mapbox"
MAP_API_KEY="..."
```

The variable is deliberately **not** `NEXT_PUBLIC_`. Pages request maps through
`/api/map/static`, which injects the key server-side, so it never reaches the
browser.

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run db:migrate` | Create and apply a new migration |
| `npm run db:deploy` | Apply committed migrations (CI / fresh clone) |
| `npm run db:seed` | Seed the catalogue, users, and demo trip |
| `npm run db:reset` | Drop, re-migrate, re-seed |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest — 131 tests |
| `npm run smoke` | HTTP smoke test against a running dev server |

`npm run smoke` mints a real session cookie with the app's own secret and
fetches every page in the demo path, asserting the content actually rendered —
including a request for another user's trip, which must come back `404`. It
catches the class of failure a unit test cannot: a page that typechecks but
throws at request time.

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 ·
PostgreSQL · Zod · Vitest · **@dnd-kit/core** · **@dnd-kit/sortable**

There is no REST layer. Server Components read the database directly and
Server Actions write to it, so authentication, validation, and error shaping
all happen at one choke point instead of three.

---

## Trip planning features (Prompt 2)

### Trip templates
On `/trips/new` a collapsible gallery lists five ready-made itineraries
(Southeast Asia Loop, Europe Highlights, Japan Rail, Golden Triangle India,
Australia East Coast). Selecting one and pressing **Create from template**
calls `src/actions/template.ts` → `createTripFromTemplate`, which atomically
creates the Trip row and appends Stops via `lib/stop-order.ts`, then redirects
to the builder. City names that don't match the catalogue are silently skipped.

### Itinerary view (list + calendar)
`/trips/[id]` now renders `src/components/trip/itinerary-view.tsx`, which
exposes a **List / Calendar** toggle in the top-left corner:

- **List** — day-wise timeline per city, with activity time, duration, cost,
  and drag handles for reordering.
- **Calendar** — a responsive grid card per day showing the city and a compact
  activity preview.

### Drag-and-drop reordering
Implemented with `@dnd-kit/core` and `@dnd-kit/sortable`:

| Where | Component | Persists via |
|---|---|---|
| Builder: city stops | `sortable-stop-list.tsx` | `moveStop` server action |
| Itinerary: activities within a day | `sortable-activity-list.tsx` | `moveTripActivity` server action |

Both expose keyboard arrow buttons as a fallback for users who cannot or prefer
not to use drag.

### Schedule hints
After each activity list, `schedule-hints.tsx` inspects start times and flags:
- 🔴 **Conflicts** — two activities whose time windows overlap
- 🟡 **Gaps** — idle stretches > 3 hours between consecutive activities
- 🔵 **Ordering** — a later start-time appearing before an earlier one in the
  list order

Hints update immediately after every drag without a server round-trip.

### "Glimpse of the trip" animation
The trip layout header cycles through city names with a smooth fade-transition
via `src/components/trip/trip-glimpse.tsx`. When
`prefers-reduced-motion: reduce` is set, it renders a static comma-separated
list instead.

### "Read more / Show less"
Long trip descriptions are truncated at 140 characters with an accessible
toggle via `src/components/trip/read-more.tsx`.

---

## How correctness is enforced

### Authorization lives in the `where` clause

Every scoped query filters on ownership inside the query, never in an `if`
after the fetch:

```ts
const trip = await prisma.trip.findFirst({
  where: { id: tripId, userId: user.id },   // the entire check
})
if (!trip) notFound()
```

There is no window in which an unauthorized row exists in memory, and no
branch anyone can forget to write. Nested resources walk the relation in the
same query — `requireStopOwner` filters on `trip: { userId }`, because a stop
id is not a trip id.

Every failure is `notFound()`, never `403`. A 403 confirms the id exists,
which is itself a disclosure.

See [`src/lib/guard.ts`](src/lib/guard.ts).

### Every action goes through one wrapper

[`src/lib/action.ts`](src/lib/action.ts) authenticates, then validates with
Zod, then runs the handler. It returns an
[`ActionResult`](src/lib/result.ts) — a discriminated union — rather than
throwing, so a failure is a value the form can render and no Prisma message
ever reaches the client.

It rethrows `redirect()` and `notFound()` signals, which Next raises as tagged
errors: a blanket `catch` would silently break navigation.

A handler rejects a **business rule** — a stop dated outside its trip, an
activity that does not belong to the stop's city — by throwing `Rejected`
(usually via `rejectField(field, message)`), not by returning `fail(...)`.
The wrapper's job is to wrap whatever the handler returns in `ok(...)`, so a
returned failure came back as `{ ok: true, data: { ok: false } }` and the form
read a rejection as a success. Throwing is unambiguous, and the wrapper turns
it straight back into a value — callers still never see an exception.
`tests/action.test.ts` covers this, and fails if the handling is removed.

### Multi-row writes are transactions

Reorder renumbers the whole sibling list inside one `$transaction`, restoring
the `0..n-1` invariant unconditionally. `Stop` therefore uses `@@index`, not
`@@unique`, on `[tripId, orderIndex]` — Postgres validates a unique constraint
per statement and would trip on the intermediate state, and Prisma cannot
declare it `DEFERRABLE`. The invariant is held by the transaction and proved
by a test.

`toggleShare` is deliberately *not* wrapped: a single-row update is already
atomic, and a transaction there would be noise.

### Errors have five defined rungs

| Rung | Failure | Surface |
| --- | --- | --- |
| 1 | Invalid field | Inline, under the input |
| 2 | Action rejected | Banner above the form, values preserved |
| 3 | Route data failed | `error.tsx`, shell and nav survive |
| 4 | Missing **or not yours** | `not-found.tsx` — deliberately identical |
| 5 | Root crash | `global-error.tsx` |

### Sign-in returns you to where you were

The middleware records the page an anonymous visitor was turned away from as
`?next=/trips/abc`, and the form sends it back so sign-in lands there instead
of always on the dashboard.

That value comes from the URL, so anyone can set it — a link to our own login
page carrying `?next=https://evil.example` would otherwise make us a
convincing hop to somebody else's site. Every target goes through
[`safeRedirect`](src/lib/safe-redirect.ts), which accepts only a
site-relative path: absolute URLs, protocol-relative `//host`, non-path
schemes, anything absolute after decoding, and embedded control characters are
all rejected to the dashboard. The pages filter it a second time so a hostile
value is never echoed into the page source either.
`tests/safe-redirect.test.ts` covers each case.

### Dates are calendar days, never instants

`@db.Date` stores no time and no zone. Building a `Date` from local parts at
UTC+5:30 lands at 18:30 UTC the previous day, and Postgres truncates it — so a
trip silently starts a day early. Every date goes through
[`src/lib/dates.ts`](src/lib/dates.ts), and `tests/dates.test.ts` covers it.

### The seed is idempotent

Every write is an `upsert` on a natural key — `[name, country]` for cities,
`[cityId, name]` for activities, `email` for users. Running it twice produces
the same 45 cities and 360 activities. The demo trip uses a fixed id and a
fixed `shareSlug`, so the public URL survives a reset.

---

## Money and currency

Every cost is stored twice over. `amount` (or `cost`) **always** holds the
value in the trip's currency — that is what every budget query sums, and its
meaning never changes. Alongside it sit `originalAmount`, `originalCurrency`,
`fxRate` and `fxRateAt`, recording what the traveller actually paid and the
rate used.

The rate is **stored, not looked up at render time**, so a budget someone saw
last week does not quietly change because the market moved. All the new
columns are nullable, so every row that existed before — and every query that
reads them — is unaffected.

Conversion and formatting live in exactly one place,
[`src/lib/money.ts`](src/lib/money.ts). `serialize.ts` re-exports `formatMoney`
so the twelve existing call sites keep working against a single implementation.

`displayMoney()` leads with what was paid and follows with the trip-currency
figure — `€50` then `₹4,500` — because the first number is the one on the
receipt. With no conversion there is one number and no bracket to explain.

### `GET /api/rates?from=EUR&to=INR`

Signed-in only. **Always answers 200 with a usable rate.** A missing key or an
unreachable vendor is reported as `source: "fallback"` with a `reason` the UI
shows verbatim — not an error the form has to handle.

## Travel data providers

Four adapters, all optional, all following the same contract as
`map-provider`: they resolve rather than throw, and say whether the answer came
from the vendor or the local model.

| Adapter | Env | Fallback when unset |
| --- | --- | --- |
| Currency | `CURRENCY_API_URL` / `CURRENCY_API_KEY` | Committed reference table in `money.ts` |
| Transport | `TRANSPORT_API_URL` / `TRANSPORT_API_KEY` | Modelled from real great-circle distance |
| Accommodation | `STAY_API_URL` / `STAY_API_KEY` | Modelled from the city cost index |
| Maps | `MAP_PROVIDER` / `MAP_API_KEY` | Coordinates plotted as SVG |

The fallbacks are **not stubs**. Transport cost is derived from the actual
distance between two seeded cities, so it still moves correctly when you swap
Bangkok for Reykjavik; stay scales off the city's cost index. A live provider
replaces the model with quotes — it does not turn nonsense into sense.

The currency adapter takes a **URL template** rather than naming a vendor,
because every common rate API returns the same essential shape
(`{ "rates": { "INR": 91.2 } }`). One parser covers exchangerate.host,
open.er-api.com, Fixer, Frankfurter and OpenExchangeRates; swapping vendor is
an environment change. `{base}`, `{from}`, `{to}`, `{city}`, `{nights}` and
`{key}` are substituted.

Live rates are cached in-process for an hour, so a page does not spend a vendor
call per amount rendered.

## Cities, wishlist and maps

| Route | What it does |
| --- | --- |
| `/cities` | Full catalogue. Search by name or country; filter by region, country and cost index; four sort orders |
| `/cities/[id]` | One city, its map, and the six nearest cities with distance and compass bearing |
| `/wishlist` | Saved cities, newest first |
| `POST` actions | `saveCity`, `unsaveCity`, `toggleSavedCity` in [`src/actions/saved.ts`](src/actions/saved.ts) |
| `GET /api/map/static` | Static map proxy — see below |

Filters live in the **URL**, so a result set is linkable, reloadable and
correct under the back button. Choosing a region narrows the country list, and
switching region clears a now-impossible country rather than showing an empty
result.

**Wishlist** persists in the `SavedCity` table, whose primary key is the
composite `[userId, cityId]`. A user can only ever address their own rows, and
the same city cannot be saved twice — `saveCity` upserts and `unsaveCity` uses
`deleteMany`, so both are idempotent.

**Nearby cities** need no map vendor at all: every seeded city already carries
a latitude and longitude, so proximity is haversine arithmetic over data we
hold ([`src/lib/geo.ts`](src/lib/geo.ts), 20 tests). Only *drawing* a map needs
a provider.

### `GET /api/map/static`

Signed-in only. Query: `w`, `h` (80–1280), and one or more `m=lon,lat[,p]`
markers (max 25, `p` marks the primary pin). Every parameter is validated
before it reaches the vendor — an unchecked passthrough would let anyone spend
our key on arbitrary requests.

| Status | Meaning |
| --- | --- |
| `200` | Image streamed from the provider |
| `401` | Not signed in |
| `400` | Bad parameters |
| `501` | No provider configured — the caller renders the SVG fallback |
| `502` | Provider unreachable — same fallback |

Adding a vendor means one entry in `PROVIDERS` in
[`src/lib/map-provider.ts`](src/lib/map-provider.ts). Nothing else in the app
imports a map SDK or URL template.

## Schema

Eight tables. Two join tables, one self-relation, explicit delete behaviour on
every foreign key, and **no derived value stored anywhere**.

```
User ──< Trip ──< Stop ──< TripActivity >── Activity >── City
              └──< Expense                              │
User >──< SavedCity >───────────────────────────────────┘
Trip ──< Trip   (self-relation: copiedFrom / copies)
```

Three decisions worth defending:

- **Cost is snapshotted onto `TripActivity`**, not read live from the
  catalogue — otherwise editing a seed price silently rewrites every saved
  budget.
- **`customName` + `onDelete: SetNull`** means a deleted catalogue activity
  leaves the itinerary readable instead of blank.
- **No total is stored**, so no total can drift. `computeBudget` derives it
  from one query, every time.

### Public Sharing and Copying (Provenance & Invariants)

- **Read-only public URLs (`/t/[slug]`)**:
  - Anyone with a share slug can view a rich, responsive, read-only itinerary with OpenGraph / social cards, destination route cards, day-by-day activity timelines, arrival badges, and category pills.
  - Social sharing buttons support native Web Share API (`navigator.share`), 1-click clipboard copy, WhatsApp, X/Twitter, LinkedIn, and print-ready PDF output.
- **Privacy & Revocation**:
  - Making a trip private immediately revokes its `shareSlug`. Any subsequent request to `/t/[old-slug]` immediately yields a `404` (`notFound()`), disclosing no information.
- **Atomic Graph Clone (`copyTrip`)**:
  - An authenticated user can clone a public itinerary with a single click.
  - The clone duplicates the entire trip graph (`Trip` -> `Stop`s -> `TripActivity` entries + `Expense`s) within a single `$transaction`.
  - The cloned trip is assigned a fresh ID, new ownership (`userId = user.id`), `isPublic: false`, `shareSlug: null`, and records `copiedFromId: src.id` for provenance.
- **Community Inspiration (`/inspiration`)**:
  - A dedicated inspiration discovery tab lets users search and browse public community itineraries by city, country, or keyword, with direct preview and 1-click cloning.

---

## Layout

```
prisma/
  schema.prisma          the ER diagram
  seed.ts                idempotent catalogue + demo trip
  data/cities.json       45 curated cities
src/
  lib/
    authz.ts             the authorization predicates — read this first
    guard.ts             session plumbing around authz.ts
    action.ts            the server-action wrapper
    result.ts            ActionResult
    stop-order.ts        stop ordering: 0..n-1 per trip
    activity-order.ts    activity ordering: 0..n-1 per (stop, day)
    catalogue-queries.ts city and activity search, filtered in the query
    budget.ts            pure cost rollup (unit-tested)
    dates.ts             UTC calendar-day helpers
    serialize.ts         the Server -> Client boundary
    trip-queries.ts      query boundary, returns plain data
  actions/               server actions, one file per resource
  components/share/      social sharing & share dialog components
  app/(auth)/            login, signup, forgot password
  app/(app)/             everything behind a session (dashboard, trips, inspiration, cities, activities)
  app/t/[slug]/          public share page with OpenGraph & print styles, no auth required
tests/
```

`src/middleware.ts` is a first line of defence only — it redirects signed-out
visitors. It is **not** where authorization happens: a route match is not a
permission, since `/trips/<someone-elses-id>` matches it perfectly.

