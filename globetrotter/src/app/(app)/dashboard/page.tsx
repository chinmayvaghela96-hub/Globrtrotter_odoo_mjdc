import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/guard"
import { labelDateUTC } from "@/lib/dates"
import { formatMoney } from "@/lib/serialize"
import { getRecommendedCities, getTripSummaries } from "@/lib/trip-queries"

export const metadata = { title: "Dashboard · GlobeTrotter" }

export default async function DashboardPage() {
  const user = await requireUser()
  const [trips, cities] = await Promise.all([
    getTripSummaries(user.id),
    getRecommendedCities(6),
  ])

  const today = new Date()
  const upcoming = trips.filter((trip) => trip.endDate >= today)
  const plannedSpend = trips.reduce((sum, trip) => sum + trip.total, 0)

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {upcoming.length > 0
              ? `${upcoming.length} trip${upcoming.length === 1 ? "" : "s"} coming up.`
              : "Nothing planned yet. That is easy to fix."}
          </p>
        </div>
        <Link href="/trips/new" className={buttonVariants()}>
          Plan a new trip
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Trips planned" value={String(trips.length)} />
        <Stat
          label="Total planned spend"
          value={formatMoney(plannedSpend, user.currency)}
        />
        <Stat
          label="Days over budget"
          value={String(trips.reduce((sum, trip) => sum + trip.overBudgetDays, 0))}
          tone={trips.some((trip) => trip.overBudgetDays > 0) ? "warn" : "default"}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your trips</h2>
          <Link href="/trips" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>

        {trips.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.slice(0, 3).map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium leading-tight">{trip.name}</h3>
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
                  {trip.stopCount} {trip.stopCount === 1 ? "city" : "cities"}
                  {trip.cities.length > 0 && ` · ${trip.cities.join(" → ")}`}
                </p>
                <p className="mt-auto pt-2 text-sm font-medium tabular-nums">
                  {formatMoney(trip.total, trip.currency)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Popular right now</h2>
          <Link href="/cities" className="text-sm text-muted-foreground hover:underline">
            Browse all cities
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <Link
              key={city.id}
              href={`/activities?cityId=${city.id}`}
              className="group overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/25"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={city.imageUrl}
                alt=""
                className="h-32 w-full object-cover"
                loading="lazy"
              />
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col">
                  <span className="font-medium leading-tight">{city.name}</span>
                  <span className="text-sm text-muted-foreground">{city.country}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  cost {city.costIndex}/100
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "warn"
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-2xl font-semibold tabular-nums ${
          tone === "warn" ? "text-amber-600 dark:text-amber-500" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
      <h3 className="font-medium">No trips yet</h3>
      <p className="max-w-prose text-sm text-muted-foreground">
        Create a trip, add the cities you want to visit, and GlobeTrotter will
        build the day-by-day plan and the running cost as you go.
      </p>
      <Link href="/trips/new" className={buttonVariants({ size: "sm" })}>
        Plan your first trip
      </Link>
    </div>
  )
}
