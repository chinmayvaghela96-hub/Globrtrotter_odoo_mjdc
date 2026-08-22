"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { formatDateUTC, parseDateUTC } from "@/lib/dates"
import { rejectField } from "@/lib/result"
import { requireStopOwner, requireTripActivityOwner } from "@/lib/guard"
import {
  appendTripActivity,
  deleteTripActivityAndCompact,
  reorderTripActivity,
} from "@/lib/activity-order"

/**
 * Scheduling activities onto a stop.
 *
 * Authorization walks two relations — a scheduled activity belongs to a stop,
 * which belongs to a trip, which belongs to a user — and that walk happens
 * inside the query via `requireStopOwner` / `requireTripActivityOwner`.
 */

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time like 09:30.")

const AddActivityInput = z.object({
  stopId: z.string().min(1),
  activityId: z.string().min(1, "Choose an activity."),
  scheduledDate: dateString,
  startTime: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    timeString.optional(),
  ),
})

const AddCustomActivityInput = z.object({
  stopId: z.string().min(1),
  customName: z.string().trim().min(2, "Give it a name."),
  scheduledDate: dateString,
  startTime: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    timeString.optional(),
  ),
  cost: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : value),
    z.coerce.number({ message: "Enter a number." }).nonnegative("Cost cannot be negative."),
  ),
  durationMin: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 60 : value),
    z.coerce.number().int().min(5, "At least 5 minutes.").max(1440, "At most 24 hours."),
  ),
})

const TripActivityIdInput = z.object({ tripActivityId: z.string().min(1) })

const MoveTripActivityInput = z.object({
  tripActivityId: z.string().min(1),
  toIndex: z.coerce.number().int().min(0),
})

/** A scheduled activity has to fall on a day the traveller is actually there. */
function outsideStop(
  scheduledDate: string,
  stop: { arrivalDate: Date; departureDate: Date },
) {
  const from = formatDateUTC(stop.arrivalDate)
  const to = formatDateUTC(stop.departureDate)
  return scheduledDate < from || scheduledDate > to
    ? `This stop runs ${from} to ${to}.`
    : null
}

export const addActivityToStop = action(AddActivityInput, async (input) => {
  const { stop } = await requireStopOwner(input.stopId)

  const dateError = outsideStop(input.scheduledDate, stop)
  if (dateError) rejectField("scheduledDate", dateError)

  // The catalogue entry must belong to the city the stop is in, otherwise a
  // forged id could schedule a Paris tour during a Bangkok stop.
  const activity = await prisma.activity.findFirst({
    where: { id: input.activityId, cityId: stop.cityId },
  })
  if (!activity) {
    rejectField("activityId", "That activity is not available in this city.")
  }

  await appendTripActivity({
    stopId: stop.id,
    activityId: activity.id,
    customName: null,
    scheduledDate: parseDateUTC(input.scheduledDate),
    startTime: input.startTime ?? null,
    // Snapshot, not a live lookup — see lib/activity-order.ts.
    cost: activity.cost.toNumber(),
    durationMin: activity.durationMin,
  })

  revalidatePath(`/trips/${stop.tripId}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: stop.tripId }
})

export const addCustomActivity = action(AddCustomActivityInput, async (input) => {
  const { stop } = await requireStopOwner(input.stopId)

  const dateError = outsideStop(input.scheduledDate, stop)
  if (dateError) rejectField("scheduledDate", dateError)

  await appendTripActivity({
    stopId: stop.id,
    activityId: null, // not from the catalogue
    customName: input.customName,
    scheduledDate: parseDateUTC(input.scheduledDate),
    startTime: input.startTime ?? null,
    cost: input.cost,
    durationMin: input.durationMin,
  })

  revalidatePath(`/trips/${stop.tripId}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: stop.tripId }
})

export const removeTripActivity = action(TripActivityIdInput, async (input) => {
  const { tripActivity } = await requireTripActivityOwner(input.tripActivityId)

  await deleteTripActivityAndCompact(
    tripActivity.id,
    tripActivity.stopId,
    tripActivity.scheduledDate,
  )

  revalidatePath(`/trips/${tripActivity.stop.tripId}`, "layout")
  revalidatePath("/dashboard")
  return { tripId: tripActivity.stop.tripId }
})

export const moveTripActivity = action(MoveTripActivityInput, async (input) => {
  const { tripActivity } = await requireTripActivityOwner(input.tripActivityId)

  await reorderTripActivity(
    tripActivity.stopId,
    tripActivity.scheduledDate,
    tripActivity.id,
    input.toIndex,
  )

  revalidatePath(`/trips/${tripActivity.stop.tripId}`, "layout")
  return { tripId: tripActivity.stop.tripId }
})
