import { afterAll, beforeEach, describe, expect, it } from "vitest"
import {
  appendTripActivity,
  deleteTripActivityAndCompact,
  reorderTripActivity,
  tripActivityOrder,
} from "@/lib/activity-order"
import { findOwnedStop, findOwnedTripActivity } from "@/lib/authz"
import { getSavedCityIds } from "@/lib/catalogue-queries"
import { prisma } from "@/lib/db"
import { parseDateUTC } from "@/lib/dates"
import { cleanup, makeTrip, makeUser, someCityIds } from "./helpers/db"

/**
 * The scheduled-activity invariant, and the ids that must not cross a user.
 *
 * `TripActivity` carries `@@index([stopId, scheduledDate])` and no unique
 * constraint on `orderIndex`, for the same reason as `Stop`: Postgres
 * validates a unique index per statement, so renumbering 0..n-1 trips it on
 * the intermediate state, and Prisma cannot declare the constraint
 * DEFERRABLE. The invariant is held by the transactions in
 * `lib/activity-order.ts` instead, and this file is the proof — the sibling
 * of `tests/reorder.test.ts`, one level further down the trip graph.
 *
 * The scope is the part worth proving. Indices run 0..n-1 within one stop
 * *and one calendar day*, so two activities on different days of the same
 * stop both legitimately sit at index 0. A `(stop)`-scoped implementation
 * passes every single-day assertion here and only breaks once a stop spans a
 * second day, which is the ordinary case.
 */

const DAY_ONE = "2026-09-01"
const DAY_TWO = "2026-09-02"

let owner: { id: string }
let stranger: { id: string }
let stopId: string
let cityId: string
let catalogueActivityId: string

/** Appends one custom activity, labelled so the order reads back by name. */
async function addActivity(day: string, label: string) {
  return appendTripActivity({
    stopId,
    activityId: null,
    customName: label,
    scheduledDate: parseDateUTC(day),
    startTime: null,
    cost: 0,
    durationMin: 60,
  })
}

/** Fills a day in order and hands back the rows, for the mutations below. */
async function fillDay(day: string, labels: string[]) {
  for (const label of labels) await addActivity(day, label)
  return tripActivityOrder(stopId, parseDateUTC(day))
}

/** Within one day, indices must be exactly 0..n-1: contiguous, gap-free. */
async function expectInvariant(day: string) {
  const scheduled = await tripActivityOrder(stopId, parseDateUTC(day))
  expect(scheduled.map((item) => item.orderIndex)).toEqual(
    Array.from({ length: scheduled.length }, (_, index) => index),
  )
  return scheduled
}

/** One day's labels in display order, after asserting the invariant on it. */
async function labelsOn(day: string) {
  return (await expectInvariant(day)).map((item) => item.customName)
}

beforeEach(async () => {
  await cleanup()

  owner = await makeUser("catalogue-owner")
  stranger = await makeUser("catalogue-stranger")

  const trip = await makeTrip(owner.id)
  ;[cityId] = await someCityIds(1)

  const stop = await prisma.stop.create({
    data: {
      tripId: trip.id,
      cityId,
      orderIndex: 0,
      arrivalDate: parseDateUTC(DAY_ONE),
      departureDate: parseDateUTC("2026-09-03"),
    },
  })
  stopId = stop.id

  const activity = await prisma.activity.findFirst({ where: { cityId } })
  if (!activity) {
    throw new Error(`City ${cityId} has no activities. Run: npm run db:seed`)
  }
  catalogueActivityId = activity.id
})

afterAll(cleanup)

