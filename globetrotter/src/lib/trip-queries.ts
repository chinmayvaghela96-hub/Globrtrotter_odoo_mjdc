import { prisma } from "@/lib/db"
import { money, moneyOrNull } from "@/lib/serialize"
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
