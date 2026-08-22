import Link from "next/link"
import { notFound } from "next/navigation"
import { CityMap, type CityMarker } from "@/components/map/city-map"
import { SaveCityButton } from "@/components/catalogue/save-city-button"
import { buttonVariants } from "@/components/ui/button"
import {
  getCityById,
  getNearbyCities,
  getSavedCityIds,
} from "@/lib/catalogue-queries"
import { formatDistance } from "@/lib/geo"
import { requireUser } from "@/lib/guard"
import { getMapProvider } from "@/lib/map-provider"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const city = await getCityById(id)
  return { title: city ? `${city.name}, ${city.country}` : "City" }
}

export default async function CityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()

  const city = await getCityById(id)
  if (!city) notFound()

  const [nearby, savedIds] = await Promise.all([
    getNearbyCities(city, { limit: 6 }),
    getSavedCityIds(user.id),
  ])

  // Whether a vendor is configured is decided on the server; the component
  // only needs to know which of its two rendering paths to take.
  const provider = getMapProvider()

  const markers: CityMarker[] = [
    {
      id: city.id,
      label: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      primary: true,
    },
    ...nearby.map((entry) => ({
      id: entry.item.id,
      label: entry.item.name,
      latitude: entry.item.latitude,
      longitude: entry.item.longitude,
    })),
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/cities"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          ← All cities
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {city.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {city.country} · {city.region} · {city.latitude.toFixed(2)},{" "}
              {city.longitude.toFixed(2)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SaveCityButton
              cityId={city.id}
              cityName={city.name}
              initialSaved={savedIds.has(city.id)}
            />
            <Link
              href={`/activities?cityId=${city.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              {city._count.activities} things to do
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cost index" value={`${city.costIndex}/100`} hint="Daily-spend proxy" />
        <Stat label="Popularity" value={`${city.popularity}/100`} hint="Across the catalogue" />
        <Stat
          label="Nearest city"
          value={nearby[0] ? nearby[0].item.name : "—"}
          hint={nearby[0] ? formatDistance(nearby[0].distanceKm) : "Nothing else loaded"}
        />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          Where it is
        </h2>
        <CityMap
          markers={markers}
          providerConfigured={provider !== null}
          attribution={provider?.attribution}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Nearby cities
          </h2>
          <span className="text-sm text-muted-foreground">
            Straight-line distance from {city.name}
          </span>
        </div>

        {nearby.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Nothing else in the catalogue to compare against yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((entry) => (
              <li key={entry.item.id}>
                <Link
                  href={`/cities/${entry.item.id}`}
                  className="flex h-full items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/25"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.item.imageUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium leading-tight">
                      {entry.item.name}
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {entry.item.country}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatDistance(entry.distanceKm)} {entry.compass}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}