describe("scheduled activity ordering", () => {
  it("appends a day's activities as 0, 1, 2", async () => {
    await fillDay(DAY_ONE, ["museum", "lunch", "river walk"])

    expect(await labelsOn(DAY_ONE)).toEqual(["museum", "lunch", "river walk"])
  })

  it("starts every day of the same stop at index 0", async () => {
    // The scope test. Numbering per (stop, day) means a second day begins
    // again at zero; a (stop)-scoped implementation would land it at 1 and
    // still pass every other assertion in this describe block.
    const first = await addActivity(DAY_ONE, "museum")
    const second = await addActivity(DAY_TWO, "day trip")

    expect(first.orderIndex).toBe(0)
    expect(second.orderIndex).toBe(0)
    await expectInvariant(DAY_ONE)
    await expectInvariant(DAY_TWO)
  })

  it("renumbers the day it moved within and leaves the other day alone", async () => {
    const dayOne = await fillDay(DAY_ONE, ["museum", "lunch", "river walk"])
    await fillDay(DAY_TWO, ["market", "sunset"])

    const moved = await reorderTripActivity(
      stopId,
      parseDateUTC(DAY_ONE),
      dayOne[2].id,
      0,
    )

    expect(moved).toBe(true)
    expect(await labelsOn(DAY_ONE)).toEqual(["river walk", "museum", "lunch"])
    expect(await labelsOn(DAY_TWO)).toEqual(["market", "sunset"])
  })

  it("clamps an out-of-range target instead of corrupting the day", async () => {
    const dayOne = await fillDay(DAY_ONE, ["museum", "lunch", "river walk"])

    await reorderTripActivity(stopId, parseDateUTC(DAY_ONE), dayOne[0].id, 99)

    expect(await labelsOn(DAY_ONE)).toEqual(["lunch", "river walk", "museum"])
  })

  it("is a no-op when the target is where the activity already sits", async () => {
    const dayOne = await fillDay(DAY_ONE, ["museum", "lunch", "river walk"])

    expect(
      await reorderTripActivity(stopId, parseDateUTC(DAY_ONE), dayOne[1].id, 1),
    ).toBe(true)

    expect(await labelsOn(DAY_ONE)).toEqual(["museum", "lunch", "river walk"])
  })

  it("closes the gap when an activity in the middle of a day is removed", async () => {
    const dayOne = await fillDay(DAY_ONE, ["museum", "lunch", "river walk"])
    await fillDay(DAY_TWO, ["market"])

    await deleteTripActivityAndCompact(
      dayOne[1].id,
      stopId,
      parseDateUTC(DAY_ONE),
    )

    expect(await labelsOn(DAY_ONE)).toEqual(["museum", "river walk"])
    expect(await labelsOn(DAY_TWO)).toEqual(["market"])
  })

  it("reports failure rather than moving an activity into another day", async () => {
    await fillDay(DAY_ONE, ["museum", "lunch"])
    const [dayTwo] = await fillDay(DAY_TWO, ["market"])

    // A real id, but not one of day one's — the bucket is (stop, day), so it
    // is exactly as foreign here as an id from somebody else's trip.
    const moved = await reorderTripActivity(
      stopId,
      parseDateUTC(DAY_ONE),
      dayTwo.id,
      0,
    )

    expect(moved).toBe(false)
    expect(await labelsOn(DAY_ONE)).toEqual(["museum", "lunch"]) // untouched
    expect(await labelsOn(DAY_TWO)).toEqual(["market"])
  })

  it("holds the invariant on both days through a long mixed sequence", async () => {
    const day = parseDateUTC(DAY_ONE)
    await fillDay(DAY_ONE, ["museum", "lunch", "river walk"])
    await fillDay(DAY_TWO, ["market", "sunset"])

    const at = async (index: number) =>
      (await tripActivityOrder(stopId, day))[index].id

    await reorderTripActivity(stopId, day, await at(2), 0)
    await expectInvariant(DAY_ONE)

    await deleteTripActivityAndCompact(await at(1), stopId, day)
    await expectInvariant(DAY_ONE)

    await addActivity(DAY_ONE, "night market")
    await expectInvariant(DAY_ONE)

    await reorderTripActivity(stopId, day, await at(0), 99)

    expect(await labelsOn(DAY_ONE)).toEqual([
      "lunch",
      "night market",
      "river walk",
    ])
    expect(await labelsOn(DAY_TWO)).toEqual(["market", "sunset"]) // never touched
  })
})

describe("nested resource ownership", () => {
  it("lets the owner reach a scheduled activity through stop and trip", async () => {
    const created = await appendTripActivity({
      stopId,
      activityId: catalogueActivityId,
      customName: null,
      scheduledDate: parseDateUTC(DAY_ONE),
      startTime: "09:30",
      cost: 1200,
      durationMin: 90,
    })

    const found = await findOwnedTripActivity(owner.id, created.id)

    expect(found?.id).toBe(created.id)
    expect(found?.activityId).toBe(catalogueActivityId)
    expect(found?.stop.id).toBe(stopId) // the parent comes back with it
  })

  it("blocks another user holding a real tripActivity id", async () => {
    // Two relations deep: activity -> stop -> trip -> user. The stranger has
    // the correct id and still gets nothing, because ownership is part of the
    // query rather than a check that runs after the row is already fetched.
    const created = await addActivity(DAY_ONE, "museum")

    expect(await findOwnedTripActivity(stranger.id, created.id)).toBeNull()
  })

  it("blocks another user holding a real stop id", async () => {
    expect((await findOwnedStop(owner.id, stopId))?.id).toBe(stopId)
    expect(await findOwnedStop(stranger.id, stopId)).toBeNull()
  })
})

describe("saved cities", () => {
  it("scopes a save to the user who made it", async () => {
    const [first, second] = await someCityIds(2)

    await prisma.savedCity.create({ data: { userId: owner.id, cityId: first } })
    await prisma.savedCity.create({ data: { userId: owner.id, cityId: second } })
    await prisma.savedCity.create({
      data: { userId: stranger.id, cityId: first },
    })

    // The same city saved by two users is two rows, and neither user's list
    // is widened by the other's.
    expect(await getSavedCityIds(owner.id)).toEqual(new Set([first, second]))
    expect(await getSavedCityIds(stranger.id)).toEqual(new Set([first]))
  })

  it("refuses the same city twice for the same user", async () => {
    await prisma.savedCity.create({ data: { userId: owner.id, cityId } })

    // The composite primary key [userId, cityId] is what makes this a
    // conflict — there is no surrogate id to make a duplicate look new.
    await expect(
      prisma.savedCity.create({ data: { userId: owner.id, cityId } }),
    ).rejects.toThrow()

    expect(await getSavedCityIds(owner.id)).toEqual(new Set([cityId]))
  })
})
