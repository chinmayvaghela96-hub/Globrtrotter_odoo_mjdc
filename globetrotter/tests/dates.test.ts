import { describe, expect, it } from "vitest"
import {
  addDaysUTC,
  dayCountUTC,
  eachDayUTC,
  formatDateUTC,
  parseDateUTC,
} from "@/lib/dates"

/**
 * These exist because of one specific bug: at UTC+5:30, a Date built from
 * local parts lands at 18:30 UTC the previous day, and Postgres `@db.Date`
 * then truncates it — so a trip silently starts a day early. Every test here
 * would pass on a UTC machine and fail on a naive implementation in IST,
 * which is exactly the point.
 */
describe("calendar dates", () => {
  it("parses to UTC midnight, not local midnight", () => {
    const date = parseDateUTC("2026-09-14")
    expect(date.toISOString()).toBe("2026-09-14T00:00:00.000Z")
    expect(date.getUTCHours()).toBe(0)
  })

  it("round-trips a date string unchanged", () => {
    for (const iso of ["2026-01-01", "2026-09-14", "2026-12-31", "2028-02-29"]) {
      expect(formatDateUTC(parseDateUTC(iso))).toBe(iso)
    }
  })

  it("rejects a malformed date rather than guessing", () => {
    expect(() => parseDateUTC("14/09/2026")).toThrow()
    expect(() => parseDateUTC("2026-9-14")).toThrow()
    expect(() => parseDateUTC("")).toThrow()
  })

  it("counts days inclusively, so a single-day trip is 1", () => {
    expect(dayCountUTC(parseDateUTC("2026-09-14"), parseDateUTC("2026-09-14"))).toBe(1)
    expect(dayCountUTC(parseDateUTC("2026-09-14"), parseDateUTC("2026-09-22"))).toBe(9)
  })

  it("crosses a month boundary without drifting", () => {
    const start = parseDateUTC("2026-08-30")
    expect(formatDateUTC(addDaysUTC(start, 3))).toBe("2026-09-02")
    expect(dayCountUTC(start, parseDateUTC("2026-09-02"))).toBe(4)
  })

  it("enumerates every day in the range, inclusive of both ends", () => {
    const days = eachDayUTC(parseDateUTC("2026-09-14"), parseDateUTC("2026-09-18"))
    expect(days.map(formatDateUTC)).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
    ])
  })
})
