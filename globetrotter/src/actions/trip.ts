"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { parseDateUTC } from "@/lib/dates"
import { requireTripOwner } from "@/lib/guard"

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")

/** Form money fields arrive as "" when left blank, which is not the same as 0. */
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce
    .number({ message: "Enter a number." })
    .nonnegative("A budget cannot be negative.")
    .optional(),
)

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().max(500, "Keep it under 500 characters.").optional(),
)

const TripFields = z
  .object({
    name: z.string().trim().min(2, "Give the trip a name."),
    description: optionalText,
    startDate: dateString,
    endDate: dateString,
    budgetCap: optionalMoney,
    currency: z.string().trim().length(3).default("INR"),
  })
  // ISO date strings compare correctly as strings, so no parsing needed here.
  .refine((fields) => fields.endDate >= fields.startDate, {
    message: "The trip cannot end before it starts.",
    path: ["endDate"],
  })

const CreateTripInput = TripFields
const UpdateTripInput = z.intersection(TripFields, z.object({ tripId: z.string().min(1) }))
const TripIdInput = z.object({ tripId: z.string().min(1) })

export const createTrip = action(CreateTripInput, async (input, user) => {
  const trip = await prisma.trip.create({
    data: {
      userId: user.id,
      name: input.name,
      description: input.description ?? null,
      startDate: parseDateUTC(input.startDate),
      endDate: parseDateUTC(input.endDate),
      budgetCap: input.budgetCap ?? null,
      currency: input.currency,
    },
  })

  revalidatePath("/trips")
  revalidatePath("/dashboard")
  redirect(`/trips/${trip.id}/build`)
})

export const updateTrip = action(UpdateTripInput, async (input) => {
  // Ownership is the `where` clause, not an `if` after the fetch.
  const { trip } = await requireTripOwner(input.tripId)

  await prisma.trip.update({
    where: { id: trip.id },
    data: {
      name: input.name,
      description: input.description ?? null,
      startDate: parseDateUTC(input.startDate),
      endDate: parseDateUTC(input.endDate),
      budgetCap: input.budgetCap ?? null,
      currency: input.currency,
    },
  })

  revalidatePath(`/trips/${trip.id}`, "layout")
  revalidatePath("/trips")
  revalidatePath("/dashboard")
  return { tripId: trip.id }
})

/**
 * No `$transaction` here, deliberately: the foreign keys are declared
 * `onDelete: Cascade`, so Postgres removes the stops, scheduled activities
 * and expenses as part of the same atomic statement. Wrapping it would add
 * ceremony without adding a guarantee.
 */
export const deleteTrip = action(TripIdInput, async (input) => {
  const { trip } = await requireTripOwner(input.tripId)

  await prisma.trip.delete({ where: { id: trip.id } })

  revalidatePath("/trips")
  revalidatePath("/dashboard")
  redirect("/trips")
})
