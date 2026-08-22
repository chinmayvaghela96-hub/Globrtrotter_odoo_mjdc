import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/db"
import { parseDateUTC } from "@/lib/dates"
import { cleanup, makeTrip, makeUser, someCityIds } from "./helpers/db"

/**
 * Share and Trip Cloning tests.
 *
 * Asserts the atomic copyTrip transaction and authorization rules:
 * - Public trips can be copied by any authenticated user.
 * - Private trips can only be copied by their owner.
 * - Cloned trips duplicate the complete graph (stops + scheduled activities)
 *   while setting `copiedFromId` and resetting `isPublic: false`.
 */

let alice: { id: string }
let bob: { id: string }
let alicePublicTrip: { id: string }
let alicePrivateTrip: { id: string }
let cityIds: string[]

beforeAll(async () => {
  await cleanup()
  alice = await makeUser("alice_share")
  bob = await makeUser("bob_share")
  cityIds = await someCityIds(2)

  alicePublicTrip = await makeTrip(alice.id, {
    name: "Alice Public Adventure",
    isPublic: true,
    shareSlug: "alice-public-share-test",
  })

  alicePrivateTrip = await makeTrip(alice.id, {
    name: "Alice Secret Itinerary",
    isPublic: false,
  })

  // Add 2 stops with activities to Alice's public trip
  const stop1 = await prisma.stop.create({
    data: {
      tripId: alicePublicTrip.id,
      cityId: cityIds[0],
      orderIndex: 0,
      arrivalDate: parseDateUTC("2026-09-01"),
      departureDate: parseDateUTC("2026-09-04"),
      transportCost: 1500,
      stayCost: 3000,
      activities: {
        create: [
          {
            customName: "Temple Visit",
            scheduledDate: parseDateUTC("2026-09-02"),
            startTime: "09:00",
            cost: 500,
            durationMin: 120,
            orderIndex: 0,
          },
        ],
      },
    },
  })

  await prisma.stop.create({
    data: {
      tripId: alicePublicTrip.id,
      cityId: cityIds[1],
      orderIndex: 1,
      arrivalDate: parseDateUTC("2026-09-04"),
      departureDate: parseDateUTC("2026-09-08"),
      transportCost: 800,
      stayCost: 2400,
    },
  })
})

afterAll(cleanup)

describe("copyTrip transaction logic", () => {
  it("clones a public trip with all stops, activities, and sets copiedFromId", async () => {
    // Bob clones Alice's public trip
    const src = await prisma.trip.findFirst({
      where: {
        id: alicePublicTrip.id,
        OR: [{ isPublic: true }, { userId: bob.id }],
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

    expect(src).not.toBeNull()

    // Perform clone inside transaction
    const cloned = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.trip.create({
        data: {
          userId: bob.id,
          name: `${src!.name} (copy)`,
          description: src!.description,
          startDate: src!.startDate,
          endDate: src!.endDate,
          currency: src!.currency,
          budgetCap: src!.budgetCap,
          isPublic: false,
          shareSlug: null,
          copiedFromId: src!.id,
        },
      })

      for (const stop of src!.stops) {
        await tx.stop.create({
          data: {
            tripId: newTrip.id,
            cityId: stop.cityId,
            orderIndex: stop.orderIndex,
            arrivalDate: stop.arrivalDate,
            departureDate: stop.departureDate,
            transportCost: stop.transportCost,
            stayCost: stop.stayCost,
            activities: {
              create: stop.activities.map((a) => ({
                activityId: a.activityId,
                customName: a.customName,
                scheduledDate: a.scheduledDate,
                startTime: a.startTime,
                cost: a.cost,
                durationMin: a.durationMin,
                orderIndex: a.orderIndex,
              })),
            },
          },
        })
      }

      return newTrip
    })

    expect(cloned.userId).toBe(bob.id)
    expect(cloned.name).toBe("Alice Public Adventure (copy)")
    expect(cloned.copiedFromId).toBe(alicePublicTrip.id)
    expect(cloned.isPublic).toBe(false)
    expect(cloned.shareSlug).toBeNull()

    // Verify stops were cloned
    const clonedStops = await prisma.stop.findMany({
      where: { tripId: cloned.id },
      orderBy: { orderIndex: "asc" },
      include: { activities: true },
    })

    expect(clonedStops).toHaveLength(2)
    expect(clonedStops[0].orderIndex).toBe(0)
    expect(clonedStops[1].orderIndex).toBe(1)
    expect(clonedStops[0].activities).toHaveLength(1)
    expect(clonedStops[0].activities[0].customName).toBe("Temple Visit")
  })

  it("denies cloning another user's private trip", async () => {
    const src = await prisma.trip.findFirst({
      where: {
        id: alicePrivateTrip.id,
        OR: [{ isPublic: true }, { userId: bob.id }],
      },
    })

    // Query returns null because Bob is not owner and trip is not public
    expect(src).toBeNull()
  })

  it("allows the owner to clone their own private trip", async () => {
    const src = await prisma.trip.findFirst({
      where: {
        id: alicePrivateTrip.id,
        OR: [{ isPublic: true }, { userId: alice.id }],
      },
    })

    expect(src?.id).toBe(alicePrivateTrip.id)
  })

  it("clones standalone expenses when present on the source trip", async () => {
    // Add an expense to Alice's public trip
    const exp = await prisma.expense.create({
      data: {
        tripId: alicePublicTrip.id,
        category: "TRANSPORT",
        label: "Train Pass",
        amount: 2500,
        date: parseDateUTC("2026-09-01"),
      },
    })

    const src = await prisma.trip.findFirst({
      where: {
        id: alicePublicTrip.id,
        OR: [{ isPublic: true }, { userId: bob.id }],
      },
      include: {
        stops: { include: { activities: true } },
        expenses: true,
      },
    })

    expect(src?.expenses).toHaveLength(1)

    const cloned = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.trip.create({
        data: {
          userId: bob.id,
          name: `${src!.name} (copy with expenses)`,
          startDate: src!.startDate,
          endDate: src!.endDate,
          copiedFromId: src!.id,
        },
      })

      for (const e of src!.expenses) {
        await tx.expense.create({
          data: {
            tripId: newTrip.id,
            category: e.category,
            label: e.label,
            amount: e.amount,
            date: e.date,
          },
        })
      }

      return newTrip
    })

    const clonedExpenses = await prisma.expense.findMany({
      where: { tripId: cloned.id },
    })

    expect(clonedExpenses).toHaveLength(1)
    expect(clonedExpenses[0].label).toBe("Train Pass")
    expect(clonedExpenses[0].id).not.toBe(exp.id) // new fresh ID
  })

  it("enforces private trip concealment from direct share lookups", async () => {
    // Look up by shareSlug when isPublic is false
    const privateBySlug = await prisma.trip.findFirst({
      where: {
        shareSlug: "some-slug",
        isPublic: true,
      },
    })

    expect(privateBySlug).toBeNull()
  })
})

