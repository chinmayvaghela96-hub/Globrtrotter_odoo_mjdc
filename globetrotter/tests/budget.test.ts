import { describe, expect, it } from "vitest"
import { computeBudget, type BudgetInput } from "@/lib/budget"
import { parseDateUTC } from "@/lib/dates"

const d = parseDateUTC

function trip(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return {
    startDate: d("2026-09-14"),
    endDate: d("2026-09-16"), // 3 days
    budgetCap: null,
    currency: "INR",
    stops: [],
    expenses: [],
    ...overrides,
  }
}

describe("budget rollup", () => {
  it("is zero for a trip with nothing in it", () => {
    const budget = computeBudget(trip())
    expect(budget.total).toBe(0)
    expect(budget.perDayAvg).toBe(0)
    expect(budget.overBudgetDays).toBe(0)
  })

  it("shows every day of the trip, including days with no spending", () => {
    const budget = computeBudget(trip())
    expect(budget.byDay.map((day) => day.date)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
    ])
  })

  it("sums transport, stay, activities and expenses into the total", () => {
    const budget = computeBudget(
      trip({
        stops: [
          {
            arrivalDate: d("2026-09-14"),
            transportCost: 1000,
            stayCost: 2000,
            activities: [
              { scheduledDate: d("2026-09-15"), cost: 500 },
              { scheduledDate: d("2026-09-15"), cost: 250 },
            ],
          },
        ],
        expenses: [
          { date: d("2026-09-16"), category: "MEALS", amount: 400 },
          { date: d("2026-09-16"), category: "OTHER", amount: 100 },
        ],
      }),
    )

    expect(budget.total).toBe(4250)
    expect(Object.fromEntries(budget.byCategory.map((c) => [c.category, c.amount]))).toEqual({
      TRANSPORT: 1000,
      STAY: 2000,
      ACTIVITY: 750,
      MEALS: 400,
      OTHER: 100,
    })
  })

  it("attributes stop costs to the arrival date, not evenly across the stay", () => {
    const budget = computeBudget(
      trip({
        stops: [
          {
            arrivalDate: d("2026-09-15"),
            transportCost: 3000,
            stayCost: 0,
            activities: [],
          },
        ],
      }),
    )

    const byDate = Object.fromEntries(budget.byDay.map((day) => [day.date, day.total]))
    expect(byDate["2026-09-14"]).toBe(0)
    expect(byDate["2026-09-15"]).toBe(3000) // the whole cost, on arrival
    expect(byDate["2026-09-16"]).toBe(0)
  })

  it("spreads an explicit cap evenly and flags only the days that exceed it", () => {
    const budget = computeBudget(
      trip({
        budgetCap: 3000, // 3 days -> 1000 per day
        stops: [
          {
            arrivalDate: d("2026-09-14"),
            transportCost: 0,
            stayCost: 0,
            activities: [
              { scheduledDate: d("2026-09-14"), cost: 900 },
              { scheduledDate: d("2026-09-15"), cost: 1500 },
              { scheduledDate: d("2026-09-16"), cost: 200 },
            ],
          },
        ],
      }),
    )

    expect(budget.dayBudget).toBe(1000)
    expect(budget.overBudgetDays).toBe(1)
    expect(budget.byDay.find((day) => day.overBudget)?.date).toBe("2026-09-15")
  })

  it("does not flag a day sitting exactly on the cap", () => {
    const budget = computeBudget(
      trip({
        budgetCap: 3000,
        stops: [
          {
            arrivalDate: d("2026-09-14"),
            transportCost: 1000, // exactly the daily allowance
            stayCost: 0,
            activities: [],
          },
        ],
      }),
    )

    expect(budget.overBudgetDays).toBe(0)
  })

  it("falls back to a margin over the trip average when no cap is set", () => {
    const budget = computeBudget(
      trip({
        budgetCap: null,
        stops: [
          {
            arrivalDate: d("2026-09-14"),
            transportCost: 0,
            stayCost: 0,
            activities: [
              { scheduledDate: d("2026-09-14"), cost: 100 },
              { scheduledDate: d("2026-09-15"), cost: 100 },
              { scheduledDate: d("2026-09-16"), cost: 1000 },
            ],
          },
        ],
      }),
    )

    expect(budget.perDayAvg).toBe(400)
    expect(budget.dayBudget).toBe(500) // 400 * 1.25
    expect(budget.overBudgetDays).toBe(1)
  })

  it("keeps a cost dated outside the trip window in the total", () => {
    const budget = computeBudget(
      trip({
        expenses: [{ date: d("2026-09-20"), category: "OTHER", amount: 750 }],
      }),
    )

    expect(budget.total).toBe(750) // counted, not silently dropped
    expect(budget.byDay.some((day) => day.date === "2026-09-20")).toBe(true)
  })
})
