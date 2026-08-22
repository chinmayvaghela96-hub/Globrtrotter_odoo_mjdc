import { dayCountUTC, eachDayUTC, formatDateUTC } from "@/lib/dates"

/**
 * Cost is never stored on a trip. It is derived from one query every time it
 * is displayed, so a total can never disagree with the itinerary it came
 * from — there is no cache to invalidate and no write path that can miss an
 * update.
 *
 * `computeBudget` is deliberately pure and takes plain numbers, so it can be
 * unit-tested against fixtures before any database exists. The Prisma
 * `Decimal` values are converted at the query boundary in `getTripBudget`.
 */

export const COST_CATEGORIES = [
  "TRANSPORT",
  "STAY",
  "ACTIVITY",
  "MEALS",
  "OTHER",
] as const

export type CostCategory = (typeof COST_CATEGORIES)[number]

export type BudgetInput = {
  startDate: Date
  endDate: Date
  budgetCap: number | null
  currency: string
  stops: {
    arrivalDate: Date
    transportCost: number
    stayCost: number
    activities: { scheduledDate: Date; cost: number }[]
  }[]
  expenses: { date: Date; category: CostCategory; amount: number }[]
}

export type BudgetBreakdown = {
  currency: string
  total: number
  dayCount: number
  perDayAvg: number
  /** The threshold a single day must exceed to be flagged. */
  dayBudget: number
  budgetCap: number | null
  byCategory: { category: CostCategory; amount: number }[]
  byDay: { date: string; total: number; overBudget: boolean }[]
  overBudgetDays: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function computeBudget(trip: BudgetInput): BudgetBreakdown {
  const byCategory: Record<CostCategory, number> = {
    TRANSPORT: 0,
    STAY: 0,
    ACTIVITY: 0,
    MEALS: 0,
    OTHER: 0,
  }
  const byDay = new Map<string, number>()

  // Seed every calendar day so the chart shows the shape of the trip,
  // including the quiet days, rather than only the days with spending.
  for (const day of eachDayUTC(trip.startDate, trip.endDate)) {
    byDay.set(formatDateUTC(day), 0)
  }

  const add = (date: Date, amount: number) => {
    const key = formatDateUTC(date)
    // A cost dated outside the trip window still counts toward the total;
    // it simply gets its own bar rather than being silently dropped.
    byDay.set(key, (byDay.get(key) ?? 0) + amount)
  }

  for (const stop of trip.stops) {
    byCategory.TRANSPORT += stop.transportCost
    byCategory.STAY += stop.stayCost

    // Stop costs land on the arrival date. Spreading them evenly would make
    // every bar identical and the chart would say nothing.
    add(stop.arrivalDate, stop.transportCost + stop.stayCost)

    for (const activity of stop.activities) {
      byCategory.ACTIVITY += activity.cost
      add(activity.scheduledDate, activity.cost)
    }
  }

  for (const expense of trip.expenses) {
    byCategory[expense.category] += expense.amount
    add(expense.date, expense.amount)
  }

  const total = COST_CATEGORIES.reduce((sum, key) => sum + byCategory[key], 0)
  const dayCount = dayCountUTC(trip.startDate, trip.endDate)
  const perDayAvg = total / dayCount

  // With an explicit cap, the daily allowance is the cap spread evenly.
  // Without one, flag days that run well clear of the trip's own average.
  const dayBudget =
    trip.budgetCap !== null ? trip.budgetCap / dayCount : perDayAvg * 1.25

  const days = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayTotal]) => ({
      date,
      total: round2(dayTotal),
      overBudget: dayTotal > dayBudget,
    }))

  return {
    currency: trip.currency,
    total: round2(total),
    dayCount,
    perDayAvg: round2(perDayAvg),
    dayBudget: round2(dayBudget),
    budgetCap: trip.budgetCap,
    byCategory: COST_CATEGORIES.map((category) => ({
      category,
      amount: round2(byCategory[category]),
    })),
    byDay: days,
    overBudgetDays: days.filter((day) => day.overBudget).length,
  }
}
