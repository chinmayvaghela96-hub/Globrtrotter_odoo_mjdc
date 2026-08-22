import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Clock, MapPin, Tag, Utensils } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { eachDayUTC, formatDateUTC, labelDateUTC, parseDateUTC } from "@/lib/dates"
import { requireTripOwner } from "@/lib/guard"
import { formatMoney } from "@/lib/serialize"
import { getTripDetail, getTripExpenses } from "@/lib/trip-queries"

export const metadata = { title: "Calendar & Timeline · GlobeTrotter" }

const CATEGORY_COLORS: Record<string, string> = {
  SIGHTSEEING: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900",
  CULTURE: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900",
  FOOD: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900",
  ADVENTURE: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900",
  NATURE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900",
  NIGHTLIFE: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900",
  SHOPPING: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900",
  RELAXATION: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-900",
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export default async function TripCalendarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireTripOwner(id)

  const [trip, expenses] = await Promise.all([
    getTripDetail(id),
    getTripExpenses(id),
  ])

  if (!trip) notFound()

  if (trip.stops.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
        <h2 className="font-medium">No stops in this trip yet</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Add cities and dates to your itinerary to view the schedule timeline.
        </p>
        <Link
          href={`/trips/${trip.id}/build`}
          className={buttonVariants({ size: "sm" })}
        >
          Go to Trip Builder
        </Link>
      </div>
    )
  }

  const days = eachDayUTC(
    parseDateUTC(trip.startDate),
    parseDateUTC(trip.endDate),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Timeline & Daily Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Chronological view of all destinations, scheduled activities, and logged expenses.
          </p>
        </div>
      </div>

      <div className="relative flex flex-col gap-8 border-l-2 border-muted pl-4 sm:pl-6">
        {days.map((day, dayIndex) => {
          const dateStr = formatDateUTC(day)
          const dateLabel = labelDateUTC(day)

          // Find which stop(s) cover this day
          const activeStops = trip.stops.filter((stop) => {
            return dateStr >= stop.arrivalDate && dateStr <= stop.departureDate
          })

          const arrivalStops = trip.stops.filter(
            (stop) => stop.arrivalDate === dateStr,
          )

          // Activities on this day
          const scheduledActivities = trip.stops.flatMap((stop) =>
            stop.activities
              .filter((act) => act.scheduledDate === dateStr)
              .map((act) => ({ ...act, cityName: stop.city.name })),
          )

          // Extra expenses on this day
          const dayExpenses = expenses.filter((exp) => exp.date === dateStr)

          // Compute daily sum
          const arrivalCosts = arrivalStops.reduce(
            (sum, s) => sum + s.transportCost + s.stayCost,
            0,
          )
          const activityCosts = scheduledActivities.reduce(
            (sum, a) => sum + a.cost,
            0,
          )
          const extraCosts = dayExpenses.reduce(
            (sum, e) => sum + e.amount,
            0,
          )
          const dayTotal = arrivalCosts + activityCosts + extraCosts

          return (
            <div key={dateStr} className="relative flex flex-col gap-3">
              {/* Timeline marker point */}
              <div className="absolute -left-[23px] sm:-left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-foreground shadow-sm" />

              {/* Day Header */}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xs font-semibold text-primary">
                    Day {dayIndex + 1}
                  </span>
                  <h3 className="font-semibold text-base">{dateLabel}</h3>
                  {activeStops.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {activeStops.map((s) => s.city.name).join(" / ")}
                    </span>
                  )}
                </div>

                {dayTotal > 0 && (
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    Day spend: {formatMoney(dayTotal, trip.currency)}
                  </span>
                )}
              </div>

              {/* Arrivals / Transit banner */}
              {arrivalStops.map((stop) => (
                <div
                  key={`arrival-${stop.id}`}
                  className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">
                      Arrive in {stop.city.name}, {stop.city.country}
                    </span>
                  </div>
                  {(stop.transportCost > 0 || stop.stayCost > 0) && (
                    <span className="tabular-nums text-muted-foreground">
                      Transit {formatMoney(stop.transportCost, trip.currency)} · Stay {formatMoney(stop.stayCost, trip.currency)}
                    </span>
                  )}
                </div>
              ))}

              {/* Scheduled Activities */}
              {scheduledActivities.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {scheduledActivities.map((act) => (
                    <Card key={act.id} className="overflow-hidden border bg-card py-0">
                      <CardContent className="flex flex-col gap-2 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {act.startTime ?? "--:--"}
                            </span>
                            {act.category && (
                              <span
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                                  CATEGORY_COLORS[act.category] ?? "bg-muted text-muted-foreground"
                                }`}
                              >
                                {act.category.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold tabular-nums">
                            {act.cost === 0 ? "Free" : formatMoney(act.cost, trip.currency)}
                          </span>
                        </div>

                        <span className="text-sm font-medium leading-snug">
                          {act.name}
                        </span>

                        <span className="text-[11px] text-muted-foreground">
                          Duration: {durationLabel(act.durationMin)} · {act.cityName}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : arrivalStops.length === 0 ? (
                <p className="text-xs text-muted-foreground/70 italic">
                  No scheduled activities for this day.
                </p>
              ) : null}

              {/* Standalone Expenses */}
              {dayExpenses.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {dayExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-xs"
                    >
                      <Utensils className="h-3 w-3 text-muted-foreground" />
                      <span>{exp.label}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        ({formatMoney(exp.amount, trip.currency)})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
