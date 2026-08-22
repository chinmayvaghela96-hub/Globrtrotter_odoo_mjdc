import {
  fallbackRate,
  isSupportedCurrency,
  type CurrencyCode,
} from "@/lib/money"
import { fallback, fetchJson, live, type ProviderResult } from "@/lib/providers/types"

/**
 * Exchange rates.
 *
 * Configured with a URL template rather than a hard-coded vendor, because
 * every common rate API — exchangerate.host, open.er-api.com, Fixer,
 * Frankfurter, OpenExchangeRates — returns the same essential shape:
 * `{ "rates": { "INR": 91.2, ... } }` keyed off a base currency. One parser
 * covers all of them, and swapping vendor is an environment change.
 *
 *   CURRENCY_API_URL="https://api.exchangerate.host/latest?base={base}&access_key={key}"
 *   CURRENCY_API_KEY="..."
 *
 * `{base}` and `{key}` are substituted. With nothing configured the offline
 * table in `lib/money.ts` answers instead, so the app always produces a number.
 */

type RatesResponse = { rates?: Record<string, number>; conversion_rates?: Record<string, number> }

export type Rate = {
  from: CurrencyCode
  to: CurrencyCode
  /** Multiply an amount in `from` by this to get `to`. */
  rate: number
  at: string
}

export function isCurrencyProviderConfigured(): boolean {
  return Boolean(process.env.CURRENCY_API_URL?.trim())
}

function buildUrl(base: CurrencyCode): string | null {
  const template = process.env.CURRENCY_API_URL?.trim()
  if (!template) return null

  return template
    .replace("{base}", encodeURIComponent(base))
    .replace("{key}", encodeURIComponent(process.env.CURRENCY_API_KEY?.trim() ?? ""))
}

/**
 * In-process cache. Rates move slowly relative to a planning session, and an
 * uncached page would spend a vendor call per amount rendered.
 */
const cache = new Map<string, { rate: Rate; expires: number }>()
const CACHE_MS = 60 * 60 * 1000 // one hour

export async function getRate(
  from: CurrencyCode,
  to: CurrencyCode,
  now: number = Date.now(),
): Promise<ProviderResult<Rate>> {
  const at = new Date(now).toISOString()

  if (from === to) {
    return live({ from, to, rate: 1, at })
  }

  if (!isSupportedCurrency(from) || !isSupportedCurrency(to)) {
    // Refuse to invent a rate for a currency we know nothing about: 1:1 is a
    // visible wrong number rather than a silent wrong one.
    return fallback(
      { from, to, rate: 1, at },
      `No rate available for ${from} to ${to}.`,
    )
  }

  const key = `${from}:${to}`
  const hit = cache.get(key)
  if (hit && hit.expires > now) return live(hit.rate)

  const url = buildUrl(from)
  if (!url) {
    return fallback(
      { from, to, rate: fallbackRate(from, to), at },
      "Using stored reference rates — no rate provider is configured.",
    )
  }

  const body = await fetchJson<RatesResponse>(url, "currency")
  const rates = body?.rates ?? body?.conversion_rates
  const rate = rates?.[to]

  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    return fallback(
      { from, to, rate: fallbackRate(from, to), at },
      "Using stored reference rates — the rate service did not respond.",
    )
  }

  const resolved: Rate = { from, to, rate, at }
  cache.set(key, { rate: resolved, expires: now + CACHE_MS })
  return live(resolved)
}

/** Clears the rate cache. Exists so tests are not order-dependent. */
export function resetRateCache(): void {
  cache.clear()
}
