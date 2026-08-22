import Link from "next/link"
import { getInspirationTrips } from "@/lib/trip-queries"
import { formatMoney } from "@/lib/serialize"
import { buttonVariants } from "@/components/ui/button"

export const metadata = { title: "Travel Inspiration · GlobeTrotter" }

export default async function InspirationPage() {
  const curatedTrips = await getInspirationTrips()

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
            Curated Itineraries
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Travel Inspiration</h1>
        <p className="max-w-2xl text-muted-foreground">
          Handcrafted classic journeys around the globe. Explore verified schedules,
          landmark activities, and cost breakdowns — or clone them directly into your trips.
        </p>
      </section>

      {/* Grid of Curated Inspiration Itineraries */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {curatedTrips.map((itinerary) => (
          <article
            key={itinerary.id}
            className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all hover:border-foreground/30 hover:shadow-md"
          >
            {/* Cover photo with gradient overlay */}
            <div className="relative h-48 w-full overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itinerary.coverUrl || "/hero.jpg"}
                alt={itinerary.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div className="flex flex-col text-white">
                  <span className="text-xs font-medium uppercase tracking-wider text-white/80">
                    {itinerary.stopCount} {itinerary.stopCount === 1 ? "City" : "Cities"}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-xs">
                    {itinerary.name}
                  </h2>
                </div>
              </div>
            </div>

            {/* Itinerary info & city route */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
              <div className="flex flex-col gap-2.5">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {itinerary.description}
                </p>

                {/* Cities breadcrumb route */}
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <span className="text-primary">✈</span>
                  <span className="truncate">{itinerary.cities.join(" → ")}</span>
                </div>
              </div>

              {/* Bottom footer with budget estimate & action */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Est. Budget
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatMoney(itinerary.estimatedSpend, itinerary.currency)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/t/${itinerary.shareSlug}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    View Plan
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
