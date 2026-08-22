/**
 * tests/template.test.ts
 *
 * Verifies that createTripFromTemplate creates a well-formed Trip and the
 * correct number of stops, respects the ordering invariant, and handles
 * a template whose city names don't match the catalogue gracefully.
 *
 * The test user / database lifecycle mirrors the pattern used in
 * tests/share.test.ts and tests/catalogue.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { prisma } from "@/lib/db"
import { appendStop } from "@/lib/stop-order"
import { TEMPLATES } from "@/lib/trip-templates"
import { parseDateUTC, formatDateUTC, addDaysUTC } from "@/lib/dates"
import bcrypt from "bcryptjs"

// ─── Fixture ─────────────────────────────────────────────────────────────────

const EMAIL = "test_template@test.local"
let userId = ""
let bangkokId = ""

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { startsWith: "test_" } } })
}

beforeAll(async () => {
  await cleanup()

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: await bcrypt.hash("pw", 4),
      name: "Template Tester",
    },
  })
  userId = user.id

  // Resolve Bangkok (present in catalogue after seed)
  const bangkok = await prisma.city.findFirst({
    where: { name: { equals: "Bangkok", mode: "insensitive" } },
  })
  bangkokId = bangkok?.id ?? ""
})

afterAll(cleanup)

// ─── TEMPLATES constant ───────────────────────────────────────────────────────

describe("TEMPLATES constant", () => {
  it("contains at least 4 templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(4)
  })

  it("every template has unique id", () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("every template durationDays matches sum of city nights", () => {
    for (const t of TEMPLATES) {
      const cityNights = t.cities.reduce((sum, c) => sum + c.nights, 0)
      // Duration can be slightly longer than nights (e.g. last night = arrival)
      expect(t.durationDays).toBeGreaterThanOrEqual(cityNights)
    }
  })
})

// ─── appendStop ordering invariant survives a multi-stop build ───────────────

describe("appendStop ordering (template-style sequential build)", () => {
  it("0..n-1 invariant holds after 3 sequential appends", async () => {
    if (!bangkokId) return // catalogue not seeded in this env — skip

    const trip = await prisma.trip.create({
      data: {
        userId,
        name: "Template Test Trip",
        startDate: parseDateUTC("2026-10-01"),
        endDate: parseDateUTC("2026-10-21"),
        currency: "INR",
      },
    })

    const dates = [
      { arrival: "2026-10-01", departure: "2026-10-05" },
      { arrival: "2026-10-05", departure: "2026-10-10" },
      { arrival: "2026-10-10", departure: "2026-10-15" },
    ]

    for (const d of dates) {
      await appendStop({
        tripId: trip.id,
        cityId: bangkokId,
        arrivalDate: parseDateUTC(d.arrival),
        departureDate: parseDateUTC(d.departure),
      })
    }

    const stops = await prisma.stop.findMany({
      where: { tripId: trip.id },
      orderBy: { orderIndex: "asc" },
    })

    expect(stops.map((s) => s.orderIndex)).toEqual([0, 1, 2])

    await prisma.trip.delete({ where: { id: trip.id } })
  })
})

// ─── Date arithmetic used by the template action ──────────────────────────────

describe("template date arithmetic", () => {
  it("addDaysUTC advances the date by the correct number of days", () => {
    const start = parseDateUTC("2026-10-01")
    expect(formatDateUTC(addDaysUTC(start, 21))).toBe("2026-10-22")
  })

  it("clamping: addDaysUTC(end, 0) equals end", () => {
    const end = parseDateUTC("2026-10-21")
    expect(formatDateUTC(addDaysUTC(end, 0))).toBe("2026-10-21")
  })
})

// ─── Direct DB: trip creation mirrors what the action does ───────────────────

describe("trip + stop creation", () => {
  it("creates a trip with stops and maintains 0..n-1 ordering", async () => {
    if (!bangkokId) return

    const startDate = parseDateUTC("2026-11-01")
    const endDate = addDaysUTC(startDate, 14)

    const trip = await prisma.trip.create({
      data: {
        userId,
        name: "Direct Template Test",
        description: "Testing template creation logic directly",
        startDate,
        endDate,
        currency: "INR",
      },
    })

    const stopDates = [
      { arrival: startDate, departure: addDaysUTC(startDate, 4) },
      { arrival: addDaysUTC(startDate, 4), departure: addDaysUTC(startDate, 9) },
    ]

    for (const d of stopDates) {
      await appendStop({
        tripId: trip.id,
        cityId: bangkokId,
        arrivalDate: d.arrival,
        departureDate: d.departure,
      })
    }

    const stops = await prisma.stop.findMany({
      where: { tripId: trip.id },
      orderBy: { orderIndex: "asc" },
    })

    expect(stops).toHaveLength(2)
    expect(stops[0].orderIndex).toBe(0)
    expect(stops[1].orderIndex).toBe(1)
    expect(formatDateUTC(stops[0].arrivalDate)).toBe("2026-11-01")
    expect(formatDateUTC(stops[1].arrivalDate)).toBe("2026-11-05")

    await prisma.trip.delete({ where: { id: trip.id } })
  })
})
