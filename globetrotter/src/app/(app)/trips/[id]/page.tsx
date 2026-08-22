import Link from "next/link"
import { notFound } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { eachDayUTC, formatDateUTC, labelDateUTC, parseDateUTC } from "@/lib/dates"
import { requireTripOwner } from "@/lib/guard"
import { formatMoney } from "@/lib/serialize"
import { getTripDetail, type TripDetailStop } from "@/lib/trip-queries"

export const metadata = { title: "Itinerary · GlobeTrotter" }

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

function stopTotal(stop: TripDetailStop) {
  return (
    stop.transportCost +
    stop.stayCost +
    stop.activities.reduce((sum, activity) => sum + activity.cost, 0)
  )
}

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireTripOwner(id) // the layout checks too; this page must not assume it

  const trip = await getTripDetail(id)
  if (!trip) notFound()

  if (trip.stops.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
        <h2 className="font-medium">No cities yet</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Add the cities you want to visit and the day-by-day plan builds
          itself from the dates you give each stop.
        </p>
        <Link
          href={`/trips/${trip.id}/build`}
          className={buttonVariants({ size: "sm" })}
        >
          Add the first city
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <ol className="flex flex-col gap-8">
        {trip.stops.map((stop, index) => {
          const days = eachDayUTC(
            parseDateUTC(stop.arrivalDate),
            parseDateUTC(stop.departureDate),
          )

          return (
            <li key={stop.id} className="flex flex-col gap-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-2">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {stop.city.name}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {stop.city.country}
                  </span>
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

              <div className="flex flex-col gap-4 pl-1 sm:pl-8">
                {days.map((day) => {
                  const key = formatDateUTC(day)
                  const scheduled = stop.activities.filter(
                    (activity) => activity.scheduledDate === key,
                  )

                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {labelDateUTC(day)}
                      </h3>

                      {scheduled.length === 0 ? (
                        <p className="text-sm text-muted-foreground/70">
                          Nothing planned.
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {scheduled.map((activity) => (
                            <li
                              key={activity.id}
                              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border bg-card px-3 py-2"
                            >
                              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                {activity.startTime ?? "--:--"}
                              </span>
                              <span className="flex-1 text-sm">{activity.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {duration(activity.durationMin)}
                              </span>
                              <span className="text-sm tabular-nums">
                                {activity.cost === 0
                                  ? "Free"
                                  : formatMoney(activity.cost, trip.currency)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}

                {(stop.transportCost > 0 || stop.stayCost > 0) && (
                  <p className="text-xs text-muted-foreground">
                    Transport {formatMoney(stop.transportCost, trip.currency)} ·
                    Stay {formatMoney(stop.stayCost, trip.currency)}
                    <span className="text-muted-foreground/70">
                      {" "}
                      — both counted on the arrival date
                    </span>
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
