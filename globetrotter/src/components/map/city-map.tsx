"use client"

import { useState } from "react"
import { boundsOf, type GeoPoint } from "@/lib/geo"

export type CityMarker = GeoPoint & {
  id: string
  label: string
  primary?: boolean
}

/**
 * A map of a city and what is near it.
 *
 * Two rendering paths. When a provider is configured the image comes from
 * `/api/map/static`, which holds the API key server-side. When it is not — or
 * when that request fails at runtime — this falls back to plotting the points
 * itself. The fallback is not a placeholder: the coordinates are real and the
 * relative positions are correct, so the page is still useful with no vendor,
 * no key and no network.
 */
export function CityMap({
  markers,
  providerConfigured,
  attribution,
  className,
}: {
  markers: CityMarker[]
  providerConfigured: boolean
  attribution?: string
  className?: string
}) {
  const [providerFailed, setProviderFailed] = useState(false)
  const useProvider = providerConfigured && !providerFailed

  const query = new URLSearchParams()
  query.set("w", "720")
  query.set("h", "360")
  for (const marker of markers) {
    query.append(
      "m",
      `${marker.longitude},${marker.latitude}${marker.primary ? ",p" : ""}`,
    )
  }

  return (
    <figure className={className}>
      <div className="relative overflow-hidden rounded-xl border bg-muted">
        {useProvider ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/map/static?${query.toString()}`}
            alt={`Map showing ${markers.find((m) => m.primary)?.label ?? "the selected city"} and nearby cities`}
            width={720}
            height={360}
            className="aspect-[2/1] w-full object-cover"
            onError={() => setProviderFailed(true)}
          />
        ) : (
          <PlottedMap markers={markers} />
        )}
      </div>

      <figcaption className="mt-2 text-xs text-muted-foreground">
        {useProvider
          ? attribution
          : "Approximate positions plotted from stored coordinates. Set MAP_API_KEY for a full map."}
      </figcaption>
    </figure>
  )
}

const WIDTH = 720
const HEIGHT = 360

/**
 * Equirectangular plot of the markers within their own bounding box.
 *
 * Deliberately not a world map: at this zoom a coastline outline would be
 * misleading detail. The graticule gives a sense of scale without pretending
 * to be geography we do not have.
 */
function PlottedMap({ markers }: { markers: CityMarker[] }) {
  const bounds = boundsOf(markers, 0.25)
  const lonSpan = bounds.maxLon - bounds.minLon || 1
  const latSpan = bounds.maxLat - bounds.minLat || 1

  const project = (point: GeoPoint) => ({
    x: ((point.longitude - bounds.minLon) / lonSpan) * WIDTH,
    y: ((bounds.maxLat - point.latitude) / latSpan) * HEIGHT,
  })

  const primary = markers.find((marker) => marker.primary)
  const origin = primary ? project(primary) : null

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="aspect-[2/1] w-full bg-[color-mix(in_oklch,var(--primary),var(--background)_88%)]"
      role="img"
      aria-label={`Plot of ${primary?.label ?? "the selected city"} and ${markers.length - 1} nearby cities`}
    >
      <g stroke="currentColor" className="text-foreground/10" strokeWidth="1">
        {[1, 2, 3].map((i) => (
          <line key={`v${i}`} x1={(WIDTH / 4) * i} y1="0" x2={(WIDTH / 4) * i} y2={HEIGHT} />
        ))}
        {[1, 2, 3].map((i) => (
          <line key={`h${i}`} x1="0" y1={(HEIGHT / 4) * i} x2={WIDTH} y2={(HEIGHT / 4) * i} />
        ))}
      </g>

      {/* Lines from the target city to each neighbour, so distance reads visually. */}
      {origin &&
        markers
          .filter((marker) => !marker.primary)
          .map((marker) => {
            const point = project(marker)
            return (
              <line
                key={`link-${marker.id}`}
                x1={origin.x}
                y1={origin.y}
                x2={point.x}
                y2={point.y}
                stroke="currentColor"
                className="text-primary/35"
                strokeWidth="1.25"
                strokeDasharray="4 5"
              />
            )
          })}

      {markers.map((marker) => {
        const point = project(marker)
        const radius = marker.primary ? 8 : 5

        return (
          <g key={marker.id}>
            <circle
              cx={point.x}
              cy={point.y}
              r={radius}
              className={marker.primary ? "fill-accent" : "fill-primary"}
              stroke="var(--background)"
              strokeWidth="2"
            />
            <text
              x={point.x}
              y={point.y - radius - 6}
              textAnchor="middle"
              className={
                marker.primary
                  ? "fill-foreground text-[13px] font-semibold"
                  : "fill-muted-foreground text-[11px]"
              }
            >
              {marker.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
