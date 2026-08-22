import Link from "next/link"
import { ShareDialog } from "@/components/share/share-dialog"
import { TripTabs } from "@/components/trip/trip-tabs"
import { ReadMore } from "@/components/trip/read-more"
import { TripGlimpse } from "@/components/trip/trip-glimpse"
import { dayCountUTC, labelDateUTC } from "@/lib/dates"
import { requireTripOwner } from "@/lib/guard"
import { getTripCityNames } from "@/lib/trip-queries"

/**
 * The ownership check for every child route lives here, once.
 *
 * `params` is a promise in Next 16, so it has to be awaited before the id is
 * readable — a silent source of `undefined` if you forget.
 */
export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { trip } = await requireTripOwner(id)

  const days = dayCountUTC(trip.startDate, trip.endDate)
  const cities = await getTripCityNames(trip.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/trips" className="text-sm text-muted-foreground hover:underline">
          ← My trips
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{trip.name}</h1>
            <p className="text-sm text-muted-foreground">
              {labelDateUTC(trip.startDate)} — {labelDateUTC(trip.endDate)} ·{" "}
              {days} {days === 1 ? "day" : "days"}
            </p>
            {cities.length > 0 && (
              <TripGlimpse cities={cities} tripName={trip.name} />
            )}
          </div>

          <div className="flex items-center gap-2">
            <ShareDialog
              tripId={trip.id}
              isPublic={trip.isPublic}
              shareSlug={trip.shareSlug}
              tripName={trip.name}
              tripDescription={trip.description}
            />
          </div>
        </div>

        {trip.description && (
          <ReadMore text={trip.description} />
        )}
      </div>

      <TripTabs tripId={trip.id} />

      {children}
    </div>
  )
}
