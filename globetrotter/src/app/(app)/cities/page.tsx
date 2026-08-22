import Link from "next/link"
import { CityFilters } from "@/components/catalogue/city-filters"
import { SaveCityButton } from "@/components/catalogue/save-city-button"
import { buttonVariants } from "@/components/ui/button"
import {
  CITY_SORTS,
  type CityResult,
  type CitySort,
  getRegions,
  getSavedCityIds,
  searchCities,
} from "@/lib/catalogue-queries"
import { requireUser } from "@/lib/guard"

export const metadata = { title: "Cities · GlobeTrotter" }

type SearchParams = Record<string, string | string[] | undefined>

/** `?q=a&q=b` is legal in a URL. Take the first value; blank means absent. */
function first(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

/** Anything that is not one of the four known sorts falls back to the default. */
function parseSort(value: string | undefined): CitySort {
  return CITY_SORTS.find((sort) => sort === value) ?? "popularity"
}

function parseMaxCost(value: string | undefined) {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.min(Math.round(parsed), 100) // the cost index tops out at 100
}

function resultSummary(count: number, filtered: boolean) {
  const noun = count === 1 ? "city" : "cities"
  if (!filtered) return `${count} ${noun} in the catalogue.`
  return `${count} ${noun} ${count === 1 ? "matches" : "match"} your filters.`
}

export default async function CitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const q = first(sp.q)
  const region = first(sp.region)
  const maxCost = parseMaxCost(first(sp.maxCost))
  const sort = parseSort(first(sp.sort))

  const [cities, regions, savedIds] = await Promise.all([
    searchCities({ q, region, maxCost, sort }),
    getRegions(),
    getSavedCityIds(user.id),
  ])

  const filtered = Boolean(q || region || maxCost)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Cities</h1>
        <p className="text-sm text-muted-foreground">
          {resultSummary(cities.length, filtered)}
        </p>
      </div>

      <CityFilters
        // Keyed on the query so the form remounts when the URL changes: the
        // fields then match the params even when the move came from the back
        // button rather than from the form itself.
        key={`${q ?? ""}|${region ?? ""}|${maxCost ?? ""}|${sort}`}
        regions={regions}
        values={{
          q: q ?? "",
          region: region ?? "",
          maxCost: maxCost === undefined ? "" : String(maxCost),
          sort,
        }}
      />

      {cities.length === 0 ? (
        <EmptyState filtered={filtered} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((city) => (
            <CityCard key={city.id} city={city} saved={savedIds.has(city.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function CityCard({ city, saved }: { city: CityResult; saved: boolean }) {
  return (
    <li className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={city.imageUrl}
        alt=""
        className="h-32 w-full object-cover"
        loading="lazy"
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="font-medium leading-tight">{city.name}</h2>
            <span className="text-sm text-muted-foreground">{city.country}</span>
          </div>
          <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
            {city.region}
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
          <Meta label="Cost" value={`${city.costIndex}/100`} />
          <Meta label="Popularity" value={`${city.popularity}/100`} />
          <Meta label="Activities" value={String(city._count.activities)} />
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <SaveCityButton
            cityId={city.id}
            cityName={city.name}
            initialSaved={saved}
          />
          <Link
            href={`/activities?cityId=${city.id}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Explore activities
          </Link>
        </div>
      </div>
    </li>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  if (!filtered) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
        <h2 className="font-medium">The catalogue is empty</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          No cities have been loaded yet. Run the database seed and reload this
          page.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
      <h2 className="font-medium">No cities match those filters</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Nothing in the catalogue fits every filter at once. Try a shorter
        search, a different region, or a higher cost limit.
      </p>
      <Link href="/cities" className={buttonVariants({ size: "sm" })}>
        Clear filters
      </Link>
    </div>
  )
}
