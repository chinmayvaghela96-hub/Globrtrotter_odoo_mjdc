import { describe, expect, it } from "vitest"
import {
  bearingDegrees,
  boundsOf,
  compassFromBearing,
  formatDistance,
  haversineKm,
  nearest,
} from "@/lib/geo"

// Real coordinates from prisma/data/cities.json, so the expected distances
// below can be checked against any external source.
const BANGKOK = { latitude: 13.7563, longitude: 100.5018 }
const CHIANG_MAI = { latitude: 18.7883, longitude: 98.9853 }
const SINGAPORE = { latitude: 1.3521, longitude: 103.8198 }
const PARIS = { latitude: 48.8566, longitude: 2.3522 }
const SYDNEY = { latitude: -33.8688, longitude: 151.2093 }

describe("haversineKm", () => {
  it("is zero between a point and itself", () => {
    expect(haversineKm(BANGKOK, BANGKOK)).toBe(0)
  })

  it("matches known great-circle distances", () => {
    expect(haversineKm(BANGKOK, CHIANG_MAI)).toBeCloseTo(583, -1)
    expect(haversineKm(BANGKOK, SINGAPORE)).toBeCloseTo(1425, -2)
    expect(haversineKm(PARIS, SYDNEY)).toBeCloseTo(16960, -3)
  })

  it("is symmetric", () => {
    expect(haversineKm(PARIS, SYDNEY)).toBeCloseTo(haversineKm(SYDNEY, PARIS), 6)
  })

  it("handles crossing the antimeridian without a huge false distance", () => {
    const west = { latitude: 0, longitude: 179 }
    const east = { latitude: 0, longitude: -179 }
    // Two degrees apart at the equator, roughly 222 km — not most of the globe.
    expect(haversineKm(west, east)).toBeLessThan(300)
  })
})

describe("bearing and compass", () => {
  it("reads due north, east, south and west correctly", () => {
    const origin = { latitude: 0, longitude: 0 }
    expect(compassFromBearing(bearingDegrees(origin, { latitude: 10, longitude: 0 }))).toBe("N")
    expect(compassFromBearing(bearingDegrees(origin, { latitude: 0, longitude: 10 }))).toBe("E")
    expect(compassFromBearing(bearingDegrees(origin, { latitude: -10, longitude: 0 }))).toBe("S")
    expect(compassFromBearing(bearingDegrees(origin, { latitude: 0, longitude: -10 }))).toBe("W")
  })

  it("puts Chiang Mai due north of Bangkok", () => {
    // 5 degrees north against 1.5 west is a bearing near 344, which rounds to
    // N on an eight-point compass rather than NW.
    expect(bearingDegrees(BANGKOK, CHIANG_MAI)).toBeCloseTo(344, -1)
    expect(compassFromBearing(bearingDegrees(BANGKOK, CHIANG_MAI))).toBe("N")
  })

  it("puts Singapore south of Bangkok", () => {
    expect(compassFromBearing(bearingDegrees(BANGKOK, SINGAPORE))).toBe("S")
  })

  it("wraps a bearing outside 0-360 rather than falling off the array", () => {
    expect(compassFromBearing(360)).toBe("N")
    expect(compassFromBearing(-45)).toBe("NW")
    expect(compassFromBearing(720 + 90)).toBe("E")
  })
})

describe("nearest", () => {
  const candidates = [
    { id: "cm", ...CHIANG_MAI },
    { id: "sg", ...SINGAPORE },
    { id: "paris", ...PARIS },
    { id: "syd", ...SYDNEY },
  ]

  it("orders by distance, closest first", () => {
    const result = nearest(BANGKOK, candidates)
    expect(result.map((r) => r.item.id)).toEqual(["cm", "sg", "syd", "paris"])
  })

  it("respects the limit", () => {
    expect(nearest(BANGKOK, candidates, { limit: 2 })).toHaveLength(2)
  })

  it("drops anything beyond maxKm", () => {
    const result = nearest(BANGKOK, candidates, { maxKm: 2000 })
    expect(result.map((r) => r.item.id)).toEqual(["cm", "sg"])
  })

  it("returns an empty list rather than throwing when nothing qualifies", () => {
    expect(nearest(BANGKOK, candidates, { maxKm: 1 })).toEqual([])
    expect(nearest(BANGKOK, [])).toEqual([])
  })

  it("carries the distance and compass alongside each result", () => {
    const [closest] = nearest(BANGKOK, candidates)
    expect(closest.item.id).toBe("cm")
    expect(closest.distanceKm).toBeGreaterThan(500)
    expect(closest.distanceKm).toBeLessThan(650)
    expect(closest.compass).toBe("N")
  })
})

describe("formatDistance", () => {
  it("keeps one decimal under ten kilometres", () => {
    expect(formatDistance(4.25)).toBe("4.3 km")
  })

  it("rounds to whole kilometres in between", () => {
    expect(formatDistance(583.4)).toBe("583 km")
  })

  it("groups thousands", () => {
    expect(formatDistance(16960)).toContain("16,960")
  })
})

describe("boundsOf", () => {
  it("contains every point it was given", () => {
    const bounds = boundsOf([BANGKOK, CHIANG_MAI, SINGAPORE])
    for (const point of [BANGKOK, CHIANG_MAI, SINGAPORE]) {
      expect(point.latitude).toBeGreaterThanOrEqual(bounds.minLat)
      expect(point.latitude).toBeLessThanOrEqual(bounds.maxLat)
      expect(point.longitude).toBeGreaterThanOrEqual(bounds.minLon)
      expect(point.longitude).toBeLessThanOrEqual(bounds.maxLon)
    }
  })

  it("gives a single point a window instead of a zero-size box", () => {
    const bounds = boundsOf([PARIS])
    expect(bounds.maxLat).toBeGreaterThan(bounds.minLat)
    expect(bounds.maxLon).toBeGreaterThan(bounds.minLon)
  })

  it("never leaves the valid coordinate range", () => {
    const bounds = boundsOf([
      { latitude: 89.9, longitude: 179.9 },
      { latitude: -89.9, longitude: -179.9 },
    ])
    expect(bounds.minLat).toBeGreaterThanOrEqual(-90)
    expect(bounds.maxLat).toBeLessThanOrEqual(90)
    expect(bounds.minLon).toBeGreaterThanOrEqual(-180)
    expect(bounds.maxLon).toBeLessThanOrEqual(180)
  })

  it("falls back to the whole world for no points", () => {
    expect(boundsOf([])).toEqual({ minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 })
  })
})
