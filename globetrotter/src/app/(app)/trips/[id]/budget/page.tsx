import { notFound } from "next/navigation"
import { AlertCircle, CheckCircle2, TrendingUp, Wallet } from "lucide-react"
import { BudgetCategoryPie } from "@/components/charts/budget-category-pie"
import { BudgetDailyBar } from "@/components/charts/budget-daily-bar"
import { ExpenseFormDialog } from "@/components/trip/expense-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireTripOwner } from "@/lib/guard"
import { formatMoney } from "@/lib/serialize"
import { getTripBudget, getTripDetail, getTripExpenses } from "@/lib/trip-queries"
import { deleteExpense } from "@/actions/expense"

export const metadata = { title: "Budget & Costs · GlobeTrotter" }

const CATEGORY_NAMES: Record<string, string> = {
  TRANSPORT: "Transport",
  STAY: "Stay & Lodging",
  ACTIVITY: "Activities",
  MEALS: "Meals & Dining",
  OTHER: "Other / Incidentals",
}

export default async function TripBudgetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireTripOwner(id)

  const [trip, budget, expenses] = await Promise.all([
    getTripDetail(id),
    getTripBudget(id),
    getTripExpenses(id),
  ])

  if (!trip || !budget) notFound()

  const isOverTotalCap =
    trip.budgetCap !== null && budget.total > trip.budgetCap
  const capDifference =
    trip.budgetCap !== null ? budget.total - trip.budgetCap : null

  return (
    <div className="flex flex-col gap-8">
      {/* ── Top Highlights ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Planned Spend
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatMoney(budget.total, trip.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {trip.budgetCap !== null ? (
                <>Cap: {formatMoney(trip.budgetCap, trip.currency)}</>
              ) : (
                "No overall cap set"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Daily Average
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatMoney(budget.perDayAvg, trip.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {budget.dayCount} {budget.dayCount === 1 ? "day" : "days"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Daily Target Limit
            </CardTitle>
            <span className="text-xs font-mono text-muted-foreground">/day</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {formatMoney(budget.dayBudget, trip.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {trip.budgetCap !== null ? "Cap spread evenly" : "+25% of avg"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            budget.overBudgetDays > 0
              ? "border-destructive/40 bg-destructive/5"
              : ""
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Days Over Budget
            </CardTitle>
            {budget.overBudgetDays > 0 ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold tabular-nums ${
                budget.overBudgetDays > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {budget.overBudgetDays}
            </div>
            <p className="text-xs text-muted-foreground">
              {budget.overBudgetDays > 0
                ? "Exceeds daily target allowance"
                : "All days within daily limit"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Alert if overall budget breached ───────────────────────── */}
      {isOverTotalCap && capDifference !== null && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">
              Trip is currently over budget
            </span>
            <span className="text-xs opacity-90">
              Planned spend exceeds the {formatMoney(trip.budgetCap!, trip.currency)} cap by{" "}
              {formatMoney(capDifference, trip.currency)}.
            </span>
          </div>
        </div>
      )}

      {/* ── Charts Grid ────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Spending by Category
            </CardTitle>
            <CardDescription>
              Breakdown across transport, lodging, activities, and dining.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <BudgetCategoryPie
              data={budget.byCategory}
              currency={trip.currency}
              total={budget.total}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Daily Spending Timeline
            </CardTitle>
            <CardDescription>
              Costs mapped to arrival dates and activity days. Red indicates over-limit days.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <BudgetDailyBar
              data={budget.byDay}
              currency={trip.currency}
              dayBudget={budget.dayBudget}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Category & Daily Breakdowns ───────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Category Distribution
            </CardTitle>
            <CardDescription>
              Cumulative costs aggregated from stops and scheduled activities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budget.byCategory.map((item) => {
                  const share =
                    budget.total > 0
                      ? Math.round((item.amount / budget.total) * 100)
                      : 0
                  return (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">
                        {CATEGORY_NAMES[item.category] ?? item.category}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(item.amount, trip.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {share}%
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Extra Incidental Expenses
              </CardTitle>
              <CardDescription>
                Food, transit, or shopping not tied to a specific activity.
              </CardDescription>
            </div>
            <ExpenseFormDialog
              tripId={trip.id}
              startDate={trip.startDate}
              endDate={trip.endDate}
              currency={trip.currency}
            />
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                <p>No extra expenses logged.</p>
                <p className="text-xs">Use the button above to record dining or taxi costs.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {exp.date}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-tight">
                            {exp.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {CATEGORY_NAMES[exp.category] ?? exp.category}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(exp.amount, trip.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <form
                          action={async () => {
                            "use server"
                            await deleteExpense({ expenseId: exp.id })
                          }}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            Delete
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
