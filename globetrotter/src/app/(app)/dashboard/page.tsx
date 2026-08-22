import Link from "next/link"
import { Compass, Globe } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { requireUser } from "@/lib/guard"
import { dayCountUTC, labelDateUTC } from "@/lib/dates"
import { formatMoney } from "@/lib/serialize"
import { getInspirationTrips, getPublicTrips, getRecommendedCities, getTripSummaries } from "@/lib/trip-queries"

export const metadata = { title: "Dashboard · GlobeTrotter" }

export default async function DashboardPage() {
  const user = await requireUser()
  const [trips, cities, inspirations, publicTrips] = await Promise.all([
    getTripSummaries(user.id),
    getRecommendedCities(6),
    getInspirationTrips(3),
    getPublicTrips({ take: 3, excludeUserId: user.id }),
  ])

  const today = new Date()
  const upcoming = trips.filter((trip) => trip.endDate >= today)
  const plannedSpend = trips.reduce((sum, trip) => sum + trip.total, 0)

  return (
    <div className="flex flex-col gap-10">
      {/* Welcome & Action Banner */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {upcoming.length > 0
              ? `${upcoming.length} trip${upcoming.length === 1 ? "" : "s"} coming up.`
              : "Nothing planned yet. That is easy to fix."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inspiration" className={buttonVariants({ variant: "outline" })}>
            Explore inspiration
          </Link>
          <Link href="/trips/new" className={buttonVariants()}>
            Plan a new trip
          </Link>
        </div>
      </section>

      {/* Stats Summary */}
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

      {/* User's Personal Trips */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Your trips</h2>
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

      {/* Curated Classic Itineraries for Inspiration */}
      {inspirations.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Classic Inspiration</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Curated
              </span>
            </div>
            <Link href="/inspiration" className="text-sm text-muted-foreground hover:underline">
              Explore all
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inspirations.map((itinerary) => (
              <Link
                key={itinerary.id}
                href={`/t/${itinerary.shareSlug}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-foreground/25 hover:shadow-xs"
              >
                <div className="relative h-32 w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itinerary.coverUrl || "/hero.jpg"}
                    alt={itinerary.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-3 text-sm font-bold text-white drop-shadow-xs">
                    {itinerary.name}
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {itinerary.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">{itinerary.cities.join(" → ")}</span>
                    <span className="tabular-nums font-semibold text-foreground">
                      {formatMoney(itinerary.estimatedSpend, itinerary.currency)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Community Itineraries */}
      {publicTrips.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">Community Itineraries</h2>
            </div>
            <Link href="/inspiration" className="text-sm text-muted-foreground hover:underline">
              Explore more
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicTrips.map((trip) => (
              <Link
                key={trip.id}
                href={`/t/${trip.shareSlug}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/40"
              >
                <div className="relative h-32 w-full overflow-hidden bg-muted">
                  {trip.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trip.coverUrl}
                      alt={trip.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Globe className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between text-xs">
                    <span className="rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-foreground">
                      by {trip.author}
                    </span>
                    <span className="rounded-full bg-primary/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white">
                      {dayCountUTC(trip.startDate, trip.endDate)} days
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-4 gap-2">
                  <div>
                    <h3 className="font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {trip.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                      {trip.cities.length > 0 ? trip.cities.join(" → ") : "Flexible stops"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t text-muted-foreground">
                    <span>{trip.activityCount} activities</span>
                    <span className="font-semibold text-foreground">
                      ~{formatMoney(trip.total, trip.currency)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Popular Destinations */}
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Popular destinations</h2>
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
                alt={city.name}
                className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
