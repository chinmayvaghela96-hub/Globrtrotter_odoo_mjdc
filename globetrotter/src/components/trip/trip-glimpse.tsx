"use client"

import { useEffect, useRef, useState } from "react"

/**
 * A lightweight animated "glimpse of the trip" —
 * cycles through city names with a crossfade slide.
 *
 * Respects `prefers-reduced-motion`: when reduced motion is preferred,
 * it shows the city names as a static comma-separated list instead.
 */
export function TripGlimpse({
  cities,
  tripName,
}: {
  cities: string[]
  tripName: string
}) {
  const prefersReduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prefersReduced || cities.length <= 1) return

    function tick() {
      setVisible(false)
      timer.current = setTimeout(() => {
        setIndex((i) => (i + 1) % cities.length)
        setVisible(true)
      }, 400)
    }

    const interval = setInterval(tick, 2800)
    return () => {
      clearInterval(interval)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [cities.length, prefersReduced])

  if (cities.length === 0) return null

  if (prefersReduced) {
    return (
      <p className="text-xs text-muted-foreground">
        {cities.join(" → ")}
      </p>
    )
  }

  return (
    <div
      aria-label={`${tripName} visits ${cities.join(", ")}`}
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <span className="text-muted-foreground/50">✈</span>
      <span
        style={{
          display: "inline-block",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-4px)",
          transition: "opacity 350ms ease, transform 350ms ease",
          minWidth: "8ch",
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {cities[index]}
      </span>
    </div>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return reduced
}
