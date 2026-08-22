import { notFound } from "next/navigation"
import { TripBuilder } from "@/components/trip/trip-builder"
import { requireTripOwner } from "@/lib/guard"
import { getCityOptions, getTripDetail } from "@/lib/trip-queries"

export const metadata = { title: "Build itinerary · GlobeTrotter" }

export default async function BuildPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireTripOwner(id)

  const [trip, cities] = await Promise.all([getTripDetail(id), getCityOptions()])
  if (!trip) notFound()

  return <TripBuilder trip={trip} cities={cities} />
}
