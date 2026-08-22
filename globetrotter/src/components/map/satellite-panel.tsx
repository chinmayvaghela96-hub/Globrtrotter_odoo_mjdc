"use client"

import { useState } from "react"

/**
 * "From space" — Sentinel-2 true colour for one city.
 *
 * Deliberately not part of the locator map. Satellite imagery carries no
 * labels, roads or borders, so it answers "what does this place look like",
 * not "where is it". The two sit side by side rather than one replacing the
 * other.
 *
 * A render can take several seconds and can legitimately come back empty when
 * every recent pass was cloudy, so the panel handles three states: loading,
 * image, and a plain explanation. It removes itself entirely when the
 * provider is unconfigured.
 */
export function SatellitePanel({
  cityName,
  latitude,
  longitude,
  configured,
}: {
  cityName: string
  latitude: number
  longitude: number
  configured: boolean
}) {
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading")
  const [spread, setSpread] = useState(0.09)

  if (!configured) return null

  const src = `/api/satellite?lat=${latitude}&lon=${longitude}&spread=${spread}&size=512`

  const zooms = [
    { label: "City", value: 0.09 },
    { label: "Wider", value: 0.2 },
    { label: "Region", value: 0.45 },
  ]

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          From space
        </h2>

        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          {zooms.map((zoom) => (
            <button
              key={zoom.value}
              type="button"
              aria-pressed={spread === zoom.value}
              onClick={() => {
                if (zoom.value === spread) return
                setState("loading")
                setSpread(zoom.value)
              }}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                spread === zoom.value
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {zoom.label}
            </button>
          ))}
        </div>
      </div>

      <figure className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-xl border bg-muted">
          {state === "unavailable" ? (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm font-medium">No clear view right now</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Every recent pass over {cityName} was too cloudy to use. Try a
                wider view, or come back in a few days.
              </p>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                // Re-request when the zoom changes rather than reusing the
                // cached element, which would show the old extent while the
                // new one loads.
                key={spread}
                src={src}
                alt={`Sentinel-2 satellite view of ${cityName}`}
                width={512}
                height={512}
                className={`aspect-square w-full object-cover transition-opacity duration-500 ${
                  state === "ready" ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setState("ready")}
                onError={() => setState("unavailable")}
              />
              {state === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Finding the clearest recent pass...
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <figcaption className="text-xs text-muted-foreground">
          Sentinel-2 true colour · Copernicus Data Space. The least cloudy scene
          from the last four months, not the most recent one.
        </figcaption>
      </figure>
    </section>
  )
}
