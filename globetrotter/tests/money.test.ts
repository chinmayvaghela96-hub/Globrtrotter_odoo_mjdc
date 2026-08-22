import { describe, expect, it } from "vitest"
import {
  convert,
  describeRate,
  displayMoney,
  fallbackRate,
  formatMoney,
  isSupportedCurrency,
  roundMoney,
} from "@/lib/money"

/**
 * The rule these all defend: `amount` is always in the trip's currency, and
 * the `original*` fields record what was actually paid. Getting that backwards
 * would make every budget total silently wrong.
 */
describe("rounding", () => {
  it("rounds to minor units", () => {
    expect(roundMoney(10.005)).toBe(10.01)
    expect(roundMoney(10.004)).toBe(10)
    expect(roundMoney(1 / 3)).toBe(0.33)
  })

  it("leaves whole numbers alone", () => {
    expect(roundMoney(4500)).toBe(4500)
  })
})

describe("fallbackRate", () => {
  it("is exactly 1 between a currency and itself", () => {
    expect(fallbackRate("INR", "INR")).toBe(1)
    expect(fallbackRate("EUR", "EUR")).toBe(1)
  })

  it("crosses through INR for a non-INR pair", () => {
    // EUR -> INR -> USD should land near the direct EUR/USD rate.
    const eurToUsd = fallbackRate("EUR", "USD")
    expect(eurToUsd).toBeGreaterThan(0.9)
    expect(eurToUsd).toBeLessThan(1.3)
  })

  it("round-trips back to roughly the original amount", () => {
    const out = convert(1000, fallbackRate("INR", "THB"))
    const back = convert(out, fallbackRate("THB", "INR"))
    expect(back).toBeCloseTo(1000, 0)
  })

  it("refuses to invent a rate for an unknown currency", () => {
    // 1:1 is a visibly wrong number rather than a silently plausible one.
    expect(fallbackRate("XYZ", "INR")).toBe(1)
    expect(isSupportedCurrency("XYZ")).toBe(false)
  })
})

describe("formatMoney", () => {
  it("formats without decimals, because budgets are planning figures", () => {
    expect(formatMoney(4500, "INR")).not.toContain(".")
  })

  it("survives an unknown currency code instead of throwing", () => {
    // Intl would throw on this, taking the whole page down with it.
    expect(() => formatMoney(100, "NOTACODE")).not.toThrow()
    expect(formatMoney(100, "NOTACODE")).toContain("NOTACODE")
  })
})

describe("displayMoney", () => {
  it("shows one figure when nothing was converted", () => {
    const shown = displayMoney({ amount: 4500 }, "INR")
    expect(shown.converted).toBe(false)
    expect(shown.secondary).toBeNull()
    expect(shown.primary).toContain("4,500")
  })

  it("leads with what was paid and follows with the trip currency", () => {
    const shown = displayMoney(
      {
        amount: 4500,
        originalAmount: 50,
        originalCurrency: "EUR",
        fxRate: 90,
        fxRateAt: "2026-08-22T00:00:00.000Z",
      },
      "INR",
    )

    expect(shown.converted).toBe(true)
    expect(shown.primary).toContain("50")
    expect(shown.secondary).toContain("4,500")
  })

  it("treats an original in the trip's own currency as no conversion", () => {
    const shown = displayMoney(
      { amount: 4500, originalAmount: 4500, originalCurrency: "INR" },
      "INR",
    )
    expect(shown.converted).toBe(false)
    expect(shown.secondary).toBeNull()
  })

  it("falls back to the single figure when the original amount is missing", () => {
    // A currency with no amount is incomplete data, not a conversion.
    const shown = displayMoney({ amount: 4500, originalCurrency: "EUR" }, "INR")
    expect(shown.converted).toBe(false)
  })
})

describe("describeRate", () => {
  it("states the stored rate and when it was taken", () => {
    const text = describeRate(
      {
        amount: 4500,
        originalAmount: 50,
        originalCurrency: "EUR",
        fxRate: 90,
        fxRateAt: "2026-08-22T00:00:00.000Z",
      },
      "INR",
    )

    expect(text).toContain("1 EUR")
    expect(text).toContain("22 Aug 2026")
  })

  it("is null when there was no conversion to describe", () => {
    expect(describeRate({ amount: 4500 }, "INR")).toBeNull()
  })

  it("omits the date rather than printing an invalid one", () => {
    const text = describeRate(
      { amount: 1, originalCurrency: "EUR", fxRate: 90, fxRateAt: "not-a-date" },
      "INR",
    )
    expect(text).toContain("1 EUR")
    expect(text).not.toContain("Invalid")
  })
})
