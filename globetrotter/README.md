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

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run db:migrate` | Create and apply a new migration |
| `npm run db:deploy` | Apply committed migrations (CI / fresh clone) |
| `npm run db:seed` | Seed the catalogue, users, and demo trip |
| `npm run db:reset` | Drop, re-migrate, re-seed |
| `npm run db:studio` | Prisma Studio |
| `npm test` | Vitest — 33 tests |
| `npm run smoke` | HTTP smoke test against a running dev server |

`npm run smoke` mints a real session cookie with the app's own secret and
fetches every page in the demo path, asserting the content actually rendered —
including a request for another user's trip, which must come back `404`. It
catches the class of failure a unit test cannot: a page that typechecks but
throws at request time.

---

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 ·
PostgreSQL · Zod · Vitest

There is no REST layer. Server Components read the database directly and
Server Actions write to it, so authentication, validation, and error shaping
all happen at one choke point instead of three.

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
    stop-order.ts        the ordering transactions and their invariant
    budget.ts            pure cost rollup (unit-tested)
    dates.ts             UTC calendar-day helpers
    serialize.ts         the Server -> Client boundary
    trip-queries.ts      query boundary, returns plain data
  actions/               server actions, one file per resource
  app/(auth)/            login, signup, forgot password
  app/(app)/             everything behind a session
  app/t/[slug]/          public share page, no auth
tests/
```

`src/middleware.ts` is a first line of defence only — it redirects signed-out
visitors. It is **not** where authorization happens: a route match is not a
permission, since `/trips/<someone-elses-id>` matches it perfectly.
