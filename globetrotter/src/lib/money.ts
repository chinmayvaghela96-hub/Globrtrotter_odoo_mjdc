/**
 * The single money utility.
 *
 * Every amount in the database is stored twice over: `amount` (or `cost`)
 * always holds the value **in the trip's currency**, which is what every
 * budget query sums; the `original*` columns record what the traveller
 * actually paid and the rate used at the time.
 *
 * The rate is stored, not looked up at render time, so a budget someone saw
 * last week does not quietly change because the market moved. That is also
 * why conversion lives here and nowhere else — two implementations would
 * drift, and money that disagrees with itself is worse than money in one
 * currency.
 */

export type CurrencyCode = string

export type CurrencyMeta = {
  code: CurrencyCode
  name: string
  /** Rough units per 1 INR, used only when no rate provider is configured. */
  fallbackPerInr: number
}

/**
 * Offline rates.
 *
 * Deliberately approximate and deliberately committed: the app must produce a
 * sensible number with no API key and no network. `fxRateAt` records when a
 * rate was taken, so a stored fallback rate is distinguishable from a live one.
 */
export const CURRENCIES: CurrencyMeta[] = [
  { code: "INR", name: "Indian rupee", fallbackPerInr: 1 },
  { code: "USD", name: "US dollar", fallbackPerInr: 0.012 },
  { code: "EUR", name: "Euro", fallbackPerInr: 0.011 },
  { code: "GBP", name: "Pound sterling", fallbackPerInr: 0.0094 },
  { code: "JPY", name: "Japanese yen", fallbackPerInr: 1.79 },
  { code: "AUD", name: "Australian dollar", fallbackPerInr: 0.018 },
  { code: "SGD", name: "Singapore dollar", fallbackPerInr: 0.016 },
  { code: "THB", name: "Thai baht", fallbackPerInr: 0.39 },
  { code: "AED", name: "UAE dirham", fallbackPerInr: 0.044 },
  { code: "IDR", name: "Indonesian rupiah", fallbackPerInr: 190 },
  { code: "VND", name: "Vietnamese dong", fallbackPerInr: 300 },
  { code: "NZD", name: "New Zealand dollar", fallbackPerInr: 0.02 },
]

export const CURRENCY_CODES = CURRENCIES.map((currency) => currency.code)

const BY_CODE = new Map(CURRENCIES.map((currency) => [currency.code, currency]))

export const isSupportedCurrency = (code: string): boolean => BY_CODE.has(code)

/** Money is rounded to whole minor units at every boundary. */
export const roundMoney = (value: number): number => Math.round(value * 100) / 100

/**
 * Rate to convert 1 unit of `from` into `to`, using the offline table.
 * Cross rates go through INR, which is the table's pivot.
 */
export function fallbackRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1
  const source = BY_CODE.get(from)
  const target = BY_CODE.get(to)
  if (!source || !target) return 1 // unknown currency: never silently scale
  // from -> INR -> to
  return target.fallbackPerInr / source.fallbackPerInr
}

export function convert(amount: number, rate: number): number {
  return roundMoney(amount * rate)
}

/**
 * `Intl` formatting, in one place.
 *
 * `maximumFractionDigits: 0` because trip budgets are planning figures — nobody
 * plans to the paisa, and decimals across a dense budget table are noise.
 */
export function formatMoney(amount: number, currency: CurrencyCode = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // An unknown code would otherwise throw and take the page with it.
    return `${currency} ${Math.round(amount).toLocaleString("en-IN")}`
  }
}

/** What a row stores about one amount. */
export type StoredMoney = {
  /** Always in the trip's currency. */
  amount: number
  originalAmount?: number | null
  originalCurrency?: CurrencyCode | null
  fxRate?: number | null
  fxRateAt?: Date | string | null
}

export type DisplayMoney = {
  /** What the traveller paid, in the currency they paid it in. */
  primary: string
  /** The trip-currency equivalent, or null when there was no conversion. */
  secondary: string | null
  converted: boolean
}

/**
 * How an amount reads on screen.
 *
 * When a conversion happened the original leads, because that is the number on
 * the receipt; the trip-currency figure follows in brackets. With no
 * conversion there is only one number and no bracket to explain.
 */
export function displayMoney(
  stored: StoredMoney,
  tripCurrency: CurrencyCode,
): DisplayMoney {
  const converted =
    stored.originalCurrency != null &&
    stored.originalCurrency !== tripCurrency &&
    stored.originalAmount != null

  if (!converted) {
    return {
      primary: formatMoney(stored.amount, tripCurrency),
      secondary: null,
      converted: false,
    }
  }

  return {
    primary: formatMoney(stored.originalAmount!, stored.originalCurrency!),
    secondary: formatMoney(stored.amount, tripCurrency),
    converted: true,
  }
}

/** "1 EUR = ₹91.20, taken 22 Aug 2026" — shown as a tooltip or caption. */
export function describeRate(stored: StoredMoney, tripCurrency: CurrencyCode): string | null {
  if (!stored.originalCurrency || stored.fxRate == null) return null

  const when = stored.fxRateAt ? new Date(stored.fxRateAt) : null
  const rate = `1 ${stored.originalCurrency} = ${formatMoney(stored.fxRate, tripCurrency)}`

  if (!when || Number.isNaN(when.getTime())) return rate
  return `${rate}, taken ${when.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })}`
}
