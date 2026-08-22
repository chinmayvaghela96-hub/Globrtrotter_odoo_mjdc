import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { parseDateUTC } from "@/lib/dates"
import {
  appendStop,
  deleteStopAndCompact,
  reorderStop,
  stopOrder,
} from "@/lib/stop-order"
import { cleanup, makeTrip, makeUser, someCityIds } from "./helpers/db"

/**
 * The ordering invariant.
 *
 * `Stop` carries `@@index([tripId, orderIndex])`, not `@@unique`, because
 * Postgres validates a unique index per statement and renumbering trips it on
 * the intermediate state — and Prisma cannot declare the constraint
 * DEFERRABLE. So the invariant is held by the transactions in
 * `lib/stop-order.ts`, and this file is the proof.
 */

let tripId: string
let cityIds: string[]

/** Indices must be exactly 0..n-1: contiguous, unique, gap-free. */
async function expectInvariant(id: string) {
  const stops = await stopOrder(id)
  expect(stops.map((stop) => stop.orderIndex)).toEqual(
    Array.from({ length: stops.length }, (_, index) => index),
  )
  return stops
}

async function addCity(cityId: string) {
  return appendStop({
    tripId,
    cityId,
    arrivalDate: parseDateUTC("2026-09-01"),
    departureDate: parseDateUTC("2026-09-03"),
  })
}

beforeEach(async () => {
  await cleanup()
  const user = await makeUser("reorder")
  const trip = await makeTrip(user.id)
  tripId = trip.id
  cityIds = await someCityIds(4)
})

afterAll(cleanup)

describe("stop ordering", () => {
  it("appends stops as 0, 1, 2, 3", async () => {
    for (const cityId of cityIds) await addCity(cityId)

    const stops = await expectInvariant(tripId)
    expect(stops.map((stop) => stop.cityId)).toEqual(cityIds)
  })

  it("moves a stop earlier and shifts the rest down", async () => {
    for (const cityId of cityIds) await addCity(cityId)
    const before = await stopOrder(tripId)

    await reorderStop(tripId, before[2].id, 0)

    const after = await expectInvariant(tripId)
    expect(after.map((stop) => stop.cityId)).toEqual([
      cityIds[2],
      cityIds[0],
      cityIds[1],
      cityIds[3],
    ])
  })

  it("moves a stop later and shifts the rest up", async () => {
    for (const cityId of cityIds) await addCity(cityId)
    const before = await stopOrder(tripId)

    await reorderStop(tripId, before[0].id, 2)

    const after = await expectInvariant(tripId)
    expect(after.map((stop) => stop.cityId)).toEqual([
      cityIds[1],
      cityIds[2],
      cityIds[0],
      cityIds[3],
    ])
  })

  it("clamps an out-of-range target instead of corrupting the list", async () => {
    for (const cityId of cityIds) await addCity(cityId)
    const before = await stopOrder(tripId)

    await reorderStop(tripId, before[0].id, 99)

    const after = await expectInvariant(tripId)
    expect(after.at(-1)?.cityId).toBe(cityIds[0])
  })

  it("is a no-op when the target is where the stop already sits", async () => {
    for (const cityId of cityIds) await addCity(cityId)

    await reorderStop(tripId, (await stopOrder(tripId))[1].id, 1)

    const after = await expectInvariant(tripId)
    expect(after.map((stop) => stop.cityId)).toEqual(cityIds)
  })

  it("closes the gap when a stop in the middle is removed", async () => {
    for (const cityId of cityIds) await addCity(cityId)
    const before = await stopOrder(tripId)

    await deleteStopAndCompact(before[1].id, tripId)

    const after = await expectInvariant(tripId)
    expect(after.map((stop) => stop.cityId)).toEqual([
      cityIds[0],
      cityIds[2],
      cityIds[3],
    ])
  })

  it("holds the invariant through a long mixed sequence", async () => {
    for (const cityId of cityIds) await addCity(cityId)

    await reorderStop(tripId, (await stopOrder(tripId))[3].id, 0)
    await expectInvariant(tripId)

    await deleteStopAndCompact((await stopOrder(tripId))[2].id, tripId)
    await expectInvariant(tripId)

    await addCity(cityIds[1]) // the same city twice is allowed: two visits
    await expectInvariant(tripId)

    await reorderStop(tripId, (await stopOrder(tripId))[0].id, 3)
    const final = await expectInvariant(tripId)

    expect(final).toHaveLength(4)
  })

  it("reports failure rather than reordering a stop from another trip", async () => {
    for (const cityId of cityIds) await addCity(cityId)

    const other = await makeTrip((await makeUser("reorder-other")).id)
    const moved = await reorderStop(other.id, (await stopOrder(tripId))[0].id, 0)

    expect(moved).toBe(false)
    await expectInvariant(tripId) // untouched
  })
})
