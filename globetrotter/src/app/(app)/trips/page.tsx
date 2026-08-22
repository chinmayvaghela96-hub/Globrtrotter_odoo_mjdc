import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { labelDateUTC } from "@/lib/dates"
import { requireUser } from "@/lib/guard"
import { formatMoney } from "@/lib/serialize"
import { getTripSummaries } from "@/lib/trip-queries"

export const metadata = { title: "My trips · GlobeTrotter" }

export default async function TripsPage() {
  const user = await requireUser()
  const trips = await getTripSummaries(user.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My trips</h1>
          <p className="text-sm text-muted-foreground">
            {trips.length === 0
              ? "Nothing here yet."
              : `${trips.length} trip${trips.length === 1 ? "" : "s"}, oldest first.`}
          </p>
        </div>
        <Link href="/trips/new" className={buttonVariants()}>
          Plan a new trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
          <h2 className="font-medium">No trips yet</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Create a trip, add the cities you want to visit, and GlobeTrotter
            builds the day-by-day plan and the running cost as you go.
          </p>
          <Link href="/trips/new" className={buttonVariants({ size: "sm" })}>
            Plan your first trip
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium leading-tight">{trip.name}</h2>
                  {trip.isPublic && (
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                      Public
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {labelDateUTC(trip.startDate)} — {labelDateUTC(trip.endDate)}
                </p>

                <p className="text-sm text-muted-foreground">
                  {trip.stopCount === 0
                    ? "No cities yet"
                    : `${trip.stopCount} ${trip.stopCount === 1 ? "city" : "cities"} · ${trip.cities.join(" → ")}`}
                </p>

                <div className="mt-auto flex items-baseline justify-between gap-3 pt-2">
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(trip.total, trip.currency)}
                  </span>
                  {trip.overBudgetDays > 0 && (
                    <span className="text-xs text-amber-600 tabular-nums dark:text-amber-500">
                      {trip.overBudgetDays} day
                      {trip.overBudgetDays === 1 ? "" : "s"} over
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
