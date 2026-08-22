"use server"

import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import { z } from "zod"
import { ExpenseCategory } from "@prisma/client"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { parseDateUTC } from "@/lib/dates"
import { requireTripOwner, requireUser } from "@/lib/guard"
import { convert, CURRENCY_CODES } from "@/lib/money"
import { getRate } from "@/lib/providers/currency"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")

const AddExpenseInput = z.object({
  tripId: z.string().min(1),
  category: z.nativeEnum(ExpenseCategory),
  label: z.string().trim().min(2, "Give the expense a label.").max(100),
  amount: z.coerce
    .number({ message: "Enter an amount." })
    .positive("Amount must be greater than zero."),
  date: dateString,
  /** What the traveller actually paid in. Defaults to the trip's currency. */
  currency: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(CURRENCY_CODES as [string, ...string[]]).optional(),
  ),
})

const DeleteExpenseInput = z.object({
  expenseId: z.string().min(1),
})

export const addExpense = action(AddExpenseInput, async (input) => {
  const { trip } = await requireTripOwner(input.tripId)

  // `amount` must land in the trip's currency, because that is what every
  // budget query sums. When the traveller paid in something else we convert
  // once, here, and keep the original and the rate alongside it — so the
  // saved figure cannot drift when the market moves.
  const paidIn = input.currency ?? trip.currency
  const needsConversion = paidIn !== trip.currency

  const { data: rate } = needsConversion
    ? await getRate(paidIn, trip.currency)
    : { data: null }

  await prisma.expense.create({
    data: {
      tripId: trip.id,
      category: input.category,
      label: input.label,
      amount: rate ? convert(input.amount, rate.rate) : input.amount,
      date: parseDateUTC(input.date),
      originalAmount: rate ? input.amount : null,
      originalCurrency: rate ? paidIn : null,
      fxRate: rate ? rate.rate : null,
      fxRateAt: rate ? new Date(rate.at) : null,
    },
  })

  revalidatePath(`/trips/${trip.id}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: trip.id }
})

export const deleteExpense = action(DeleteExpenseInput, async (input) => {
  const user = await requireUser()

  // Verify ownership through parent trip in the query
  const expense = await prisma.expense.findFirst({
    where: {
      id: input.expenseId,
      trip: { userId: user.id },
    },
    include: { trip: true },
  })

  if (!expense) notFound()

  await prisma.expense.delete({
    where: { id: expense.id },
  })

  revalidatePath(`/trips/${expense.tripId}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: expense.tripId }
})
