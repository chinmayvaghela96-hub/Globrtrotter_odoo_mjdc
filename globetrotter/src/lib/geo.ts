/**
 * Distance and direction between cities.
 *
 * Every seeded city already carries a latitude and longitude, so "what is near
 * this place" is arithmetic on data we hold — it needs no map provider and no
 * API key. Only *drawing* a map needs a provider, which is why that lives
 * behind the adapter in `lib/map-provider.ts` and degrades to a plain SVG.
 */

export type GeoPoint = { latitude: number; longitude: number }

const EARTH_RADIUS_KM = 6371
const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

/**
 * Great-circle distance in kilometres.
 *
 * Haversine treats the earth as a sphere, so it is off by up to about 0.5%
 * against a proper ellipsoid model. For ranking which cities are closest that
 * is far below the threshold where anyone would notice.
 */
export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Initial bearing in degrees clockwise from north, 0–360. */
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)
  const dLon = toRadians(to.longitude - from.longitude)

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const
export type Compass = (typeof COMPASS)[number]

/** Bearing to an eight-point compass label. */
export function compassFromBearing(degrees: number): Compass {
  const normalised = ((degrees % 360) + 360) % 360
  return COMPASS[Math.round(normalised / 45) % 8]
}

/** "1,240 km" / "68 km" — rounded to something a person would say. */
export function formatDistance(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`
  if (km < 1000) return `${Math.round(km)} km`
  return `${Math.round(km).toLocaleString("en-IN")} km`
}

export type Located<T> = T & GeoPoint

export type NearbyResult<T> = {
  item: Located<T>
  distanceKm: number
  bearing: number
  compass: Compass
}

/**
 * The `limit` closest entries to `origin`, nearest first.
 *
 * A linear scan, because the catalogue is tens of cities. At thousands you
 * would pre-filter with a bounding box in SQL before measuring; the shape of
 * this function would not change.
 */
export function nearest<T>(
  origin: GeoPoint,
  candidates: Located<T>[],
  options: { limit?: number; maxKm?: number } = {},
): NearbyResult<T>[] {
  const { limit = 6, maxKm } = options

  return candidates
    .map((item) => {
      const distanceKm = haversineKm(origin, item)
      const bearing = bearingDegrees(origin, item)
      return { item, distanceKm, bearing, compass: compassFromBearing(bearing) }
    })
    .filter((result) => (maxKm === undefined ? true : result.distanceKm <= maxKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
}

/**
 * The bounding box containing every point, padded so markers do not sit on
 * the edge. Used to frame both the provider map and the SVG fallback.
 */
export function boundsOf(points: GeoPoint[], padding = 0.15) {
  if (points.length === 0) {
    return { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 }
  }

  const lats = points.map((p) => p.latitude)
  const lons = points.map((p) => p.longitude)

  let minLat = Math.min(...lats)
  let maxLat = Math.max(...lats)
  let minLon = Math.min(...lons)
  let maxLon = Math.max(...lons)

  // A single point has no extent; give it a window to sit in the middle of.
  const latSpan = Math.max(maxLat - minLat, 1)
  const lonSpan = Math.max(maxLon - minLon, 1)

  minLat -= latSpan * padding
  maxLat += latSpan * padding
  minLon -= lonSpan * padding
  maxLon += lonSpan * padding

  return {
    minLat: Math.max(-90, minLat),
    maxLat: Math.min(90, maxLat),
    minLon: Math.max(-180, minLon),
    maxLon: Math.min(180, maxLon),
  }
}
