"use client"

import { useActionState } from "react"
import { toast } from "sonner"
import { addStop } from "@/actions/stop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SortableStopList } from "@/components/trip/sortable-stop-list"
import type { ActionResult } from "@/lib/result"
import type { TripDetail } from "@/lib/trip-queries"

type CityOption = {
  id: string
  name: string
  country: string
  region: string
  costIndex: number
}

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

export function TripBuilder({
  trip,
  cities,
}: {
  trip: TripDetail
  cities: CityOption[]
}) {
  const regions = [...new Set(cities.map((city) => city.region))]

  const [state, formAction, adding] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      const result = await addStop(values)
      if (result.ok) toast.success("City added")
      return { result, values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null
  const error = (name: string) => failed?.fields?.[name]

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Stops</h2>
          <span className="text-sm text-muted-foreground">
            {trip.stops.length} {trip.stops.length === 1 ? "city" : "cities"} · drag to reorder
          </span>
        </div>

        {/* Sortable drag-and-drop stop list */}
        <SortableStopList stops={trip.stops} currency={trip.currency} />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold tracking-tight">Add a stop</h2>
          <p className="text-sm text-muted-foreground">
            Dates have to sit inside {trip.startDate} to {trip.endDate}.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="tripId" value={trip.id} />

          {failed && !failed.fields && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {failed.error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="cityId">City</Label>
            <select
              id="cityId"
              name="cityId"
              defaultValue=""
              aria-invalid={Boolean(error("cityId"))}
              className="h-9 rounded-lg border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
            >
              <option value="" disabled>
                Choose a city
              </option>
              {regions.map((region) => (
                <optgroup key={region} label={region}>
                  {cities
                    .filter((city) => city.region === region)
                    .map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}, {city.country} · cost {city.costIndex}/100
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {error("cityId") && (
              <p className="text-sm text-destructive">{error("cityId")}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="arrivalDate">Arrives</Label>
              <Input
                id="arrivalDate"
                name="arrivalDate"
                type="date"
                min={trip.startDate}
                max={trip.endDate}
                defaultValue={state?.values.arrivalDate ?? trip.startDate}
                aria-invalid={Boolean(error("arrivalDate"))}
              />
              {error("arrivalDate") && (
                <p className="text-sm text-destructive">{error("arrivalDate")}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="departureDate">Leaves</Label>
              <Input
                id="departureDate"
                name="departureDate"
                type="date"
                min={trip.startDate}
                max={trip.endDate}
                defaultValue={state?.values.departureDate ?? trip.endDate}
                aria-invalid={Boolean(error("departureDate"))}
              />
              {error("departureDate") && (
                <p className="text-sm text-destructive">{error("departureDate")}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={adding} className="self-start">
            {adding ? "Adding..." : "Add stop"}
          </Button>
        </form>
      </section>
    </div>
  )
}
