"use client"

import { useActionState, useTransition } from "react"
import { toast } from "sonner"
import { addStop, moveStop, removeStop, updateStopCosts } from "@/actions/stop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { labelDateUTC, parseDateUTC } from "@/lib/dates"
import type { ActionResult } from "@/lib/result"
import { formatMoney } from "@/lib/serialize"
import type { TripDetail, TripDetailStop } from "@/lib/trip-queries"

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
            {trip.stops.length} of {trip.stopCount} in order
          </span>
        </div>

        {trip.stops.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            No cities yet. Add the first one below.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {trip.stops.map((stop, index) => (
              <StopRow
                key={stop.id}
                stop={stop}
                index={index}
                lastIndex={trip.stops.length - 1}
                currency={trip.currency}
              />
            ))}
          </ol>
        )}
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

function StopRow({
  stop,
  index,
  lastIndex,
  currency,
}: {
  stop: TripDetailStop
  index: number
  lastIndex: number
  currency: string
}) {
  const [pending, startTransition] = useTransition()

  /** Every mutation returns a result; nothing here throws at the user. */
  const run = (
    fn: () => Promise<ActionResult<unknown>>,
    success: string,
  ) =>
    startTransition(async () => {
      const result = await fn()
      if (result.ok) toast.success(success)
      else toast.error(result.error)
    })

  const activityTotal = stop.activities.reduce((sum, a) => sum + a.cost, 0)

  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex flex-col">
            <span className="font-medium leading-tight">
              {stop.city.name}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {stop.city.country}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              {labelDateUTC(parseDateUTC(stop.arrivalDate))} —{" "}
              {labelDateUTC(parseDateUTC(stop.departureDate))}
              {stop.activities.length > 0 && (
                <>
                  {" · "}
                  {stop.activities.length}{" "}
                  {stop.activities.length === 1 ? "activity" : "activities"} ·{" "}
                  {formatMoney(activityTotal, currency)}
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Move ${stop.city.name} earlier`}
            disabled={pending || index === 0}
            onClick={() =>
              run(
                () => moveStop({ stopId: stop.id, toIndex: index - 1 }),
                `${stop.city.name} moved earlier`,
              )
            }
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Move ${stop.city.name} later`}
            disabled={pending || index === lastIndex}
            onClick={() =>
              run(
                () => moveStop({ stopId: stop.id, toIndex: index + 1 }),
                `${stop.city.name} moved later`,
              )
            }
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  `Remove ${stop.city.name}? Its ${stop.activities.length} scheduled ${
                    stop.activities.length === 1 ? "activity goes" : "activities go"
                  } with it.`,
                )
              ) {
                return
              }
              run(() => removeStop({ stopId: stop.id }), `${stop.city.name} removed`)
            }}
          >
            Remove
          </Button>
        </div>
      </div>

      <StopCostForm stop={stop} currency={currency} />
    </li>
  )
}

function StopCostForm({
  stop,
  currency,
}: {
  stop: TripDetailStop
  currency: string
}) {
  const [state, formAction, saving] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      const result = await updateStopCosts(values)
      if (result.ok) toast.success("Costs saved")
      else toast.error(result.error)
      return { result, values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 border-t pt-3"
    >
      <input type="hidden" name="stopId" value={stop.id} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`transport-${stop.id}`} className="text-xs">
          Transport ({currency})
        </Label>
        <Input
          id={`transport-${stop.id}`}
          name="transportCost"
          type="number"
          min="0"
          step="100"
          inputMode="numeric"
          className="w-32"
          defaultValue={stop.transportCost}
          aria-invalid={Boolean(failed?.fields?.transportCost)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`stay-${stop.id}`} className="text-xs">
          Stay ({currency})
        </Label>
        <Input
          id={`stay-${stop.id}`}
          name="stayCost"
          type="number"
          min="0"
          step="100"
          inputMode="numeric"
          className="w-32"
          defaultValue={stop.stayCost}
          aria-invalid={Boolean(failed?.fields?.stayCost)}
        />
      </div>

      <Button type="submit" variant="outline" size="sm" disabled={saving}>
        {saving ? "Saving..." : "Save costs"}
      </Button>

      {failed && (
        <p className="text-sm text-destructive">
          {failed.fields?.transportCost ?? failed.fields?.stayCost ?? failed.error}
        </p>
      )}
    </form>
  )
}
