import type { ActivityCategory, Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { nearest } from "@/lib/geo"
import { money } from "@/lib/serialize"

/**
 * Catalogue reads.
 *
 * Filtering happens in the query, never in JavaScript after fetching
 * everything — `@@index([cityId, category])` and `@@index([popularity])`
 * exist precisely so these stay cheap. Everything returned is plain data:
 * Decimals become numbers here so results can cross into client components.
 */

export const CITY_SORTS = ["popularity", "name", "costLow", "costHigh"] as const
export type CitySort = (typeof CITY_SORTS)[number]

export type CityFilters = {
  q?: string
  region?: string
  country?: string
  maxCost?: number
  sort?: CitySort
}

const CITY_ORDER: Record<CitySort, Prisma.CityOrderByWithRelationInput[]> = {
  popularity: [{ popularity: "desc" }, { name: "asc" }],
  name: [{ name: "asc" }],
  costLow: [{ costIndex: "asc" }, { name: "asc" }],
  costHigh: [{ costIndex: "desc" }, { name: "asc" }],
}

export async function searchCities(filters: CityFilters = {}) {
  const where: Prisma.CityWhereInput = {}

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { country: { contains: filters.q, mode: "insensitive" } },
    ]
  }
  if (filters.region) where.region = filters.region
  if (filters.country) where.country = filters.country
  if (filters.maxCost !== undefined) where.costIndex = { lte: filters.maxCost }

  return prisma.city.findMany({
    where,
    orderBy: CITY_ORDER[filters.sort ?? "popularity"],
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      costIndex: true,
      popularity: true,
      imageUrl: true,
      _count: { select: { activities: true } },
    },
  })
}

export type CityResult = Awaited<ReturnType<typeof searchCities>>[number]

export async function getRegions() {
  const rows = await prisma.city.findMany({
    distinct: ["region"],
    orderBy: { region: "asc" },
    select: { region: true },
  })
  return rows.map((row) => row.region)
}

/**
 * Countries for the filter, optionally narrowed to one region so the two
 * selects stay consistent — picking Europe should not leave Thailand in the
 * country list.
 */
export async function getCountries(region?: string) {
  const rows = await prisma.city.findMany({
    where: region ? { region } : undefined,
    distinct: ["country"],
    orderBy: { country: "asc" },
    select: { country: true },
  })
  return rows.map((row) => row.country)
}

/** One city, with everything the detail page and its map need. */
export async function getCityById(cityId: string) {
  return prisma.city.findUnique({
    where: { id: cityId },
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      latitude: true,
      longitude: true,
      costIndex: true,
      popularity: true,
      imageUrl: true,
      _count: { select: { activities: true } },
    },
  })
}

export type CityDetail = NonNullable<Awaited<ReturnType<typeof getCityById>>>

/**
 * Cities closest to the given one, nearest first.
 *
 * The whole catalogue is loaded and measured in memory. That is the right
 * trade at tens of cities; past a few thousand you would pre-filter with a
 * bounding box in SQL first, and `nearest` would take it from there unchanged.
 */
export async function getNearbyCities(
  city: { id: string; latitude: number; longitude: number },
  options: { limit?: number; maxKm?: number } = {},
) {
  const candidates = await prisma.city.findMany({
    where: { id: { not: city.id } },
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      latitude: true,
      longitude: true,
      costIndex: true,
      imageUrl: true,
    },
  })

  return nearest(city, candidates, { limit: options.limit ?? 6, maxKm: options.maxKm })
}

export type NearbyCity = Awaited<ReturnType<typeof getNearbyCities>>[number]

export type ActivityFilters = {
  q?: string
  cityId?: string
  category?: ActivityCategory
  maxCost?: number
  maxDuration?: number
}

export async function searchActivities(filters: ActivityFilters = {}) {
  const where: Prisma.ActivityWhereInput = {}

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ]
  }
  if (filters.cityId) where.cityId = filters.cityId
  if (filters.category) where.category = filters.category
  if (filters.maxCost !== undefined) where.cost = { lte: filters.maxCost }
  if (filters.maxDuration !== undefined) {
    where.durationMin = { lte: filters.maxDuration }
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: [{ cost: "asc" }, { name: "asc" }],
    take: 120, // a bounded page; the filters are how you narrow further
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      cost: true,
      durationMin: true,
      imageUrl: true,
      city: { select: { id: true, name: true, country: true } },
    },
  })

  return activities.map((activity) => ({
    ...activity,
    cost: money(activity.cost), // Decimal cannot cross to a client component
  }))
}

export type ActivityResult = Awaited<ReturnType<typeof searchActivities>>[number]

/** Cities the signed-in user has saved, as a Set for O(1) lookup in a list. */
export async function getSavedCityIds(userId: string) {
  const rows = await prisma.savedCity.findMany({
    where: { userId },
    select: { cityId: true },
  })
  return new Set(rows.map((row) => row.cityId))
}

export async function getSavedCities(userId: string) {
  const rows = await prisma.savedCity.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
    select: {
      savedAt: true,
      city: {
        select: {
          id: true,
          name: true,
          country: true,
          region: true,
          costIndex: true,
          imageUrl: true,
        },
      },
    },
  })
  return rows.map((row) => row.city)
}

/**
 * Stops the user can attach an activity to, grouped for a picker. Ownership
 * is in the `where` clause, so a forged trip id yields an empty list rather
 * than someone else's itinerary.
 */
export async function getAddableStops(userId: string, cityId?: string) {
  return prisma.stop.findMany({
    where: { trip: { userId }, ...(cityId ? { cityId } : {}) },
    orderBy: [{ trip: { startDate: "asc" } }, { orderIndex: "asc" }],
    select: {
      id: true,
      arrivalDate: true,
      departureDate: true,
      city: { select: { id: true, name: true } },
      trip: { select: { id: true, name: true } },
    },
  })
}
