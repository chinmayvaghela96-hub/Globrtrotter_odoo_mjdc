import { prisma } from "@/lib/db"
import { money, moneyOrNull } from "@/lib/serialize"
import { formatDateUTC } from "@/lib/dates"
import { computeBudget, type BudgetBreakdown, type CostCategory } from "@/lib/budget"

/**
 * The query boundary.
 *
 * Everything here returns plain data: `Prisma.Decimal` becomes `number` and
 * nothing class-shaped leaves this module, so any result can be handed
 * straight to a client component without React rejecting it.
 */

/** One round trip for everything the budget needs. */
export async function getTripBudget(tripId: string): Promise<BudgetBreakdown | null> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      startDate: true,
      endDate: true,
      budgetCap: true,
      currency: true,
      stops: {
        orderBy: { orderIndex: "asc" },
        select: {
          arrivalDate: true,
          transportCost: true,
          stayCost: true,
          activities: { select: { scheduledDate: true, cost: true } },
        },
      },
      expenses: { select: { date: true, category: true, amount: true } },
    },
  })

  if (!trip) return null

  return computeBudget({
    startDate: trip.startDate,
    endDate: trip.endDate,
    budgetCap: moneyOrNull(trip.budgetCap),
    currency: trip.currency,
    stops: trip.stops.map((stop) => ({
      arrivalDate: stop.arrivalDate,
      transportCost: money(stop.transportCost),
      stayCost: money(stop.stayCost),
      activities: stop.activities.map((activity) => ({
        scheduledDate: activity.scheduledDate,
        cost: money(activity.cost),
      })),
    })),
    expenses: trip.expenses.map((expense) => ({
      date: expense.date,
      category: expense.category as CostCategory,
      amount: money(expense.amount),
    })),
  })
}

/** Trip cards for the dashboard and the trip list. */
export async function getTripSummaries(userId: string, take?: number) {
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: "asc" },
    take,
    select: {
      id: true,
      name: true,
      description: true,
      startDate: true,
      endDate: true,
      coverUrl: true,
      currency: true,
      isPublic: true,
      budgetCap: true,
      stops: {
        orderBy: { orderIndex: "asc" },
        select: {
          arrivalDate: true,
          transportCost: true,
          stayCost: true,
          city: { select: { name: true, country: true } },
          activities: { select: { scheduledDate: true, cost: true } },
        },
      },
      expenses: { select: { date: true, category: true, amount: true } },
    },
  })

  return trips.map((trip) => {
    const budget = computeBudget({
      startDate: trip.startDate,
      endDate: trip.endDate,
      budgetCap: moneyOrNull(trip.budgetCap),
      currency: trip.currency,
      stops: trip.stops.map((stop) => ({
        arrivalDate: stop.arrivalDate,
        transportCost: money(stop.transportCost),
        stayCost: money(stop.stayCost),
        activities: stop.activities.map((activity) => ({
          scheduledDate: activity.scheduledDate,
          cost: money(activity.cost),
        })),
      })),
      expenses: trip.expenses.map((expense) => ({
        date: expense.date,
        category: expense.category as CostCategory,
        amount: money(expense.amount),
      })),
    })

    return {
      id: trip.id,
      name: trip.name,
      description: trip.description,
      startDate: trip.startDate,
      endDate: trip.endDate,
      coverUrl: trip.coverUrl,
      currency: trip.currency,
      isPublic: trip.isPublic,
      stopCount: trip.stops.length,
      cities: trip.stops.map((stop) => stop.city.name),
      total: budget.total,
      overBudgetDays: budget.overBudgetDays,
    }
  })
}

export type TripSummary = Awaited<ReturnType<typeof getTripSummaries>>[number]

/**
 * The full trip graph, flattened into plain data for rendering.
 *
 * Dates become `yyyy-MM-dd` strings and Decimals become numbers here, so the
 * result can be handed to a client component without React rejecting it.
 */
export async function getTripDetail(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      stops: {
        orderBy: { orderIndex: "asc" },
        include: {
          city: true,
          activities: {
            orderBy: [{ scheduledDate: "asc" }, { orderIndex: "asc" }],
            include: { activity: { select: { name: true, category: true } } },
          },
        },
      },
    },
  })

  if (!trip) return null

  return {
    id: trip.id,
    name: trip.name,
    description: trip.description,
    startDate: formatDateUTC(trip.startDate),
    endDate: formatDateUTC(trip.endDate),
    currency: trip.currency,
    budgetCap: moneyOrNull(trip.budgetCap),
    isPublic: trip.isPublic,
    shareSlug: trip.shareSlug,
    stopCount: trip.stops.length,
    stops: trip.stops.map((stop) => ({
      id: stop.id,
      orderIndex: stop.orderIndex,
      arrivalDate: formatDateUTC(stop.arrivalDate),
      departureDate: formatDateUTC(stop.departureDate),
      transportCost: money(stop.transportCost),
      stayCost: money(stop.stayCost),
      notes: stop.notes,
      city: {
        id: stop.city.id,
        name: stop.city.name,
        country: stop.city.country,
        region: stop.city.region,
        costIndex: stop.city.costIndex,
        imageUrl: stop.city.imageUrl,
      },
      activities: stop.activities.map((entry) => ({
        id: entry.id,
        // `customName` survives a deleted catalogue entry, which is why the
        // schema sets `activityId` to null rather than cascading.
        name: entry.activity?.name ?? entry.customName ?? "Untitled activity",
        category: entry.activity?.category ?? null,
        scheduledDate: formatDateUTC(entry.scheduledDate),
        startTime: entry.startTime,
        cost: money(entry.cost),
        durationMin: entry.durationMin,
      })),
    })),
  }
}

export type TripDetail = NonNullable<Awaited<ReturnType<typeof getTripDetail>>>
export type TripDetailStop = TripDetail["stops"][number]

/** Cities for the "add a stop" picker. */
export async function getCityOptions() {
  return prisma.city.findMany({
    orderBy: [{ region: "asc" }, { name: "asc" }],
    select: { id: true, name: true, country: true, region: true, costIndex: true },
  })
}

/** Recommended destinations for the dashboard. */
export async function getRecommendedCities(take = 6) {
  return prisma.city.findMany({
    orderBy: { popularity: "desc" },
    take,
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      costIndex: true,
      popularity: true,
      imageUrl: true,
    },
  })
}

/** Standalone expenses for a trip. */
export async function getTripExpenses(tripId: string) {
  const expenses = await prisma.expense.findMany({
    where: { tripId },
    orderBy: { date: "asc" },
    select: {
      id: true,
      category: true,
      label: true,
      amount: true,
      date: true,
    },
  })

  return expenses.map((exp) => ({
    id: exp.id,
    category: exp.category,
    label: exp.label,
    amount: money(exp.amount),
    date: formatDateUTC(exp.date),
  }))
}

/** Minimal city names for the trip layout header (TripGlimpse). */
export async function getTripCityNames(tripId: string): Promise<string[]> {
  const stops = await prisma.stop.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
    select: { city: { select: { name: true } } },
  })
  return stops.map((s) => s.city.name)
}
