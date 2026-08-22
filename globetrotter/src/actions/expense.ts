"use server"

import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import { z } from "zod"
import { ExpenseCategory } from "@prisma/client"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { parseDateUTC } from "@/lib/dates"
import { requireTripOwner, requireUser } from "@/lib/guard"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")

const AddExpenseInput = z.object({
  tripId: z.string().min(1),
  category: z.nativeEnum(ExpenseCategory),
  label: z.string().trim().min(2, "Give the expense a label.").max(100),
  amount: z.coerce
    .number({ message: "Enter an amount." })
    .positive("Amount must be greater than zero."),
  date: dateString,
})

const DeleteExpenseInput = z.object({
  expenseId: z.string().min(1),
})

export const addExpense = action(AddExpenseInput, async (input) => {
  const { trip } = await requireTripOwner(input.tripId)

  await prisma.expense.create({
    data: {
      tripId: trip.id,
      category: input.category,
      label: input.label,
      amount: input.amount,
      date: parseDateUTC(input.date),
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
