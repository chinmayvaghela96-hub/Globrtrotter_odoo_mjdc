"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { CostCategory } from "@/lib/budget"
import { formatMoney } from "@/lib/serialize"

const CATEGORY_COLORS: Record<CostCategory, string> = {
  TRANSPORT: "#3b82f6", // blue
  STAY: "#8b5cf6",      // violet
  ACTIVITY: "#10b981",  // emerald
  MEALS: "#f59e0b",     // amber
  OTHER: "#64748b",     // slate
}

const CATEGORY_LABELS: Record<CostCategory, string> = {
  TRANSPORT: "Transport",
  STAY: "Stay & Lodging",
  ACTIVITY: "Activities",
  MEALS: "Meals & Dining",
  OTHER: "Other & Misc",
}

type CategoryItem = {
  category: CostCategory
  amount: number
}

export function BudgetCategoryPie({
  data,
  currency,
  total,
}: {
  data: CategoryItem[]
  currency: string
  total: number
}) {
  const chartData = data
    .filter((item) => item.amount > 0)
    .map((item) => ({
      name: CATEGORY_LABELS[item.category] ?? item.category,
      category: item.category,
      value: item.amount,
      percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
      color: CATEGORY_COLORS[item.category] ?? "#64748b",
    }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        <p>No expenses recorded yet.</p>
        <p className="text-xs">Add stops, activities, or expenses to see category breakdown.</p>
      </div>
    )
  }

  return (
    <div className="flex h-72 w-full flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload
                return (
                  <div className="rounded-lg border bg-popover p-2.5 shadow-md">
                    <p className="text-xs font-semibold text-popover-foreground">
                      {item.name}
                    </p>
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      {formatMoney(item.value, currency)}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({item.percentage}%)
                      </span>
                    </p>
                  </div>
                )
              }
              return null
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => {
              const item = chartData.find((d) => d.name === value)
              return (
                <span className="text-xs text-muted-foreground">
                  {value} {item ? `(${item.percentage}%)` : ""}
                </span>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
