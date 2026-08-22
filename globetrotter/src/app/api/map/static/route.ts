import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { currentUser } from "@/lib/guard"
import {
  getMapApiKey,
  getMapProvider,
  type MapMarker,
} from "@/lib/map-provider"

/**
 * Static map images, proxied.
 *
 * The page points an `<img>` here rather than at the vendor, so the API key
 * stays on the server. Without this hop the key would sit in the page source
 * of every city page.
 *
 * Signed-in only, and every parameter is validated before it reaches the
 * vendor — an unchecked passthrough would let anyone use our key for arbitrary
 * requests.
 */

/** "lon,lat" or "lon,lat,p" where the trailing p marks the primary pin. */
const MarkerParam = z
  .string()
  .transform((value, ctx) => {
    const parts = value.split(",")
    if (parts.length < 2 || parts.length > 3) {
      ctx.addIssue({ code: "custom", message: "Expected lon,lat[,p]" })
      return z.NEVER
    }

    const longitude = Number(parts[0])
    const latitude = Number(parts[1])

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      ctx.addIssue({ code: "custom", message: "Longitude out of range" })
      return z.NEVER
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      ctx.addIssue({ code: "custom", message: "Latitude out of range" })
      return z.NEVER
    }

    return { longitude, latitude, primary: parts[2] === "p" } satisfies MapMarker
  })

const Query = z.object({
  // Bounded: a huge image would be an expensive request made on our key.
  w: z.coerce.number().int().min(80).max(1280).default(720),
  h: z.coerce.number().int().min(80).max(1280).default(360),
  m: z.array(MarkerParam).min(1, "At least one marker.").max(25),
})

export async function GET(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in to load maps." }, { status: 401 })
  }

  const provider = getMapProvider()
  const apiKey = getMapApiKey()
  if (!provider || !apiKey) {
    // Not an error: the app is designed to run without a map key, and the
    // caller renders its own fallback when it sees this.
    return NextResponse.json(
      { error: "No map provider configured.", fallback: true },
      { status: 501 },
    )
  }

  const params = request.nextUrl.searchParams
  const parsed = Query.safeParse({
    w: params.get("w") ?? undefined,
    h: params.get("h") ?? undefined,
    m: params.getAll("m"),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid map request.", issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 },
    )
  }

  const { w, h, m } = parsed.data

  try {
    const upstream = await fetch(
      provider.buildStaticUrl({ markers: m, width: w, height: h }, apiKey),
      { signal: AbortSignal.timeout(8000) },
    )

    if (!upstream.ok) {
      // Never surface the vendor's body: it can echo the key back.
      console.error("[map] provider responded", upstream.status)
      return NextResponse.json(
        { error: "The map service did not respond.", fallback: true },
        { status: 502 },
      )
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        // City coordinates never move, so this is safe to cache hard.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    })
  } catch (error) {
    console.error("[map] fetch failed", error)
    return NextResponse.json(
      { error: "The map service did not respond.", fallback: true },
      { status: 502 },
    )
  }
}
