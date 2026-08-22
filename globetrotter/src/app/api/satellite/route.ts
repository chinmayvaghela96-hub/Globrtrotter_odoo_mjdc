import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { currentUser } from "@/lib/guard"
import {
  fetchSatelliteImage,
  isSatelliteConfigured,
} from "@/lib/providers/satellite"

/**
 * Sentinel-2 imagery, proxied.
 *
 * Copernicus authenticates with an OAuth client secret, which can never reach
 * the browser, so the page points an `<img>` here and this route does the
 * token exchange and the render request server-side.
 *
 * Signed-in only, and every parameter is bounded — an unchecked passthrough
 * would let anyone spend our quota on arbitrary renders, and Sentinel renders
 * are metered and slow.
 */

const Query = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  // Roughly 1 km to 55 km across. Wider than this and a city is a smudge.
  spread: z.coerce.number().min(0.01).max(0.5).default(0.09),
  size: z.coerce.number().int().min(128).max(1024).default(512),
})

export async function GET(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in to load imagery." }, { status: 401 })
  }

  if (!isSatelliteConfigured()) {
    // Not an error: the panel is optional and the caller simply omits it.
    return NextResponse.json(
      { error: "Satellite imagery is not configured.", fallback: true },
      { status: 501 },
    )
  }

  const params = request.nextUrl.searchParams
  const parsed = Query.safeParse({
    lat: params.get("lat") ?? undefined,
    lon: params.get("lon") ?? undefined,
    spread: params.get("spread") ?? undefined,
    size: params.get("size") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid imagery request.",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    )
  }

  const { lat, lon, spread, size } = parsed.data

  const image = await fetchSatelliteImage({
    centre: { latitude: lat, longitude: lon },
    spread,
    width: size,
    height: size,
  })

  if (!image) {
    return NextResponse.json(
      { error: "No usable scene for this area right now.", fallback: true },
      { status: 502 },
    )
  }

  return new NextResponse(image, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      // A city does not move and the scene is chosen for low cloud, not
      // recency, so this is safe to cache hard. Renders are metered.
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
    },
  })
}
