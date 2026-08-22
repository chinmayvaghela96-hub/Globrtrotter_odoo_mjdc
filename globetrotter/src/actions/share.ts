"use server"

import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import { z } from "zod"
import { nanoid } from "nanoid"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { requireTripOwner } from "@/lib/guard"

const ToggleShareInput = z.object({
  tripId: z.string().min(1),
})

const CopyTripInput = z.object({
  sourceId: z.string().min(1),
})

/**
 * Single-row update: Postgres updates this atomically, so wrapping it
 * in a $transaction would add ceremony without adding a guarantee.
 */
export const toggleShare = action(ToggleShareInput, async ({ tripId }) => {
  const { trip } = await requireTripOwner(tripId)

  const willBePublic = !trip.isPublic
  const shareSlug = willBePublic ? (trip.shareSlug ?? nanoid(10)) : null

  await prisma.trip.update({
    where: { id: trip.id },
    data: {
      isPublic: willBePublic,
      shareSlug,
    },
  })

  revalidatePath(`/trips/${trip.id}`, "layout")
  revalidatePath("/trips")
  revalidatePath("/dashboard")

  return { isPublic: willBePublic, shareSlug }
})

/**
 * Atomic clone of an entire trip graph.
 *
 * A half-copied itinerary — a trip with no stops, or stops with no
 * activities — is worse than a copy that failed, because the user cannot
 * tell it is broken. So the whole clone is one atomic unit, and authorization
 * is evaluated inside the same transaction in the where clause.
 */
export const copyTrip = action(CopyTripInput, async ({ sourceId }, user) => {
  const copy = await prisma.$transaction(async (tx) => {
    // 1. Authorization inside the query where clause
    const src = await tx.trip.findFirst({
      where: {
        id: sourceId,
        OR: [{ isPublic: true }, { userId: user.id }],
      },
      include: {
        stops: {
          orderBy: { orderIndex: "asc" },
          include: {
            activities: {
              orderBy: [{ scheduledDate: "asc" }, { orderIndex: "asc" }],
            },
          },
        },
        expenses: true,
      },
    })

    if (!src) notFound()

    // 2. Create the destination trip shell
    const newTrip = await tx.trip.create({
      data: {
        userId: user.id,
        name: `${src.name} (copy)`,
        description: src.description,
        startDate: src.startDate,
        endDate: src.endDate,
        currency: src.currency,
        budgetCap: src.budgetCap,
        coverUrl: src.coverUrl,
        isPublic: false,
        shareSlug: null, // a copy is never born public
        copiedFromId: src.id, // self-relation for provenance
      },
    })

    // 3. Clone each stop and its activities
    for (const stop of src.stops) {
      await tx.stop.create({
        data: {
          tripId: newTrip.id,
          cityId: stop.cityId,
          orderIndex: stop.orderIndex,
          arrivalDate: stop.arrivalDate,
          departureDate: stop.departureDate,
          transportCost: stop.transportCost,
          stayCost: stop.stayCost,
          notes: stop.notes,
          activities: {
            create: stop.activities.map((act) => ({
              activityId: act.activityId,
              customName: act.customName,
              scheduledDate: act.scheduledDate,
              startTime: act.startTime,
              cost: act.cost,
              durationMin: act.durationMin,
              orderIndex: act.orderIndex,
              notes: act.notes,
            })),
          },
        },
      })
    }

    // 4. Clone standalone trip expenses if any
    for (const exp of src.expenses) {
      await tx.expense.create({
        data: {
          tripId: newTrip.id,
          category: exp.category,
          label: exp.label,
          amount: exp.amount,
          date: exp.date,
        },
      })
    }

    return newTrip
  })

  revalidatePath("/trips")
  revalidatePath("/dashboard")
  redirect(`/trips/${copy.id}/build`)
})
