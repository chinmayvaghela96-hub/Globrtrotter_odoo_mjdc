import type { GeoPoint } from "@/lib/geo"

/**
 * The only place that knows a map vendor exists.
 *
 * Nothing else in the app imports a provider SDK or a URL template. A page
 * asks `getMapProvider()` whether one is configured; if the answer is null it
 * renders the SVG fallback instead, which needs no key and no network.
 *
 * The API key is read from the server environment and never sent to the
 * browser: pages point an `<img>` at our own `/api/map/static` route, which
 * fetches from the vendor server-side and streams the image back. That is why
 * the variable is `MAP_API_KEY` and not `NEXT_PUBLIC_MAP_API_KEY` — a
 * NEXT_PUBLIC name would be inlined into the client bundle.
 *
 * To add a vendor: add an entry to PROVIDERS. Nothing else changes.
 */

export type MapMarker = GeoPoint & {
  label?: string
  /** The city the map is centred on, drawn larger and in the accent colour. */
  primary?: boolean
}

export type StaticMapRequest = {
  markers: MapMarker[]
  width: number
  height: number
  /** Falls back to a two-times pixel ratio for crisp rendering. */
  retina?: boolean
}

export type MapProvider = {
  id: string
  name: string
  /** Attribution the page must display. Every vendor here requires it. */
  attribution: string
  /** Full vendor URL including the key. Server-side only — never returned to a client. */
  buildStaticUrl(request: StaticMapRequest, apiKey: string): string
}

const PRIMARY_COLOUR = "dcae72" // the accent, no leading hash for URL use
const NEARBY_COLOUR = "0b5264"

const PROVIDERS: Record<string, MapProvider> = {
  maptiler: {
    id: "maptiler",
    name: "MapTiler",
    attribution: "© MapTiler © OpenStreetMap contributors",
    buildStaticUrl({ markers, width, height, retina }, apiKey) {
      const size = retina === false ? `${width}x${height}` : `${width}x${height}@2x`
      const pins = markers
        .map((m) => `${m.longitude},${m.latitude},${m.primary ? PRIMARY_COLOUR : NEARBY_COLOUR}`)
        .join("|")

      const url = new URL(
        `https://api.maptiler.com/maps/streets-v2/static/auto/${size}.png`,
      )
      url.searchParams.set("key", apiKey)
      url.searchParams.set("padding", "0.15")
      if (pins) url.searchParams.set("markers", pins)
      return url.toString()
    },
  },

  google: {
    id: "google",
    name: "Google Maps",
    attribution: "Map data © Google",
    buildStaticUrl({ markers, width, height, retina }, apiKey) {
      // Google groups markers by style, so the primary pin and the rest go in
      // two separate `markers` parameters rather than one list.
      const url = new URL("https://maps.googleapis.com/maps/api/staticmap")
      url.searchParams.set("size", `${width}x${height}`)
      url.searchParams.set("scale", retina === false ? "1" : "2")
      url.searchParams.set("maptype", "roadmap")

      const primary = markers.filter((m) => m.primary)
      const rest = markers.filter((m) => !m.primary)

      if (primary.length) {
        url.searchParams.append(
          "markers",
          `color:0x${PRIMARY_COLOUR}|size:mid|` +
            primary.map((m) => `${m.latitude},${m.longitude}`).join("|"),
        )
      }
      if (rest.length) {
        url.searchParams.append(
          "markers",
          `color:0x${NEARBY_COLOUR}|size:small|` +
            rest.map((m) => `${m.latitude},${m.longitude}`).join("|"),
        )
      }

      // No center/zoom: with markers present Google frames them itself.
      url.searchParams.set("key", apiKey)
      return url.toString()
    },
  },

  mapbox: {
    id: "mapbox",
    name: "Mapbox",
    attribution: "© Mapbox © OpenStreetMap",
    buildStaticUrl({ markers, width, height, retina }, apiKey) {
      const overlay = markers
        .map((m) => {
          const pin = m.primary ? "pin-l" : "pin-s"
          const colour = m.primary ? PRIMARY_COLOUR : NEARBY_COLOUR
          return `${pin}+${colour}(${m.longitude},${m.latitude})`
        })
        .join(",")

      const size = `${width}x${height}${retina === false ? "" : "@2x"}`
      const path = overlay ? `${overlay}/auto` : "auto"

      const url = new URL(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${path}/${size}`,
      )
      url.searchParams.set("access_token", apiKey)
      url.searchParams.set("padding", "48")
      return url.toString()
    },
  },
}

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDERS)

/** The configured key, or null. Server-side only. */
export function getMapApiKey(): string | null {
  const key = process.env.MAP_API_KEY?.trim()
  return key ? key : null
}

/**
 * The configured provider, or null when the app should fall back.
 *
 * Returns null rather than throwing on an unknown `MAP_PROVIDER`, because a
 * typo in an environment variable should degrade the map to the fallback, not
 * take the page down.
 */
export function getMapProvider(): MapProvider | null {
  if (!getMapApiKey()) return null

  const requested = process.env.MAP_PROVIDER?.trim().toLowerCase()
  if (!requested) return PROVIDERS.maptiler // sensible default when only a key is set

  return PROVIDERS[requested] ?? null
}

export function isMapConfigured(): boolean {
  return getMapProvider() !== null
}
