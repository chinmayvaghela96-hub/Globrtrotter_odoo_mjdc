import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

/**
 * The scheduled-activity ordering invariant.
 *
 * **Invariant:** within one stop *and one calendar day*, the scheduled
 * activities carry `orderIndex` values that are exactly `0..n-1`.
 *
 * The scope is (stop, day), not (stop): two activities on different days of
 * the same stop both legitimately sit at index 0. Same reasoning as
 * `lib/stop-order.ts` for why this is held by a transaction rather than a
 * unique constraint, and it is kept free of Next imports for the same reason
 * — `tests/catalogue.test.ts` asserts it directly.
 */

async function orderedIds(
  tx: Prisma.TransactionClient,
  stopId: string,
  scheduledDate: Date,
) {
  const rows = await tx.tripActivity.findMany({
    where: { stopId, scheduledDate },
    orderBy: { orderIndex: "asc" },
    select: { id: true },
  })
  return rows.map((row) => row.id)
}

async function writeOrder(tx: Prisma.TransactionClient, ids: string[]) {
  for (const [index, id] of ids.entries()) {
    await tx.tripActivity.update({ where: { id }, data: { orderIndex: index } })
  }
}

export type NewTripActivity = {
  stopId: string
  activityId: string | null
  customName: string | null
  scheduledDate: Date
  startTime: string | null
  /**
   * Snapshotted at add time, never read live from the catalogue: a later
   * price change must not silently rewrite a budget the user already saw.
   */
  cost: number
  durationMin: number
}

export async function appendTripActivity(entry: NewTripActivity) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.tripActivity.count({
      where: { stopId: entry.stopId, scheduledDate: entry.scheduledDate },
    })

    const created = await tx.tripActivity.create({
      data: {
        stopId: entry.stopId,
        activityId: entry.activityId,
        customName: entry.customName,
        scheduledDate: entry.scheduledDate,
        startTime: entry.startTime,
        cost: entry.cost,
        durationMin: entry.durationMin,
        orderIndex: count,
      },
    })

    await writeOrder(tx, await orderedIds(tx, entry.stopId, entry.scheduledDate))
    return created
  })
}

export async function deleteTripActivityAndCompact(
  tripActivityId: string,
  stopId: string,
  scheduledDate: Date,
) {
  return prisma.$transaction(async (tx) => {
    await tx.tripActivity.delete({ where: { id: tripActivityId } })
    await writeOrder(tx, await orderedIds(tx, stopId, scheduledDate))
  })
}

/** Reorders within a single day of a single stop. */
export async function reorderTripActivity(
  stopId: string,
  scheduledDate: Date,
  tripActivityId: string,
  toIndex: number,
) {
  return prisma.$transaction(async (tx) => {
    const ids = await orderedIds(tx, stopId, scheduledDate)

    const from = ids.indexOf(tripActivityId)
    if (from === -1) return false

    const to = Math.min(Math.max(toIndex, 0), ids.length - 1)
    if (from === to) return true

    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)

    await writeOrder(tx, ids)
    return true
  })
}

/** The current order for one day, for assertions and rendering. */
export async function tripActivityOrder(stopId: string, scheduledDate: Date) {
  return prisma.tripActivity.findMany({
    where: { stopId, scheduledDate },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true, activityId: true, customName: true },
  })
}
