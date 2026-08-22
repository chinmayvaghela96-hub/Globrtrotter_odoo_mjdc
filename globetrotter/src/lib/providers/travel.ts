import { haversineKm, type GeoPoint } from "@/lib/geo"
import { roundMoney } from "@/lib/money"
import { fallback, fetchJson, live, type ProviderResult } from "@/lib/providers/types"

/**
 * Transport and accommodation estimates.
 *
 * The fallbacks here are not stubs. Transport is derived from the real
 * great-circle distance between two seeded cities, and stay from the city's
 * cost index — so with no vendor configured the numbers still move correctly
 * when you swap Bangkok for Reykjavik. A live provider replaces the model with
 * quotes; it does not turn nonsense into sense.
 *
 *   TRANSPORT_API_URL / TRANSPORT_API_KEY
 *   STAY_API_URL / STAY_API_KEY
 *
 * `{from}`, `{to}`, `{nights}`, `{city}` and `{key}` are substituted.
 */

export type TransportMode = "FLIGHT" | "TRAIN" | "BUS"

export type TransportOption = {
  mode: TransportMode
  /** In INR — the caller converts to the trip currency. */
  cost: number
  durationMin: number
  note: string
}

export type StayEstimate = {
  tier: "BUDGET" | "MID" | "PREMIUM"
  perNight: number
  total: number
}

/**
 * Per-kilometre costs and speeds, in INR. Coarse on purpose: this is a
 * planning figure, and false precision would imply a quote we do not have.
 */
const TRANSPORT_MODEL: Record<
  TransportMode,
  { base: number; perKm: number; kmPerHour: number; maxKm: number; note: string }
> = {
  FLIGHT: { base: 3500, perKm: 5.5, kmPerHour: 750, maxKm: 20000, note: "Direct economy, one way" },
  TRAIN: { base: 300, perKm: 2.2, kmPerHour: 90, maxKm: 3000, note: "Seated, one way" },
  BUS: { base: 150, perKm: 1.4, kmPerHour: 55, maxKm: 1500, note: "Intercity coach, one way" },
}

function buildUrl(
  template: string | undefined,
  keyVar: string | undefined,
  replacements: Record<string, string | number>,
): string | null {
  const url = template?.trim()
  if (!url) return null

  let built = url.replace("{key}", encodeURIComponent(keyVar?.trim() ?? ""))
  for (const [token, value] of Object.entries(replacements)) {
    built = built.replace(`{${token}}`, encodeURIComponent(String(value)))
  }
  return built
}

export function isTransportProviderConfigured(): boolean {
  return Boolean(process.env.TRANSPORT_API_URL?.trim())
}

export function isStayProviderConfigured(): boolean {
  return Boolean(process.env.STAY_API_URL?.trim())
}

/** Modelled options between two cities, cheapest first. */
export function modelTransport(from: GeoPoint, to: GeoPoint): TransportOption[] {
  const km = haversineKm(from, to)

  return (Object.keys(TRANSPORT_MODEL) as TransportMode[])
    .filter((mode) => km <= TRANSPORT_MODEL[mode].maxKm)
    .map((mode) => {
      const model = TRANSPORT_MODEL[mode]
      return {
        mode,
        cost: roundMoney(model.base + km * model.perKm),
        // Flights carry a fixed overhead that has nothing to do with distance.
        durationMin: Math.round((km / model.kmPerHour) * 60 + (mode === "FLIGHT" ? 150 : 20)),
        note: model.note,
      }
    })
    .sort((a, b) => a.cost - b.cost)
}

export async function getTransportOptions(
  from: GeoPoint & { name: string },
  to: GeoPoint & { name: string },
): Promise<ProviderResult<TransportOption[]>> {
  const url = buildUrl(process.env.TRANSPORT_API_URL, process.env.TRANSPORT_API_KEY, {
    from: from.name,
    to: to.name,
  })

  if (!url) {
    return fallback(
      modelTransport(from, to),
      "Estimated from distance — no transport provider is configured.",
    )
  }

  const body = await fetchJson<{ options?: TransportOption[] }>(url, "transport")
  if (!body?.options?.length) {
    return fallback(
      modelTransport(from, to),
      "Estimated from distance — the transport service did not respond.",
    )
  }

  return live(body.options)
}

/**
 * Nightly rates modelled off the city cost index, which runs 1–100 across the
 * catalogue. The multipliers give roughly ₹700 a night in the cheapest cities
 * and ₹9,000 in the dearest, which is about right for real ranges.
 */
export function modelStay(costIndex: number, nights: number): StayEstimate[] {
  const base = 40 * Math.max(1, costIndex)
  const safeNights = Math.max(1, nights)

  return (
    [
      { tier: "BUDGET" as const, multiplier: 0.6 },
      { tier: "MID" as const, multiplier: 1 },
      { tier: "PREMIUM" as const, multiplier: 2.2 },
    ]
  ).map(({ tier, multiplier }) => {
    const perNight = roundMoney(base * multiplier)
    return { tier, perNight, total: roundMoney(perNight * safeNights) }
  })
}

export async function getStayEstimates(
  city: { name: string; costIndex: number },
  nights: number,
): Promise<ProviderResult<StayEstimate[]>> {
  const url = buildUrl(process.env.STAY_API_URL, process.env.STAY_API_KEY, {
    city: city.name,
    nights,
  })

  if (!url) {
    return fallback(
      modelStay(city.costIndex, nights),
      "Estimated from the city cost index — no accommodation provider is configured.",
    )
  }

  const body = await fetchJson<{ estimates?: StayEstimate[] }>(url, "stay")
  if (!body?.estimates?.length) {
    return fallback(
      modelStay(city.costIndex, nights),
      "Estimated from the city cost index — the accommodation service did not respond.",
    )
  }

  return live(body.estimates)
}
