"use client"

import { type ChangeEvent, type FormEvent, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ActivityCategory } from "@prisma/client"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Written out rather than derived from the Prisma enum: a Server Component
 * that imports a value from a `"use client"` module receives a client
 * reference, not the array. The annotation still fails the build on a typo.
 */
const CATEGORIES: readonly ActivityCategory[] = [
  "SIGHTSEEING",
  "FOOD",
  "ADVENTURE",
  "CULTURE",
  "NIGHTLIFE",
  "NATURE",
  "SHOPPING",
  "RELAXATION",
]

/** SIGHTSEEING -> Sightseeing. Every category is one word. */
const categoryLabel = (category: string) =>
  category.charAt(0) + category.slice(1).toLowerCase()

/** Bands, not a slider: catalogue prices cluster rather than spread evenly. */
const COST_CAPS = [
  { value: "", label: "Any cost" },
  { value: "0", label: "Free only" },
  { value: "100", label: "100 or less" },
  { value: "250", label: "250 or less" },
  { value: "500", label: "500 or less" },
]

const DURATION_CAPS = [
  { value: "", label: "Any length" },
  { value: "90", label: "90 minutes or less" },
  { value: "120", label: "2 hours or less" },
  { value: "180", label: "3 hours or less" },
  { value: "240", label: "4 hours or less" },
]

const FIELD =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export type ActivityCityOption = {
  id: string
  name: string
  country: string
  region: string
}

export type ActivityFilterValues = {
  q: string
  cityId: string
  category: string
  maxCost: string
  maxDuration: string
}

export function ActivityFilters({
  cities,
  values,
}: {
  cities: ActivityCityOption[]
  values: ActivityFilterValues
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const regions = [...new Set(cities.map((city) => city.region))].sort()

  const hasFilters = Boolean(
    values.q ||
      values.cityId ||
      values.category ||
      values.maxCost ||
      values.maxDuration,
  )

  /**
   * The filters are URL state, not component state — same contract as the
   * city search. A result set stays linkable, reloadable, and correct under
   * the back button, because the server component re-runs the query from the
   * params it is handed. The fields are uncontrolled and read out of FormData
   * here; the parent remounts this form whenever the URL changes, so the
   * inputs always reflect the current query.
   */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const read = (name: string) => String(data.get(name) ?? "").trim()

    const params = new URLSearchParams()
    const q = read("q")
    const cityId = read("cityId")
    const category = read("category")
    // "0" is a real cap here — free activities only — so it stays in the URL.
    const maxCost = read("maxCost")
    const maxDuration = read("maxDuration")

    if (q) params.set("q", q)
    if (cityId) params.set("cityId", cityId)
    if (category) params.set("category", category)
    if (maxCost) params.set("maxCost", maxCost)
    if (maxDuration) params.set("maxDuration", maxDuration)

    const query = params.toString()
    startTransition(() =>
      router.push(query ? `/activities?${query}` : "/activities"),
    )
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
          <Label htmlFor="activity-q">Search</Label>
          <Input
            id="activity-q"
            name="q"
            type="search"
            placeholder="Name or description"
            defaultValue={values.q}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activity-city">City</Label>
          <select
            id="activity-city"
            name="cityId"
            defaultValue={values.cityId}
            onChange={applyNow}
            className={FIELD}
          >
            <option value="">All cities</option>
            {regions.map((region) => (
              <optgroup key={region} label={region}>
                {cities
                  .filter((city) => city.region === region)
                  .map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}, {city.country}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activity-category">Type</Label>
          <select
            id="activity-category"
            name="category"
            defaultValue={values.category}
            onChange={applyNow}
            className={FIELD}
          >
            <option value="">All types</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activity-max-cost">Cost</Label>
          <select
            id="activity-max-cost"
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
          <Label htmlFor="activity-max-duration">Duration</Label>
          <select
            id="activity-max-duration"
            name="maxDuration"
            defaultValue={values.maxDuration}
            onChange={applyNow}
            className={FIELD}
          >
            {DURATION_CAPS.map((cap) => (
              <option key={cap.value} value={cap.value}>
                {cap.label}
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
            href="/activities"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Clear filters
          </Link>
        )}
      </div>
    </form>
  )
}
