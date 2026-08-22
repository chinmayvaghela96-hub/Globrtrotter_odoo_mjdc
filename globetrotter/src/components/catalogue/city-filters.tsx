"use client"

import { type ChangeEvent, type FormEvent, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CITY_SORTS, type CitySort } from "@/lib/catalogue-queries"

const SORT_LABELS: Record<CitySort, string> = {
  popularity: "Most popular",
  name: "Name, A to Z",
  costLow: "Cost, low to high",
  costHigh: "Cost, high to low",
}

/** Coarse bands, not a slider: the cost index is a rough daily-spend proxy. */
const COST_CAPS = [
  { value: "", label: "Any cost" },
  { value: "40", label: "40 or less" },
  { value: "60", label: "60 or less" },
  { value: "80", label: "80 or less" },
]

const FIELD =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export type CityFilterValues = {
  q: string
  region: string
  country: string
  maxCost: string
  sort: CitySort
}

export function CityFilters({
  regions,
  countries,
  values,
}: {
  regions: string[]
  countries: string[]
  values: CityFilterValues
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const hasFilters = Boolean(
    values.q || values.region || values.country || values.maxCost,
  )

  /**
   * The filters are URL state, not component state. That makes a result set
   * linkable, reloadable, and correct under the back button — the server
   * component re-runs the query from the params it is handed. The fields are
   * uncontrolled and read out of FormData here; the parent remounts this form
   * whenever the URL changes, so the inputs always reflect the current query.
   */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const read = (name: string) => String(data.get(name) ?? "").trim()

    const params = new URLSearchParams()
    const q = read("q")
    const region = read("region")
    const maxCost = read("maxCost")
    const sort = read("sort")
    // Changing region renarrows the country list, so a country from the old
    // region would return nothing. Drop it rather than show an empty result.
    const country = region !== values.region ? "" : read("country")

    if (q) params.set("q", q)
    if (region) params.set("region", region)
    if (country) params.set("country", country)
    if (maxCost) params.set("maxCost", maxCost)
    if (sort && sort !== "popularity") params.set("sort", sort) // the default stays out of the URL

    const query = params.toString()
    startTransition(() => router.push(query ? `/cities?${query}` : "/cities"))
  }

  // Picking from a dropdown is a decision, so apply it straight away. Typing
  // is a draft, so the text box waits for submit rather than navigating on
  // every keystroke.
  const applyNow = (event: ChangeEvent<HTMLSelectElement>) =>
    event.currentTarget.form?.requestSubmit()

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="city-q">Search</Label>
          <Input
            id="city-q"
            name="q"
            type="search"
            placeholder="City or country"
            defaultValue={values.q}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city-region">Region</Label>
          <select
            id="city-region"
            name="region"
            defaultValue={values.region}
            onChange={applyNow}
            className={FIELD}
          >
            <option value="">All regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city-country">Country</Label>
          <select
            id="city-country"
            name="country"
            defaultValue={values.country}
            onChange={applyNow}
            className={FIELD}
          >
            <option value="">
              {values.region ? `All of ${values.region}` : "All countries"}
            </option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city-max-cost">Cost index</Label>
          <select
            id="city-max-cost"
            name="maxCost"
            defaultValue={values.maxCost}
            onChange={applyNow}
            className={FIELD}
          >
            {COST_CAPS.map((cap) => (
              <option key={cap.value} value={cap.value}>
                {cap.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city-sort">Sort</Label>
          <select
            id="city-sort"
            name="sort"
            defaultValue={values.sort}
            onChange={applyNow}
            className={FIELD}
          >
            {CITY_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Searching..." : "Search"}
        </Button>
        {hasFilters && (
          <Link
            href="/cities"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Clear filters
          </Link>
        )}
      </div>
    </form>
  )
}
