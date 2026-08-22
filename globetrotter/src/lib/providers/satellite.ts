import type { GeoPoint } from "@/lib/geo"
import { PROVIDER_TIMEOUT_MS } from "@/lib/providers/types"

/**
 * Sentinel-2 imagery from the Copernicus Data Space.
 *
 * Different in kind from the other adapters. This is not a map — there are no
 * labels, roads or borders — so it never substitutes for the locator map on a
 * city page. It answers a different question: what does this place actually
 * look like from orbit.
 *
 * Copernicus uses OAuth2 client credentials rather than a URL key, which is
 * why it gets its own module instead of another entry in `map-provider.ts`.
 * The secret stays server-side: pages request imagery through
 * `/api/satellite`, never the vendor directly.
 *
 *   COPERNICUS_CLIENT_ID="..."
 *   COPERNICUS_CLIENT_SECRET="..."
 *
 * Unset, `isSatelliteConfigured()` is false and the panel is simply not
 * rendered — nothing else changes.
 */

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"

export function isSatelliteConfigured(): boolean {
  return Boolean(
    process.env.COPERNICUS_CLIENT_ID?.trim() &&
      process.env.COPERNICUS_CLIENT_SECRET?.trim(),
  )
}

/**
 * Access tokens last about ten minutes. Cached in-process and refreshed a
 * minute early, so a page of imagery does not spend a token exchange per tile.
 */
let cachedToken: { value: string; expires: number } | null = null

export function resetSatelliteToken(): void {
  cachedToken = null
}

async function getAccessToken(now: number = Date.now()): Promise<string | null> {
  if (cachedToken && cachedToken.expires > now) return cachedToken.value

  const clientId = process.env.COPERNICUS_CLIENT_ID?.trim()
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })

    if (!response.ok) {
      // Never log the body: it can echo the secret back.
      console.error("[provider:satellite] token exchange failed", response.status)
      return null
    }

    const body = (await response.json()) as {
      access_token?: string
      expires_in?: number
    }
    if (!body.access_token) return null

    const lifetime = (body.expires_in ?? 600) * 1000
    cachedToken = {
      value: body.access_token,
      expires: now + Math.max(0, lifetime - 60_000), // refresh a minute early
    }
    return cachedToken.value
  } catch (error) {
    console.error("[provider:satellite] token request failed", error)
    return null
  }
}

/**
 * True-colour composite from the red, green and blue bands.
 *
 * The 2.5 gain is the conventional stretch for Sentinel-2 surface reflectance:
 * raw values are dark because they are calibrated for analysis, not viewing.
 */
const TRUE_COLOUR_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ["B04", "B03", "B02"], output: { bands: 3 } }
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02]
}`

export type SatelliteRequest = {
  centre: GeoPoint
  /** Half-width of the view in degrees. ~0.09 is roughly 10 km. */
  spread?: number
  width?: number
  height?: number
  /** How far back to look for a usable, low-cloud scene. */
  lookbackDays?: number
}

/**
 * A JPEG of the area, or null when it cannot be produced.
 *
 * Returns null rather than throwing for every failure — unconfigured, token
 * refused, no cloud-free scene in range — because the caller's answer is the
 * same in each case: do not render the panel.
 */
export async function fetchSatelliteImage(
  request: SatelliteRequest,
  now: Date = new Date(),
): Promise<ArrayBuffer | null> {
  const token = await getAccessToken(now.getTime())
  if (!token) return null

  const {
    centre,
    spread = 0.09,
    width = 512,
    height = 512,
    lookbackDays = 120,
  } = request

  const from = new Date(now.getTime() - lookbackDays * 86_400_000)

  try {
    const response = await fetch(PROCESS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/jpeg",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS * 3), // rendering is slow
      body: JSON.stringify({
        input: {
          bounds: {
            bbox: [
              centre.longitude - spread,
              centre.latitude - spread,
              centre.longitude + spread,
              centre.latitude + spread,
            ],
            properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
          },
          data: [
            {
              type: "sentinel-2-l2a",
              dataFilter: {
                timeRange: { from: from.toISOString(), to: now.toISOString() },
                maxCloudCoverage: 25,
                // Pick the least cloudy scene in range rather than the newest;
                // a recent photo of cloud is worth nothing.
                mosaickingOrder: "leastCC",
              },
            },
          ],
        },
        output: {
          width,
          height,
          responses: [{ identifier: "default", format: { type: "image/jpeg" } }],
        },
        evalscript: TRUE_COLOUR_EVALSCRIPT,
      }),
    })

    if (!response.ok) {
      console.error("[provider:satellite] process failed", response.status)
      return null
    }

    return await response.arrayBuffer()
  } catch (error) {
    console.error("[provider:satellite] process request failed", error)
    return null
  }
}
