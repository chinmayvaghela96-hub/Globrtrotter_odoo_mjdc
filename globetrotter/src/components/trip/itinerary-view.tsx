"use client"

import { useState } from "react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { eachDayUTC, formatDateUTC, labelDateUTC, parseDateUTC } from "@/lib/dates"
import { formatMoney } from "@/lib/serialize"
import type { TripDetail, TripDetailStop } from "@/lib/trip-queries"
import { SortableActivityList } from "./sortable-activity-list"

type View = "list" | "calendar"

function stopTotal(stop: TripDetailStop) {
  return (
    stop.transportCost +
    stop.stayCost +
    stop.activities.reduce((sum, a) => sum + a.cost, 0)
  )
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

export function ItinerarySkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse" aria-busy="true" aria-label="Loading itinerary">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="flex flex-col gap-2 pl-8">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-10 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyItinerary({ tripId }: { tripId: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
      <h2 className="font-medium">No cities yet</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Add the cities you want to visit and the day-by-day plan builds
        itself from the dates you give each stop.
      </p>
      <Link href={`/trips/${tripId}/build`} className={buttonVariants({ size: "sm" })}>
        Add the first city
      </Link>
    </div>
  )
}

// ─── Calendar Grid View ──────────────────────────────────────────────────────

function CalendarView({ trip }: { trip: TripDetail }) {
  // Collect every day of the trip keyed to its activities across all stops
  type DayCell = {
    date: string
    label: string
    city: string | null
    activities: TripDetail["stops"][number]["activities"]
    isStop: boolean
  }

  const allDays: DayCell[] = []

  for (const stop of trip.stops) {
    const days = eachDayUTC(parseDateUTC(stop.arrivalDate), parseDateUTC(stop.departureDate))
    for (const day of days) {
      const key = formatDateUTC(day)
      const dayActivities = stop.activities.filter((a) => a.scheduledDate === key)
      // Avoid duplicates when stops share a date (departure = next stop arrival)
      if (allDays.find((d) => d.date === key)) continue
      allDays.push({
        date: key,
        label: labelDateUTC(day),
        city: stop.city.name,
        activities: dayActivities,
        isStop: true,
      })
    }
  }

  allDays.sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {allDays.map((day) => (
        <div
          key={day.date}
          className="flex flex-col gap-2 rounded-xl border bg-card p-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{day.label}</span>
            {day.city && (
              <span className="text-xs text-muted-foreground">{day.city}</span>
            )}
          </div>
          {day.activities.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">Nothing planned</p>
          ) : (
            <ul className="flex flex-col gap-1" role="list">
              {day.activities.map((a) => (
                <li key={a.id} className="flex items-baseline gap-2 text-xs">
                  <span className="font-mono text-muted-foreground tabular-nums w-10 shrink-0">
                    {a.startTime ?? "--:--"}
                  </span>
                  <span className="flex-1 truncate">{a.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── List View ───────────────────────────────────────────────────────────────

function ListView({ trip }: { trip: TripDetail }) {
  return (
    <ol className="flex flex-col gap-8" role="list">
      {trip.stops.map((stop, index) => {
        const days = eachDayUTC(
          parseDateUTC(stop.arrivalDate),
          parseDateUTC(stop.departureDate),
        )

        return (
          <li key={stop.id} className="flex flex-col gap-4">
            {/* City header */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="text-lg font-semibold tracking-tight">
                  {stop.city.name}
                </h2>
                <span className="text-sm text-muted-foreground">{stop.city.country}</span>
              </div>
              <div className="flex items-baseline gap-4 text-sm text-muted-foreground">
                <span>
                  {labelDateUTC(parseDateUTC(stop.arrivalDate))} —{" "}
                  {labelDateUTC(parseDateUTC(stop.departureDate))}
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(stopTotal(stop), trip.currency)}
                </span>
              </div>
            </div>

            {/* Days within the stop */}
            <div className="flex flex-col gap-4 pl-1 sm:pl-8">
              {days.map((day) => {
                const key = formatDateUTC(day)
                const scheduled = stop.activities.filter(
                  (a) => a.scheduledDate === key,
                )

                return (
                  <div key={key} className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {labelDateUTC(day)}
                    </h3>

                    {scheduled.length === 0 ? (
                      <p className="text-sm text-muted-foreground/70">Nothing planned.</p>
                    ) : (
                      <SortableActivityList
                        activities={scheduled}
                        currency={trip.currency}
                      />
                    )}
                  </div>
                )
              })}

              {(stop.transportCost > 0 || stop.stayCost > 0) && (
                <p className="text-xs text-muted-foreground">
                  Transport {formatMoney(stop.transportCost, trip.currency)} · Stay{" "}
                  {formatMoney(stop.stayCost, trip.currency)}
                  <span className="text-muted-foreground/70">
                    {" "}— both counted on the arrival date
                  </span>
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function ItineraryView({ trip }: { trip: TripDetail }) {
  const [view, setView] = useState<View>("list")

  if (trip.stops.length === 0) {
    return <EmptyItinerary tripId={trip.id} />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* View toggle */}
      <div className="flex items-center gap-1 self-start rounded-lg border bg-card p-1" role="group" aria-label="View mode">
        <ViewToggleButton active={view === "list"} onClick={() => setView("list")}>
          List
        </ViewToggleButton>
        <ViewToggleButton active={view === "calendar"} onClick={() => setView("calendar")}>
          Calendar
        </ViewToggleButton>
      </div>

      {view === "list" ? <ListView trip={trip} /> : <CalendarView trip={trip} />}
    </div>
  )
}

function ViewToggleButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}
