import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/db"
import { parseDateUTC } from "@/lib/dates"
import {
  findOwnedStop,
  findOwnedTrip,
  findReadableTrip,
  findTripByShareSlug,
} from "@/lib/authz"
import { cleanup, makeTrip, makeUser, someCityIds } from "./helpers/db"

/**
 * The IDOR tests.
 *
 * This is the file that turns "authorization works" from a claim into a
 * demonstration: user B is given user A's real ids and gets nothing back,
 * because ownership is part of the query rather than a check that runs after
 * it. Every predicate returns null, and every caller turns null into a 404 —
 * never a 403, which would confirm the id exists.
 */

let alice: { id: string }
let bob: { id: string }
let alicePrivateTrip: { id: string }
let alicePublicTrip: { id: string }
let aliceStop: { id: string }

beforeAll(async () => {
  await cleanup()

  alice = await makeUser("alice")
  bob = await makeUser("bob")

  alicePrivateTrip = await makeTrip(alice.id, { name: "Alice private" })
  alicePublicTrip = await makeTrip(alice.id, {
    name: "Alice public",
    isPublic: true,
    shareSlug: "alice-public-slug",
  })

  const [cityId] = await someCityIds(1)
  aliceStop = await prisma.stop.create({
    data: {
      tripId: alicePrivateTrip.id,
      cityId,
      orderIndex: 0,
      arrivalDate: parseDateUTC("2026-09-01"),
      departureDate: parseDateUTC("2026-09-03"),
    },
  })
})

afterAll(cleanup)

describe("trip ownership", () => {
  it("lets the owner read their own trip", async () => {
    const trip = await findOwnedTrip(alice.id, alicePrivateTrip.id)
    expect(trip?.id).toBe(alicePrivateTrip.id)
  })

  it("returns nothing when another user supplies a real trip id", async () => {
    // Bob has the correct id. That is the whole point of the test.
    const trip = await findOwnedTrip(bob.id, alicePrivateTrip.id)
    expect(trip).toBeNull()
  })

  it("does not leak a public trip through the owner-only predicate", async () => {
    // Public is a *read* grant, never an ownership grant: Bob must not be
    // able to edit or delete Alice's trip just because she shared it.
    const trip = await findOwnedTrip(bob.id, alicePublicTrip.id)
    expect(trip).toBeNull()
  })

  it("returns nothing for an id that does not exist", async () => {
    // Same answer as "not yours" — indistinguishable by design.
    expect(await findOwnedTrip(alice.id, "no-such-trip-id")).toBeNull()
  })
})

describe("trip read access", () => {
  it("lets anyone read a public trip, including signed-out visitors", async () => {
    expect((await findReadableTrip(bob.id, alicePublicTrip.id))?.id).toBe(
      alicePublicTrip.id,
    )
    expect((await findReadableTrip(null, alicePublicTrip.id))?.id).toBe(
      alicePublicTrip.id,
    )
  })

  it("keeps a private trip private from other users and from anonymous", async () => {
    expect(await findReadableTrip(bob.id, alicePrivateTrip.id)).toBeNull()
    expect(await findReadableTrip(null, alicePrivateTrip.id)).toBeNull()
  })

  it("still lets the owner read their own private trip", async () => {
    expect((await findReadableTrip(alice.id, alicePrivateTrip.id))?.id).toBe(
      alicePrivateTrip.id,
    )
  })
})

describe("share links", () => {
  it("resolves a live share slug", async () => {
    expect((await findTripByShareSlug("alice-public-slug"))?.id).toBe(
      alicePublicTrip.id,
    )
  })

  it("stops resolving once sharing is revoked", async () => {
    await prisma.trip.update({
      where: { id: alicePublicTrip.id },
      data: { isPublic: false, shareSlug: null },
    })

    expect(await findTripByShareSlug("alice-public-slug")).toBeNull()

    // restore, so ordering between test files cannot matter
    await prisma.trip.update({
      where: { id: alicePublicTrip.id },
      data: { isPublic: true, shareSlug: "alice-public-slug" },
    })
  })
})

describe("nested resources", () => {
  it("lets the owner reach a stop through its parent trip", async () => {
    const stop = await findOwnedStop(alice.id, aliceStop.id)
    expect(stop?.id).toBe(aliceStop.id)
  })

  it("blocks another user holding a real stop id", async () => {
    // The case that is easy to get wrong: a stop id is not a trip id, so the
    // ownership filter has to walk the relation inside the query.
    const stop = await findOwnedStop(bob.id, aliceStop.id)
    expect(stop).toBeNull()
  })
})
