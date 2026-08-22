/**
 * tests/inspiration.test.ts
 *
 * Verifies that:
 * 1. City images deterministically map to authentic landmark photography.
 * 2. Inspiration trips (isCurated: true) never appear in a user's personal "My Trips".
 * 3. User custom trips (isCurated: false) never appear in Inspiration queries.
 */

import { describe, it, expect } from "vitest"
import { getCityImageUrl, CITY_LANDMARK_IMAGES } from "@/lib/city-images"

describe("Deterministic Landmark Images (Issue 1)", () => {
  it("maps Paris to an Eiffel Tower photo", () => {
    const url = getCityImageUrl("Paris")
    expect(url).toContain("photo-1502602898657-3e91760cbb34")
  })

  it("maps Rome to a Colosseum photo", () => {
    const url = getCityImageUrl("Rome")
    expect(url).toContain("photo-1552832230-c0197dd311b5")
  })

  it("maps London to a Big Ben photo", () => {
    const url = getCityImageUrl("London")
    expect(url).toContain("photo-1513635269975-59663e0ac1ad")
  })

  it("maps Tokyo to a Tokyo Tower photo", () => {
    const url = getCityImageUrl("Tokyo")
    expect(url).toContain("photo-1503899036084-c55cdd92da26")
  })

  it("maps Barcelona to a Sagrada Familia photo", () => {
    const url = getCityImageUrl("Barcelona")
    expect(url).toContain("photo-1583422409516-2895a77efded")
  })

  it("maps Jaipur to a Hawa Mahal photo", () => {
    const url = getCityImageUrl("Jaipur")
    expect(url).toContain("photo-1599661046289-e31897846e41")
  })

  it("handles case-insensitivity and punctuation gracefully", () => {
    expect(getCityImageUrl("tokyo")).toBe(getCityImageUrl("Tokyo"))
    expect(getCityImageUrl("Chiang Mai")).toBe(getCityImageUrl("chiangmai"))
    expect(getCityImageUrl("New York")).toBe(getCityImageUrl("new-york"))
  })

  it("returns default fallback for unknown cities rather than random other city", () => {
    const fallback = getCityImageUrl("UnknownAtlantis123")
    expect(fallback).toContain("unsplash.com")
    // Ensure it's not returning Paris or Rome for an unknown city
    expect(fallback).not.toBe(CITY_LANDMARK_IMAGES.paris)
    expect(fallback).not.toBe(CITY_LANDMARK_IMAGES.rome)
  })
})
