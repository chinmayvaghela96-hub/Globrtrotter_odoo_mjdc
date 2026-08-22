import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchSatelliteImage,
  isSatelliteConfigured,
  resetSatelliteToken,
} from "@/lib/providers/satellite"

/**
 * Copernicus is the one adapter holding a secret rather than a URL key, so
 * these cover the two things that matter: the secret never leaks into a log or
 * a response, and every failure resolves to null rather than throwing — the
 * caller's answer is the same in each case, which is to not render the panel.
 */

const CENTRE = { latitude: 13.7563, longitude: 100.5018 }
const KEYS = ["COPERNICUS_CLIENT_ID", "COPERNICUS_CLIENT_SECRET"] as const

let saved: Record<string, string | undefined> = {}

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]))
  for (const key of KEYS) delete process.env[key]
  resetSatelliteToken()
  vi.restoreAllMocks()
})

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  resetSatelliteToken()
})

const configure = () => {
  process.env.COPERNICUS_CLIENT_ID = "test-client"
  process.env.COPERNICUS_CLIENT_SECRET = "test-secret"
}

describe("configuration", () => {
  it("is unconfigured with neither credential", () => {
    expect(isSatelliteConfigured()).toBe(false)
  })

  it("needs both halves, not just one", () => {
    process.env.COPERNICUS_CLIENT_ID = "test-client"
    expect(isSatelliteConfigured()).toBe(false)

    delete process.env.COPERNICUS_CLIENT_ID
    process.env.COPERNICUS_CLIENT_SECRET = "test-secret"
    expect(isSatelliteConfigured()).toBe(false)
  })

  it("treats whitespace as unset", () => {
    process.env.COPERNICUS_CLIENT_ID = "   "
    process.env.COPERNICUS_CLIENT_SECRET = "   "
    expect(isSatelliteConfigured()).toBe(false)
  })
})

describe("fetchSatelliteImage", () => {
  it("does not call out at all when unconfigured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(await fetchSatelliteImage({ centre: CENTRE })).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("exchanges credentials for a token, then renders", async () => {
    configure()

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "tok", expires_in: 600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))

    const image = await fetchSatelliteImage({ centre: CENTRE })

    expect(image).not.toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // The render must carry the bearer token, not the raw secret.
    const renderInit = fetchSpy.mock.calls[1]?.[1] as RequestInit
    const auth = (renderInit.headers as Record<string, string>).Authorization
    expect(auth).toBe("Bearer tok")
    expect(JSON.stringify(renderInit.body)).not.toContain("test-secret")
  })

  it("reuses a cached token instead of exchanging per render", async () => {
    configure()
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "tok", expires_in: 600 }), {
          status: 200,
        }),
      )
      .mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }))

    await fetchSatelliteImage({ centre: CENTRE })
    await fetchSatelliteImage({ centre: CENTRE })

    // One token exchange, two renders.
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it("returns null when the credentials are refused", async () => {
    configure()
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid_client", { status: 401 }),
    )

    expect(await fetchSatelliteImage({ centre: CENTRE })).toBeNull()
    // The vendor body can echo the secret; it must never reach a log.
    const logged = errorSpy.mock.calls.flat().join(" ")
    expect(logged).not.toContain("test-secret")
  })

  it("returns null rather than throwing when the network fails", async () => {
    configure()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"))

    await expect(fetchSatelliteImage({ centre: CENTRE })).resolves.toBeNull()
  })

  it("returns null when no scene could be rendered", async () => {
    configure()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "tok", expires_in: 600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("no data", { status: 404 }))

    expect(await fetchSatelliteImage({ centre: CENTRE })).toBeNull()
  })

  it("asks for a box centred on the city, and for the least cloudy scene", async () => {
    configure()
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "tok", expires_in: 600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { status: 200 }))

    await fetchSatelliteImage({ centre: CENTRE, spread: 0.1 })

    const body = JSON.parse(String((fetchSpy.mock.calls[1]?.[1] as RequestInit).body))
    const [minLon, minLat, maxLon, maxLat] = body.input.bounds.bbox

    expect((minLon + maxLon) / 2).toBeCloseTo(CENTRE.longitude, 6)
    expect((minLat + maxLat) / 2).toBeCloseTo(CENTRE.latitude, 6)
    // A recent photograph of cloud is worth nothing.
    expect(body.input.data[0].dataFilter.mosaickingOrder).toBe("leastCC")
  })
})
