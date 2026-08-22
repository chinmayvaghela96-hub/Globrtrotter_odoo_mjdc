import { PrismaClient, ActivityCategory, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import cities from "./data/cities.json"

/**
 * Idempotent seed.
 *
 * Every write is an `upsert` keyed on a natural unique — `[name, country]`
 * for cities, `[cityId, name]` for activities, `email` for users, and fixed
 * ids for the demo records. Run it five times, get one dataset.
 *
 *   npm run db:seed     apply
 *   npm run db:reset    drop, re-migrate, re-seed
 */

const prisma = new PrismaClient()

// Fixed ids so reseeding updates the demo records rather than duplicating
// them — and so the public share URL is stable across resets.
const DEMO_USER_ID = "seed_user_demo"
const ADMIN_USER_ID = "seed_user_admin"
const DEMO_TRIP_ID = "seed_trip_sea_loop"
const DEMO_SHARE_SLUG = "sea-loop-demo"

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

const image = (seed: string) => `https://picsum.photos/seed/${slug(seed)}/600/400`

/** UTC-midnight, so Postgres `@db.Date` cannot shift it a day at UTC+5:30. */
const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

type CityRow = (typeof cities)[number]

/**
 * One activity per category per city, generated from curated per-city data
 * (landmarks, signature dish, a named district) so every name reads as
 * genuinely local rather than templated. Cost scales off `costIndex`, which
 * gives the budget chart real range — including free entries.
 */
const CATEGORY_SPECS: {
  category: ActivityCategory
  title: (c: CityRow) => string
  blurb: (c: CityRow) => string
  costMultiplier: number
  durationMin: number
}[] = [
  {
    category: ActivityCategory.SIGHTSEEING,
    title: (c) => `Guided tour of ${c.landmarks[0]}`,
    blurb: (c) => `A half-day walk through ${c.landmarks[0]} with a local guide.`,
    costMultiplier: 35,
    durationMin: 180,
  },
  {
    category: ActivityCategory.CULTURE,
    title: (c) => `${c.landmarks[1]}: skip-the-line entry`,
    blurb: (c) => `Timed entry to ${c.landmarks[1]}, with an audio guide included.`,
    costMultiplier: 28,
    durationMin: 120,
  },
  {
    category: ActivityCategory.FOOD,
    title: (c) => `${c.dish} tasting walk in ${c.district}`,
    blurb: (c) => `Six stops around ${c.district}, built around ${c.dish}.`,
    costMultiplier: 30,
    durationMin: 150,
  },
  {
    category: ActivityCategory.ADVENTURE,
    title: (c) => `Day trip to ${c.landmarks[2]}`,
    blurb: (c) => `A full day out at ${c.landmarks[2]}, transport included.`,
    costMultiplier: 55,
    durationMin: 300,
  },
  {
    category: ActivityCategory.NATURE,
    title: (c) => `${c.landmarks[2]} nature walk`,
    blurb: (c) => `An unhurried morning outdoors near ${c.landmarks[2]}.`,
    costMultiplier: 12,
    durationMin: 240,
  },
  {
    category: ActivityCategory.NIGHTLIFE,
    title: (c) => `An evening in ${c.district}`,
    blurb: (c) => `Bars and live music around ${c.district}, starting after dark.`,
    costMultiplier: 40,
    durationMin: 180,
  },
  {
    category: ActivityCategory.SHOPPING,
    title: (c) => `${c.name} market crawl`,
    blurb: (c) => `The markets locals actually use, not the souvenir strip.`,
    costMultiplier: 8,
    durationMin: 120,
  },
  {
    category: ActivityCategory.RELAXATION,
    title: (c) => `Slow morning in ${c.district}`,
    blurb: (c) => `Nothing scheduled. Coffee, a bench, and ${c.district}.`,
    costMultiplier: 0, // deliberately free — the budget pie needs a zero
    durationMin: 90,
  },
]

async function seedCatalogue() {
  let activityCount = 0

  for (const city of cities as CityRow[]) {
    const record = await prisma.city.upsert({
      where: { name_country: { name: city.name, country: city.country } },
      update: {
        region: city.region,
        latitude: city.latitude,
        longitude: city.longitude,
        costIndex: city.costIndex,
        popularity: city.popularity,
        imageUrl: image(`${city.name}-${city.country}`),
      },
      create: {
        name: city.name,
        country: city.country,
        region: city.region,
        latitude: city.latitude,
        longitude: city.longitude,
        costIndex: city.costIndex,
        popularity: city.popularity,
        imageUrl: image(`${city.name}-${city.country}`),
      },
    })

    for (const spec of CATEGORY_SPECS) {
      const name = spec.title(city)
      const cost = Math.round((city.costIndex * spec.costMultiplier) / 10) * 10

      await prisma.activity.upsert({
        where: { cityId_name: { cityId: record.id, name } },
        update: {
          description: spec.blurb(city),
          category: spec.category,
          cost,
          durationMin: spec.durationMin,
        },
        create: {
          cityId: record.id,
          name,
          description: spec.blurb(city),
          category: spec.category,
          cost,
          durationMin: spec.durationMin,
          imageUrl: image(`${city.name}-${spec.category}`),
        },
      })
      activityCount++
    }
  }

  return { cities: cities.length, activities: activityCount }
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash("demo1234", 10)

  const demo = await prisma.user.upsert({
    where: { email: "demo@globetrotter.app" },
    update: { name: "Demo Traveller", passwordHash },
    create: {
      id: DEMO_USER_ID,
      email: "demo@globetrotter.app",
      name: "Demo Traveller",
      passwordHash,
      currency: "INR",
    },
  })

  const admin = await prisma.user.upsert({
    where: { email: "admin@globetrotter.app" },
    update: { name: "Admin", passwordHash, role: Role.ADMIN },
    create: {
      id: ADMIN_USER_ID,
      email: "admin@globetrotter.app",
      name: "Admin",
      passwordHash,
      role: Role.ADMIN,
      currency: "INR",
    },
  })

  return { demo, admin }
}

/**
 * The trip a judge sees first. Seeded rather than hand-built, so it survives
 * a database reset five minutes before the demo — which is exactly when a
 * database reset happens.
 */
async function seedDemoTrip(userId: string) {
  const plan = [
    {
      city: "Bangkok",
      arrival: "2026-09-14",
      departure: "2026-09-17",
      transportCost: 24000, // international flight in
      stayCost: 9000,
      picks: [
        { category: ActivityCategory.SIGHTSEEING, date: "2026-09-14", time: "10:00" },
        { category: ActivityCategory.FOOD, date: "2026-09-15", time: "18:30" },
        { category: ActivityCategory.SHOPPING, date: "2026-09-16", time: "11:00" },
      ],
    },
    {
      city: "Chiang Mai",
      arrival: "2026-09-17",
      departure: "2026-09-20",
      transportCost: 4500,
      stayCost: 7500,
      picks: [
        { category: ActivityCategory.CULTURE, date: "2026-09-17", time: "15:00" },
        // the expensive one — this is the day that breaches the cap
        { category: ActivityCategory.ADVENTURE, date: "2026-09-18", time: "08:00" },
        { category: ActivityCategory.RELAXATION, date: "2026-09-19", time: "09:00" },
      ],
    },
    {
      city: "Ubud",
      arrival: "2026-09-20",
      departure: "2026-09-22",
      transportCost: 11000,
      stayCost: 8000,
      picks: [
        { category: ActivityCategory.NATURE, date: "2026-09-20", time: "07:30" },
        { category: ActivityCategory.NIGHTLIFE, date: "2026-09-21", time: "20:00" },
      ],
    },
  ]

  // Rebuild the trip graph from scratch each run: the cascade clears stops
  // and their activities, so reseeding never accumulates duplicates.
  await prisma.trip.deleteMany({ where: { id: DEMO_TRIP_ID } })

  const trip = await prisma.trip.create({
    data: {
      id: DEMO_TRIP_ID,
      userId,
      name: "Southeast Asia Loop",
      description:
        "Nine days through Bangkok, Chiang Mai and Ubud — temples, night markets, and one very expensive day in the hills.",
      startDate: d("2026-09-14"),
      endDate: d("2026-09-22"),
      currency: "INR",
      isPublic: true,
      shareSlug: DEMO_SHARE_SLUG,
    },
  })

  const byDay = new Map<string, number>()
  const add = (date: string, amount: number) =>
    byDay.set(date, (byDay.get(date) ?? 0) + amount)

  for (const [index, entry] of plan.entries()) {
    const city = await prisma.city.findFirstOrThrow({ where: { name: entry.city } })

    const stop = await prisma.stop.create({
      data: {
        tripId: trip.id,
        cityId: city.id,
        orderIndex: index,
        arrivalDate: d(entry.arrival),
        departureDate: d(entry.departure),
        transportCost: entry.transportCost,
        stayCost: entry.stayCost,
      },
    })

    // stop costs land on the arrival date, matching lib/budget.ts
    add(entry.arrival, entry.transportCost + entry.stayCost)

    for (const [order, pick] of entry.picks.entries()) {
      const activity = await prisma.activity.findFirstOrThrow({
        where: { cityId: city.id, category: pick.category },
      })

      await prisma.tripActivity.create({
        data: {
          stopId: stop.id,
          activityId: activity.id,
          scheduledDate: d(pick.date),
          startTime: pick.time,
          cost: activity.cost,
          durationMin: activity.durationMin,
          orderIndex: order,
        },
      })

      add(pick.date, activity.cost.toNumber())
    }
  }

  // Set the cap so that exactly one day breaches it. Computed rather than
  // hand-tuned, so it stays true if the catalogue costs ever change.
  const totals = [...byDay.values()].sort((a, b) => b - a)
  const dayCount = 9
  const [highest, secondHighest] = totals
  const dayBudget = (highest + secondHighest) / 2

  await prisma.trip.update({
    where: { id: trip.id },
    data: { budgetCap: Math.round(dayBudget * dayCount) },
  })

  const total = totals.reduce((sum, n) => sum + n, 0)
  return { total, dayBudget: Math.round(dayBudget), overBudgetDays: 1 }
}

async function main() {
  console.log("seeding catalogue...")
  const catalogue = await seedCatalogue()
  console.log(`  ${catalogue.cities} cities, ${catalogue.activities} activities`)

  console.log("seeding users...")
  const { demo } = await seedUsers()
  console.log("  demo@globetrotter.app / demo1234")
  console.log("  admin@globetrotter.app / demo1234  (ADMIN)")

  console.log("seeding demo trip...")
  const trip = await seedDemoTrip(demo.id)
  console.log(
    `  Southeast Asia Loop — total ${trip.total}, day budget ${trip.dayBudget}, ` +
      `${trip.overBudgetDays} day over cap`,
  )
  console.log(`  public at /t/${DEMO_SHARE_SLUG}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
