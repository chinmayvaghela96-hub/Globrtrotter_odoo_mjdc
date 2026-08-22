"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { formatDateUTC, parseDateUTC } from "@/lib/dates"
import { fail } from "@/lib/result"
import { requireStopOwner, requireTripOwner } from "@/lib/guard"
import { appendStop, deleteStopAndCompact, reorderStop } from "@/lib/stop-order"

/**
 * This layer does authorization, validation and cache invalidation only. The
 * atomic data work lives in `lib/stop-order.ts`, which holds the 0..n-1
 * ordering invariant and is tested directly.
 */

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")

const money = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? 0 : value),
  z.coerce.number({ message: "Enter a number." }).nonnegative("Costs cannot be negative."),
)

const AddStopInput = z
  .object({
    tripId: z.string().min(1),
    cityId: z.string().min(1, "Choose a city."),
    arrivalDate: dateString,
    departureDate: dateString,
  })
  .refine((input) => input.departureDate >= input.arrivalDate, {
    message: "Departure cannot be before arrival.",
    path: ["departureDate"],
  })

const MoveStopInput = z.object({
  stopId: z.string().min(1),
  toIndex: z.coerce.number().int().min(0),
})

const StopIdInput = z.object({ stopId: z.string().min(1) })

const UpdateStopInput = z.object({
  stopId: z.string().min(1),
  transportCost: money,
  stayCost: money,
})

export const addStop = action(AddStopInput, async (input) => {
  const { trip } = await requireTripOwner(input.tripId)

  // A stop has to fall inside the trip it belongs to. Enforced here because
  // the min/max on the date inputs is only a convenience.
  const tripStart = formatDateUTC(trip.startDate)
  const tripEnd = formatDateUTC(trip.endDate)
  if (input.arrivalDate < tripStart || input.departureDate > tripEnd) {
    return fail("Check the highlighted fields.", {
      arrivalDate: `This trip runs ${tripStart} to ${tripEnd}.`,
    })
  }

  await appendStop({
    tripId: trip.id,
    cityId: input.cityId,
    arrivalDate: parseDateUTC(input.arrivalDate),
    departureDate: parseDateUTC(input.departureDate),
  })

  revalidatePath(`/trips/${trip.id}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: trip.id }
})

export const removeStop = action(StopIdInput, async (input) => {
  const { stop } = await requireStopOwner(input.stopId)

  await deleteStopAndCompact(stop.id, stop.tripId)

  revalidatePath(`/trips/${stop.tripId}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: stop.tripId }
})

export const moveStop = action(MoveStopInput, async (input) => {
  const { stop } = await requireStopOwner(input.stopId)

  await reorderStop(stop.tripId, stop.id, input.toIndex)

  revalidatePath(`/trips/${stop.tripId}`, "layout")
  return { tripId: stop.tripId }
})

/**
 * Single-row update, so no transaction: Postgres already applies it
 * atomically and wrapping it would add ceremony without a guarantee.
 */
export const updateStopCosts = action(UpdateStopInput, async (input) => {
  const { stop } = await requireStopOwner(input.stopId)

  await prisma.stop.update({
    where: { id: stop.id },
    data: { transportCost: input.transportCost, stayCost: input.stayCost },
  })

  revalidatePath(`/trips/${stop.tripId}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: stop.tripId }
})
