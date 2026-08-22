import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"

/**
 * The stop-ordering invariant, and the transactions that hold it.
 *
 * **Invariant:** for any trip, its stops carry `orderIndex` values that are
 * exactly `0..n-1` — contiguous, unique, gap-free.
 *
 * It is held here rather than by a database constraint because Postgres
 * validates a unique index per statement, so renumbering would trip it on the
 * intermediate state, and Prisma cannot declare the constraint `DEFERRABLE`.
 * `Stop` therefore carries `@@index([tripId, orderIndex])`, not `@@unique`.
 *
 * Kept free of Next imports so `tests/reorder.test.ts` can assert the
 * invariant directly after every kind of mutation.
 */

/** Current stop ids for a trip, in display order. */
async function orderedStopIds(tx: Prisma.TransactionClient, tripId: string) {
  const stops = await tx.stop.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
    select: { id: true },
  })
  return stops.map((stop) => stop.id)
}

/** Writes 0..n-1 across the given sequence, restoring the invariant. */
async function writeOrder(tx: Prisma.TransactionClient, ids: string[]) {
  for (const [index, id] of ids.entries()) {
    await tx.stop.update({ where: { id }, data: { orderIndex: index } })
  }
}

export type NewStop = {
  tripId: string
  cityId: string
  arrivalDate: Date
  departureDate: Date
}

/** Appends a stop, then renumbers so a pre-existing gap cannot survive. */
export async function appendStop(stop: NewStop) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.stop.count({ where: { tripId: stop.tripId } })

    const created = await tx.stop.create({
      data: {
        tripId: stop.tripId,
        cityId: stop.cityId,
        orderIndex: count,
        arrivalDate: stop.arrivalDate,
        departureDate: stop.departureDate,
      },
    })

    await writeOrder(tx, await orderedStopIds(tx, stop.tripId))
    return created
  })
}

/** Deletes a stop and compacts the gap it leaves behind. */
export async function deleteStopAndCompact(stopId: string, tripId: string) {
  return prisma.$transaction(async (tx) => {
    // Scheduled activities go with it via onDelete: Cascade.
    await tx.stop.delete({ where: { id: stopId } })
    await writeOrder(tx, await orderedStopIds(tx, tripId))
  })
}

/**
 * Moves a stop to a new position.
 *
 * Renumbers the whole sibling list rather than swapping two rows: a swap
 * needs a temporary index to dodge collisions and still leaves gaps behind
 * after a delete, whereas renumbering restores `0..n-1` unconditionally.
 * At most a handful of stops per trip, so O(n) is free.
 */
export async function reorderStop(tripId: string, stopId: string, toIndex: number) {
  return prisma.$transaction(async (tx) => {
    const ids = await orderedStopIds(tx, tripId)

    const from = ids.indexOf(stopId)
    if (from === -1) return false

    const to = Math.min(Math.max(toIndex, 0), ids.length - 1)
    if (from === to) return true

    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)

    await writeOrder(tx, ids)
    return true
  })
}

/** The current order, for assertions and for rendering. */
export async function stopOrder(tripId: string) {
  return prisma.stop.findMany({
    where: { tripId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true, cityId: true },
  })
}
