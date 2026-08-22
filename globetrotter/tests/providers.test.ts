import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getRate, isCurrencyProviderConfigured, resetRateCache } from "@/lib/providers/currency"
import {
  isStayProviderConfigured,
  isTransportProviderConfigured,
  modelStay,
  modelTransport,
} from "@/lib/providers/travel"

/**
 * The contract every adapter keeps: an external API being unreachable is an
 * expected state, so nothing throws, a usable number always comes back, and
 * the result says whether it came from the vendor or from the local model.
 * A fallback that quietly passed itself off as live would be the real bug.
 */

const BANGKOK = { latitude: 13.7563, longitude: 100.5018, name: "Bangkok" }
const CHIANG_MAI = { latitude: 18.7883, longitude: 98.9853, name: "Chiang Mai" }

const ENV_KEYS = [
  "CURRENCY_API_URL",
  "CURRENCY_API_KEY",
  "TRANSPORT_API_URL",
  "STAY_API_URL",
] as const

let saved: Record<string, string | undefined> = {}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  for (const key of ENV_KEYS) delete process.env[key]
  resetRateCache()
  vi.restoreAllMocks()
})

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  resetRateCache()
})

describe("currency provider", () => {
  it("reports itself unconfigured with no URL set", () => {
    expect(isCurrencyProviderConfigured()).toBe(false)
  })

  it("returns a stored reference rate, labelled as a fallback", async () => {
    const result = await getRate("EUR", "INR")

    expect(result.source).toBe("fallback")
    expect(result.reason).toMatch(/no rate provider/i)
    expect(result.data.rate).toBeGreaterThan(0)
  })

  it("short-circuits an identical pair without calling out", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const result = await getRate("INR", "INR")

    expect(result.data.rate).toBe(1)
    expect(result.source).toBe("live")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("uses the vendor rate when one is configured and answers", async () => {
    process.env.CURRENCY_API_URL = "https://rates.example/latest?base={base}&access_key={key}"
    process.env.CURRENCY_API_KEY = "secret"

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ rates: { INR: 91.25 } }), { status: 200 }),
    )

    const result = await getRate("EUR", "INR")

    expect(result.source).toBe("live")
    expect(result.data.rate).toBe(91.25)
    // The template placeholders must actually be substituted.
    const called = String(fetchSpy.mock.calls[0]?.[0])
    expect(called).toContain("base=EUR")
    expect(called).toContain("access_key=secret")
  })

  it("accepts the conversion_rates shape some vendors use", async () => {
    process.env.CURRENCY_API_URL = "https://rates.example/{base}"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ conversion_rates: { INR: 88 } }), { status: 200 }),
    )

    expect((await getRate("USD", "INR")).data.rate).toBe(88)
  })

  it("falls back rather than throwing when the vendor errors", async () => {
    process.env.CURRENCY_API_URL = "https://rates.example/{base}"
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await getRate("EUR", "INR")

    expect(result.source).toBe("fallback")
    expect(result.data.rate).toBeGreaterThan(0)
    expect(result.reason).toMatch(/did not respond/i)
  })

  it("falls back when the vendor answers without the currency asked for", async () => {
    process.env.CURRENCY_API_URL = "https://rates.example/{base}"
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ rates: { GBP: 0.85 } }), { status: 200 }),
    )

    expect((await getRate("EUR", "INR")).source).toBe("fallback")
  })

  it("caches a live rate instead of calling per amount rendered", async () => {
    process.env.CURRENCY_API_URL = "https://rates.example/{base}"
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ rates: { INR: 91 } }), { status: 200 }),
    )

    await getRate("EUR", "INR")
    await getRate("EUR", "INR")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("refuses a currency it has no reference for", async () => {
    const result = await getRate("XYZ", "INR")
    expect(result.source).toBe("fallback")
    expect(result.data.rate).toBe(1)
  })
})

describe("transport model", () => {
  it("reports itself unconfigured with no URL set", () => {
    expect(isTransportProviderConfigured()).toBe(false)
  })

  it("orders options cheapest first", () => {
    const options = modelTransport(BANGKOK, CHIANG_MAI)
    const costs = options.map((option) => option.cost)
    expect(costs).toEqual([...costs].sort((a, b) => a - b))
  })

  it("costs more for a longer journey", () => {
    const near = modelTransport(BANGKOK, CHIANG_MAI)[0].cost
    const far = modelTransport(BANGKOK, { latitude: 48.8566, longitude: 2.3522, name: "Paris" })[0]
      .cost
    expect(far).toBeGreaterThan(near)
  })

  it("drops ground transport once the distance makes it absurd", () => {
    // Bangkok to Paris by intercity coach is not an option anyone should see.
    const modes = modelTransport(BANGKOK, {
      latitude: 48.8566,
      longitude: 2.3522,
      name: "Paris",
    }).map((option) => option.mode)

    expect(modes).toContain("FLIGHT")
    expect(modes).not.toContain("BUS")
  })

  it("keeps every option on a short hop", () => {
    const modes = modelTransport(BANGKOK, CHIANG_MAI).map((option) => option.mode)
    expect(modes).toEqual(expect.arrayContaining(["FLIGHT", "TRAIN", "BUS"]))
  })
})

describe("stay model", () => {
  it("reports itself unconfigured with no URL set", () => {
    expect(isStayProviderConfigured()).toBe(false)
  })

  it("scales with the city cost index", () => {
    const cheap = modelStay(20, 3).find((tier) => tier.tier === "MID")!
    const dear = modelStay(90, 3).find((tier) => tier.tier === "MID")!
    expect(dear.perNight).toBeGreaterThan(cheap.perNight)
  })

  it("multiplies out to the number of nights", () => {
    const [budget] = modelStay(50, 4)
    expect(budget.total).toBeCloseTo(budget.perNight * 4, 2)
  })

  it("orders the tiers from cheapest to dearest", () => {
    const rates = modelStay(50, 1).map((tier) => tier.perNight)
    expect(rates).toEqual([...rates].sort((a, b) => a - b))
  })

  it("treats a zero-night stay as one night rather than zero cost", () => {
    const [budget] = modelStay(50, 0)
    expect(budget.total).toBe(budget.perNight)
  })
})
