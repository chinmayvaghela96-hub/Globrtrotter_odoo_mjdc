"use client"

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatMoney } from "@/lib/serialize"

type DailyBudgetPoint = {
  date: string
  total: number
  overBudget: boolean
}

export function BudgetDailyBar({
  data,
  currency,
  dayBudget,
}: {
  data: DailyBudgetPoint[]
  currency: string
  dayBudget: number
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        <p>No itinerary dates available.</p>
      </div>
    )
  }

  // Format date for concise x-axis labels (e.g. "Sep 14")
  const chartData = data.map((item) => {
    const parts = item.date.split("-")
    const shortDate = parts.length === 3 ? `${parts[1]}/${parts[2]}` : item.date
    return {
      ...item,
      label: shortDate,
    }
  })

  const maxVal = Math.max(...data.map((d) => d.total), dayBudget)

  return (
    <div className="flex h-72 w-full flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            domain={[0, Math.ceil(maxVal * 1.15)]}
            tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as (typeof chartData)[0]
                return (
                  <div className="rounded-lg border bg-popover p-2.5 shadow-md">
                    <p className="text-xs font-semibold text-popover-foreground">
                      Date: {item.date}
                    </p>
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      Spent: {formatMoney(item.total, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Daily allowance: {formatMoney(dayBudget, currency)}
                    </p>
                    {item.overBudget && (
                      <span className="mt-1 inline-block rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
                        Over budget
                      </span>
                    )}
                  </div>
                )
              }
              return null
            }}
          />
          {dayBudget > 0 && (
            <ReferenceLine
              y={dayBudget}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{
                value: `Limit (${formatMoney(dayBudget, currency)})`,
                position: "insideTopRight",
                fill: "#ef4444",
                fontSize: 10,
              }}
            />
          )}
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.overBudget ? "#ef4444" : "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
