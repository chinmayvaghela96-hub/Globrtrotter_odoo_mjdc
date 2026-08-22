"use client"

import { useActionState, useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { addExpense } from "@/actions/expense"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCY_CODES } from "@/lib/money"
import type { ActionResult } from "@/lib/result"

const CATEGORIES = [
  { value: "MEALS", label: "Meals & Dining" },
  { value: "TRANSPORT", label: "Local Transport" },
  { value: "ACTIVITY", label: "Activities" },
  { value: "STAY", label: "Extra Lodging" },
  { value: "OTHER", label: "Other / Misc" },
]

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

export function ExpenseFormDialog({
  tripId,
  startDate,
  endDate,
  currency,
}: {
  tripId: string
  startDate: string
  endDate: string
  currency: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("MEALS")

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      values.category = selectedCategory
      const result = await addExpense(values)
      if (result.ok) {
        toast.success("Expense logged")
        setOpen(false)
      }
      return { result, values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null
  const error = (name: string) => failed?.fields?.[name]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Log extra expense
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log an expense</DialogTitle>
          <DialogDescription>
            Add meals, local taxi fares, or incidental costs for this trip.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 pt-2">
          <input type="hidden" name="tripId" value={tripId} />

          {failed && !failed.fields && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {failed.error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                if (val) setSelectedCategory(val)
              }}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="label">Description / Place</Label>
            <Input
              id="label"
              name="label"
              placeholder="e.g. Seafood dinner by the beach"
              defaultValue={state?.values.label ?? ""}
              aria-invalid={Boolean(error("label"))}
            />
            {error("label") && (
              <span className="text-xs text-destructive">{error("label")}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount paid</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  defaultValue={state?.values.amount ?? ""}
                  aria-invalid={Boolean(error("amount"))}
                  className="flex-1"
                />
                {/*
                  Pay in whatever the receipt says. The action converts once
                  to the trip currency and stores the rate alongside, so the
                  budget total stays in one currency.
                */}
                <select
                  name="currency"
                  aria-label="Currency paid in"
                  defaultValue={state?.values.currency ?? currency}
                  className="h-9 w-24 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  {CURRENCY_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              {error("amount") && (
                <span className="text-xs text-destructive">{error("amount")}</span>
              )}
              {error("currency") && (
                <span className="text-xs text-destructive">{error("currency")}</span>
              )}
              <span className="text-xs text-muted-foreground">
                Converted to {currency} at today&apos;s rate and stored with it.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                min={startDate}
                max={endDate}
                defaultValue={state?.values.date ?? startDate}
                aria-invalid={Boolean(error("date"))}
              />
              {error("date") && (
                <span className="text-xs text-destructive">{error("date")}</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Add expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
