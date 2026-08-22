import { PrismaClient, ActivityCategory, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import cities from "./data/cities.json"
import { getCityImageUrl } from "../src/lib/city-images"

/**
 * Idempotent seed.
 *
 * Every write is an `upsert` keyed on a natural unique — `[name, country]`
 * for cities, `[cityId, name]` for activities, `email` for users, and fixed
 * ids for the demo and curated records. Run it repeatedly, get one clean dataset.
 *
 *   npm run db:seed     apply
 *   npm run db:reset    drop, re-migrate, re-seed
 */

const prisma = new PrismaClient()

// Fixed ids so reseeding updates existing records rather than duplicating them
const DEMO_USER_ID = "seed_user_demo"
const ADMIN_USER_ID = "seed_user_admin"
const CURATOR_USER_ID = "seed_user_curator"
const DEMO_TRIP_ID = "seed_trip_sea_loop"
const DEMO_SHARE_SLUG = "sea-loop-demo"

/** UTC-midnight, so Postgres `@db.Date` cannot shift it a day at UTC+5:30. */
const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

type CityRow = (typeof cities)[number]

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
    costMultiplier: 0,
    durationMin: 90,
  },
]

async function seedCatalogue() {
  let activityCount = 0

  for (const city of cities as CityRow[]) {
    const verifiedImageUrl = getCityImageUrl(city.name)

    const record = await prisma.city.upsert({
      where: { name_country: { name: city.name, country: city.country } },
      update: {
        region: city.region,
        latitude: city.latitude,
        longitude: city.longitude,
        costIndex: city.costIndex,
        popularity: city.popularity,
        imageUrl: verifiedImageUrl,
      },
      create: {
        name: city.name,
        country: city.country,
        region: city.region,
        latitude: city.latitude,
        longitude: city.longitude,
        costIndex: city.costIndex,
        popularity: city.popularity,
        imageUrl: verifiedImageUrl,
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
          imageUrl: verifiedImageUrl,
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

  const curator = await prisma.user.upsert({
    where: { email: "curator@globetrotter.app" },
    update: { name: "GlobeTrotter Editorial", passwordHash, role: Role.ADMIN },
    create: {
      id: CURATOR_USER_ID,
      email: "curator@globetrotter.app",
      name: "GlobeTrotter Editorial",
      passwordHash,
      role: Role.ADMIN,
      currency: "INR",
    },
  })

  return { demo, admin, curator }
}

async function seedDemoTrip(userId: string) {
  const plan = [
    {
      city: "Bangkok",
      arrival: "2026-09-14",
      departure: "2026-09-17",
      transportCost: 24000,
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
      isCurated: false, // user demo trip
      shareSlug: DEMO_SHARE_SLUG,
    },
  })

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
    }
  }

  await prisma.trip.update({
    where: { id: trip.id },
    data: { budgetCap: 60000 },
  })

  return trip
}

/**
 * 8 High-Quality Curated Classic Itineraries for Inspiration.
 * All marked `isCurated: true` and attached to CURATOR_USER_ID so they are visible
 * to everyone under Inspiration, but never pollute user custom trips.
 */
const CURATED_ITINERARIES = [
  {
    id: "curated_european_classics",
    name: "European Classics",
    slug: "european-classics",
    description: "Paris, Rome, and Florence in seven unforgettable days. Art, architecture, and world-class gastronomy.",
    startDate: "2026-10-01",
    endDate: "2026-10-08",
    budgetCap: 120000,
    coverUrl: getCityImageUrl("Paris"),
    stops: [
      { city: "Paris", arrival: "2026-10-01", departure: "2026-10-04", transport: 25000, stay: 18000 },
      { city: "Rome", arrival: "2026-10-04", departure: "2026-10-06", transport: 8000, stay: 12000 },
      { city: "Florence", arrival: "2026-10-06", departure: "2026-10-08", transport: 4000, stay: 10000 },
    ],
  },
  {
    id: "curated_japan_highlights",
    name: "Japan Highlights",
    slug: "japan-highlights",
    description: "Tokyo, Kyoto, and Osaka by Shinkansen bullet train. Ancient shrines, neon alleys, and culinary mastery.",
    startDate: "2026-10-10",
    endDate: "2026-10-18",
    budgetCap: 150000,
    coverUrl: getCityImageUrl("Tokyo"),
    stops: [
      { city: "Tokyo", arrival: "2026-10-10", departure: "2026-10-13", transport: 30000, stay: 22000 },
      { city: "Kyoto", arrival: "2026-10-13", departure: "2026-10-16", transport: 9000, stay: 18000 },
      { city: "Osaka", arrival: "2026-10-16", departure: "2026-10-18", transport: 3000, stay: 12000 },
    ],
  },
  {
    id: "curated_western_europe",
    name: "Western Europe Explorer",
    slug: "western-europe",
    description: "London, Paris, and Amsterdam across nine days of iconic history, royal palaces, and canal walks.",
    startDate: "2026-11-01",
    endDate: "2026-11-10",
    budgetCap: 165000,
    coverUrl: getCityImageUrl("London"),
    stops: [
      { city: "London", arrival: "2026-11-01", departure: "2026-11-04", transport: 28000, stay: 24000 },
      { city: "Paris", arrival: "2026-11-04", departure: "2026-11-07", transport: 6000, stay: 18000 },
      { city: "Amsterdam", arrival: "2026-11-07", departure: "2026-11-10", transport: 5000, stay: 16000 },
    ],
  },
  {
    id: "curated_rajasthan_heritage",
    name: "Rajasthan Heritage",
    slug: "rajasthan-heritage",
    description: "Jaipur, Jodhpur, and Udaipur. Grand Rajput forts, royal lakeside palaces, and vibrant desert bazaars.",
    startDate: "2026-11-12",
    endDate: "2026-11-18",
    budgetCap: 45000,
    coverUrl: getCityImageUrl("Jaipur"),
    stops: [
      { city: "Jaipur", arrival: "2026-11-12", departure: "2026-11-14", transport: 5000, stay: 6000 },
      { city: "Jodhpur", arrival: "2026-11-14", departure: "2026-11-16", transport: 2500, stay: 5000 },
      { city: "Udaipur", arrival: "2026-11-16", departure: "2026-11-18", transport: 3000, stay: 8000 },
    ],
  },
  {
    id: "curated_kerala_escape",
    name: "Kerala Escape",
    slug: "kerala-escape",
    description: "Kochi, Munnar tea hills, Alleppey backwater houseboats, and Varkala cliffside beaches.",
    startDate: "2026-12-01",
    endDate: "2026-12-08",
    budgetCap: 40000,
    coverUrl: getCityImageUrl("Munnar"),
    stops: [
      { city: "Kochi", arrival: "2026-12-01", departure: "2026-12-03", transport: 6000, stay: 4500 },
      { city: "Munnar", arrival: "2026-12-03", departure: "2026-12-05", transport: 2000, stay: 5000 },
      { city: "Alleppey", arrival: "2026-12-05", departure: "2026-12-07", transport: 2500, stay: 8000 },
      { city: "Varkala", arrival: "2026-12-07", departure: "2026-12-08", transport: 1500, stay: 3500 },
    ],
  },
  {
    id: "curated_southeast_asia",
    name: "Southeast Asia Odyssey",
    slug: "southeast-asia-odyssey",
    description: "Bangkok street food, Phuket tropical beaches, and Singapore futuristic architecture in eight days.",
    startDate: "2026-12-10",
    endDate: "2026-12-18",
    budgetCap: 95000,
    coverUrl: getCityImageUrl("Singapore"),
    stops: [
      { city: "Bangkok", arrival: "2026-12-10", departure: "2026-12-13", transport: 18000, stay: 8000 },
      { city: "Phuket", arrival: "2026-12-13", departure: "2026-12-15", transport: 4000, stay: 7000 },
      { city: "Singapore", arrival: "2026-12-15", departure: "2026-12-18", transport: 7000, stay: 18000 },
    ],
  },
  {
    id: "curated_italy_explorer",
    name: "Italy Explorer",
    slug: "italy-explorer",
    description: "Rome, Florence, and Venice. The absolute pinnacle of art, Renaissance history, and Italian cuisine.",
    startDate: "2026-12-20",
    endDate: "2026-12-27",
    budgetCap: 130000,
    coverUrl: getCityImageUrl("Rome"),
    stops: [
      { city: "Rome", arrival: "2026-12-20", departure: "2026-12-23", transport: 24000, stay: 16000 },
      { city: "Florence", arrival: "2026-12-23", departure: "2026-12-25", transport: 4000, stay: 11000 },
      { city: "Venice", arrival: "2026-12-25", departure: "2026-12-27", transport: 3500, stay: 14000 },
    ],
  },
  {
    id: "curated_switzerland_highlights",
    name: "Switzerland Alpine Highlights",
    slug: "switzerland-alpine-highlights",
    description: "Zurich, Lucerne, and Interlaken. Majestic Alpine peaks, turquoise glacial lakes, and world-class trains.",
    startDate: "2027-01-05",
    endDate: "2027-01-11",
    budgetCap: 180000,
    coverUrl: getCityImageUrl("Interlaken"),
    stops: [
      { city: "Zurich", arrival: "2027-01-05", departure: "2027-01-07", transport: 32000, stay: 24000 },
      { city: "Lucerne", arrival: "2027-01-07", departure: "2027-01-09", transport: 5000, stay: 20000 },
      { city: "Interlaken", arrival: "2027-01-09", departure: "2027-01-11", transport: 6000, stay: 22000 },
    ],
  },
]

async function seedCuratedInspirations(curatorUserId: string) {
  for (const item of CURATED_ITINERARIES) {
    await prisma.trip.deleteMany({ where: { id: item.id } })

    const trip = await prisma.trip.create({
      data: {
        id: item.id,
        userId: curatorUserId,
        name: item.name,
        description: item.description,
        startDate: d(item.startDate),
        endDate: d(item.endDate),
        currency: "INR",
        budgetCap: item.budgetCap,
        coverUrl: item.coverUrl,
        isPublic: true,
        isCurated: true,
        shareSlug: item.slug,
      },
    })

    for (const [index, stopEntry] of item.stops.entries()) {
      const city = await prisma.city.findFirst({
        where: { name: { equals: stopEntry.city, mode: "insensitive" } },
      })
      if (!city) continue

      const stop = await prisma.stop.create({
        data: {
          tripId: trip.id,
          cityId: city.id,
          orderIndex: index,
          arrivalDate: d(stopEntry.arrival),
          departureDate: d(stopEntry.departure),
          transportCost: stopEntry.transport,
          stayCost: stopEntry.stay,
        },
      })

      // Add 2 signature activities per stop
      const activities = await prisma.activity.findMany({
        where: { cityId: city.id },
        take: 2,
      })

      for (const [order, act] of activities.entries()) {
        await prisma.tripActivity.create({
          data: {
            stopId: stop.id,
            activityId: act.id,
            scheduledDate: d(stopEntry.arrival),
            startTime: order === 0 ? "10:00" : "15:30",
            cost: act.cost,
            durationMin: act.durationMin,
            orderIndex: order,
          },
        })
      }
    }
  }

  return CURATED_ITINERARIES.length
}

async function main() {
  console.log("seeding catalogue with verified landmark imagery...")
  const catalogue = await seedCatalogue()
  console.log(`  ${catalogue.cities} cities, ${catalogue.activities} activities`)

  console.log("seeding users...")
  const { demo, admin, curator } = await seedUsers()
  console.log("  demo@globetrotter.app / demo1234")
  console.log("  admin@globetrotter.app / demo1234  (ADMIN)")

  console.log("seeding demo trip for demo user...")
  const demoTrip = await seedDemoTrip(demo.id)
  console.log(`  Demo trip: ${demoTrip.name} (isCurated: false, userId: ${demo.id})`)

  console.log("seeding 8 classic curated inspiration itineraries...")
  const curatedCount = await seedCuratedInspirations(curator.id)
  console.log(`  ${curatedCount} curated inspiration itineraries created (isCurated: true)`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
