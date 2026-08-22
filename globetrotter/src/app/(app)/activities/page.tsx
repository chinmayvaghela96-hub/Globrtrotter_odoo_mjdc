import Link from "next/link"
import { ActivityCategory } from "@prisma/client"
import {
  ActivityFilters,
  type ActivityCityOption,
} from "@/components/catalogue/activity-filters"
import {
  AddToStopForm,
  type StopOption,
} from "@/components/catalogue/add-to-stop-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  type ActivityResult,
  getAddableStops,
  searchActivities,
  searchCities,
} from "@/lib/catalogue-queries"
import { formatDateUTC } from "@/lib/dates"
import { requireUser } from "@/lib/guard"
import { formatMoney } from "@/lib/serialize"

export const metadata = { title: "Activities · GlobeTrotter" }

const CATEGORIES = Object.values(ActivityCategory)

/** Mirrors the `take: 120` in `searchActivities`. */
const RESULT_CAP = 120

type SearchParams = Record<string, string | string[] | undefined>

/** `?q=a&q=b` is legal in a URL. Take the first value; blank means absent. */
function first(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

function parseCategory(value: string | undefined) {
  return CATEGORIES.find((category) => category === value)
}

/** Zero is a real cap here — "free only" — so it survives, unlike a blank. */
function parseMaxCost(value: string | undefined) {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return Math.min(Math.round(parsed), 100_000)
}

function parseMaxDuration(value: string | undefined) {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.min(Math.round(parsed), 1440) // a day is the ceiling everywhere else
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/** SIGHTSEEING -> Sightseeing. Every category is one word. */
const categoryLabel = (category: string) =>
  category.charAt(0) + category.slice(1).toLowerCase()

function resultSummary(count: number, filtered: boolean, capped: boolean) {
  const noun = count === 1 ? "activity" : "activities"
  // Never claim a total the query did not actually count.
  if (capped) return `Showing the first ${count} ${noun}.`
  if (!filtered) return `${count} ${noun} in the catalogue.`
  return `${count} ${noun} ${count === 1 ? "matches" : "match"} your filters.`
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await requireUser()
  const sp = await searchParams

  const q = first(sp.q)
  const cityId = first(sp.cityId)
  const category = parseCategory(first(sp.category))
  const maxCost = parseMaxCost(first(sp.maxCost))
  const maxDuration = parseMaxDuration(first(sp.maxDuration))

  const [activities, cities, stops] = await Promise.all([
    searchActivities({ q, cityId, category, maxCost, maxDuration }),
    searchCities({ sort: "name" }),
    getAddableStops(user.id),
  ])

  const filtered = Boolean(
    q || cityId || category || maxCost !== undefined || maxDuration !== undefined,
  )
  const capped = activities.length === RESULT_CAP
  const selectedCity = cityId ? cities.find((city) => city.id === cityId) : undefined

  const cityOptions: ActivityCityOption[] = cities.map((city) => ({
    id: city.id,
    name: city.name,
    country: city.country,
    region: city.region,
  }))

  // Dates cross into a client component, so they leave as plain "YYYY-MM-DD".
  const stopOptions: StopOption[] = stops.map((stop) => ({
    id: stop.id,
    tripId: stop.trip.id,
    tripName: stop.trip.name,
    cityId: stop.city.id,
    cityName: stop.city.name,
    from: formatDateUTC(stop.arrivalDate),
    to: formatDateUTC(stop.departureDate),
  }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Activities</h1>
        <p className="text-sm text-muted-foreground">
          {selectedCity && `${selectedCity.name}, ${selectedCity.country} · `}
          {resultSummary(activities.length, filtered, capped)}
        </p>
      </div>

      <ActivityFilters
        // Keyed on the query so the form remounts when the URL changes: the
        // fields then match the params even when the move came from the back
        // button rather than from the form itself.
        key={`${q ?? ""}|${cityId ?? ""}|${category ?? ""}|${maxCost ?? ""}|${maxDuration ?? ""}`}
        cities={cityOptions}
        values={{
          q: q ?? "",
          cityId: cityId ?? "",
          category: category ?? "",
          maxCost: maxCost === undefined ? "" : String(maxCost),
          maxDuration: maxDuration === undefined ? "" : String(maxDuration),
        }}
      />

      {stopOptions.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6">
          <h2 className="font-medium">Nowhere to add these yet</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            An activity attaches to a stop — a city with dates, inside one of
            your trips. Create a trip and add at least one city, then come back
            and schedule these.
          </p>
          <Link href="/trips" className={buttonVariants({ size: "sm" })}>
            Go to my trips
          </Link>
        </div>
      )}

      {capped && (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          The list stops at {RESULT_CAP} results, so there are more matches than
          these. Narrow it by city, type, cost, or duration to see the rest.
        </p>
      )}

      {activities.length === 0 ? (
        <EmptyState filtered={filtered} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              currency={user.currency}
              stops={stopOptions}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function ActivityCard({
  activity,
  currency,
  stops,
}: {
  activity: ActivityResult
  currency: string
  stops: StopOption[]
}) {
  return (
    <li className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      {activity.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activity.imageUrl}
          alt=""
          className="h-32 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          No image
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="font-medium leading-tight">{activity.name}</h2>
            <span className="text-sm text-muted-foreground">
              {activity.city.name}, {activity.city.country}
            </span>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {categoryLabel(activity.category)}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{activity.description}</p>

        <dl className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
          <Meta
            label="Cost"
            value={
              activity.cost === 0 ? "Free" : formatMoney(activity.cost, currency)
            }
          />
          <Meta label="Duration" value={duration(activity.durationMin)} />
        </dl>

        <div className="mt-auto pt-1">
          <AddToStopForm
            activityId={activity.id}
            activityCityId={activity.city.id}
            activityCityName={activity.city.name}
            stops={stops}
          />
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
          No activities have been loaded yet. Run the database seed and reload
          this page.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
      <h2 className="font-medium">No activities match those filters</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Nothing in the catalogue fits every filter at once. Try a shorter
        search, a different type, a higher cost limit, or a longer duration.
      </p>
      <Link href="/activities" className={buttonVariants({ size: "sm" })}>
        Clear filters
      </Link>
    </div>
  )
}
