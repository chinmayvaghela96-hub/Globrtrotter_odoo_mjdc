import { notFound } from "next/navigation"
import { requireTripOwner } from "@/lib/guard"
import { getTripDetail } from "@/lib/trip-queries"
import { ItineraryView } from "@/components/trip/itinerary-view"

export const metadata = { title: "Itinerary · GlobeTrotter" }

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireTripOwner(id)

  const trip = await getTripDetail(id)
  if (!trip) notFound()

  return <ItineraryView trip={trip} />
}
