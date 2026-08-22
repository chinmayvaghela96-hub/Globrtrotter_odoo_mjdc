import Link from "next/link"
import { Calendar, Compass, Copy, Eye, Globe, MapPin, Sparkles } from "lucide-react"
import { copyTrip } from "@/actions/share"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { dayCountUTC, labelDateUTC } from "@/lib/dates"
import { requireUser } from "@/lib/guard"
import { formatMoney } from "@/lib/serialize"
import { getPublicTrips } from "@/lib/trip-queries"

export const metadata = {
  title: "Trip Inspiration · GlobeTrotter",
  description: "Discover curated travel itineraries shared by the GlobeTrotter community.",
}

export default async function InspirationPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireUser()
  const { q } = await searchParams

  const publicTrips = await getPublicTrips({ q, take: 30 })

  return (
    <div className="flex flex-col gap-8">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Community Itineraries</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Explore shared travel routes and schedules curated by travelers worldwide. Clone any itinerary to your account to customize and make it yours.
          </p>
        </div>

        <Link href="/trips/new" className={buttonVariants({ size: "sm" })}>
          Plan your own trip
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <form method="GET" className="flex items-center gap-2 max-w-md">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by city, country, or keyword..."
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" variant="secondary">
          Search
        </Button>
        {q && (
          <Link
            href="/inspiration"
            className="text-xs text-muted-foreground hover:underline ml-1"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Grid of Public Trips */}
      {publicTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-base font-semibold">No public itineraries found</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {q
              ? `No shared trips match "${q}". Try searching for popular destinations like Tokyo, Paris, Rome, or Bali.`
              : "No community itineraries are currently shared. Make one of your trips public to inspire others!"}
          </p>
          {q && (
            <Link href="/inspiration" className={buttonVariants({ size: "sm", variant: "outline" })}>
              View all itineraries
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publicTrips.map((trip) => {
            const days = dayCountUTC(trip.startDate, trip.endDate)
            const isOwner = trip.authorId === user.id

            return (
              <div
                key={trip.id}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
              >
                {/* Trip Card Cover */}
                <div className="relative h-44 w-full overflow-hidden bg-muted">
                  {trip.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trip.coverUrl}
                      alt={trip.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground">
                      <Globe className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <span className="rounded-full bg-background/85 backdrop-blur px-2.5 py-0.5 text-xs font-medium text-foreground">
                      by {trip.author}
                    </span>
                    <span className="rounded-full bg-primary/90 backdrop-blur px-2 py-0.5 text-[11px] font-semibold text-white">
                      {days} {days === 1 ? "day" : "days"}
                    </span>
                  </div>
                </div>

                {/* Trip Card Body */}
                <div className="flex flex-1 flex-col justify-between p-4 gap-4">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                      {trip.name}
                    </h2>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {labelDateUTC(trip.startDate)} — {labelDateUTC(trip.endDate)}
                      </span>
                    </div>

                    {trip.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {trip.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="line-clamp-1">
                        {trip.cities.length > 0
                          ? trip.cities.join(" → ")
                          : "No stops added"}
                      </span>
                    </div>
                  </div>

                  {/* Trip Card Footer / Stats & CTA */}
                  <div className="flex flex-col gap-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {trip.activityCount} activities
                      </span>
                      <span className="font-semibold tabular-nums text-foreground">
                        ~{formatMoney(trip.total, trip.currency)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/t/${trip.shareSlug}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "gap-1 text-xs",
                        })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Link>

                      {isOwner ? (
                        <Link
                          href={`/trips/${trip.id}`}
                          className={buttonVariants({
                            variant: "secondary",
                            size: "sm",
                            className: "gap-1 text-xs",
                          })}
                        >
                          My Trip
                        </Link>
                      ) : (
                        <form
                          action={async () => {
                            "use server"
                            await copyTrip({ sourceId: trip.id })
                          }}
                        >
                          <Button
                            type="submit"
                            size="sm"
                            className="w-full gap-1 text-xs"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Clone
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
