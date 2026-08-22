"use client"

import { useActionState, useId, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { addActivityToStop } from "@/actions/catalogue"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { labelDateUTC, parseDateUTC } from "@/lib/dates"
import type { ActionResult } from "@/lib/result"

/** One stop the signed-in user owns. Dates arrive as plain "YYYY-MM-DD". */
export type StopOption = {
  id: string
  tripId: string
  tripName: string
  cityId: string
  cityName: string
  from: string
  to: string
}

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

const SELECT =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"

const stopWindow = (stop: StopOption) =>
  `${labelDateUTC(parseDateUTC(stop.from))} — ${labelDateUTC(parseDateUTC(stop.to))}`

export function AddToStopForm({
  activityId,
  activityCityId,
  activityCityName,
  stops,
}: {
  activityId: string
  activityCityId: string
  activityCityName: string
  stops: StopOption[]
}) {
  const fieldId = useId()
  const [open, setOpen] = useState(false)

  // Prefer a stop in the activity's city, because that is the only one the
  // server will accept. Falling back to the first stop keeps the date bounds
  // populated; the mismatch is called out below rather than hidden.
  const [stopId, setStopId] = useState(
    () => stops.find((stop) => stop.cityId === activityCityId)?.id ?? stops[0]?.id ?? "",
  )

  const [state, formAction, adding] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      const result = await addActivityToStop(values)

      if (result.ok) {
        const stop = stops.find((option) => option.id === values.stopId)
        toast.success(stop ? `Added to ${stop.tripName}` : "Added to your trip")
        setOpen(false)
      }

      return { result, values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null
  const error = (name: string) => failed?.fields?.[name]

  if (stops.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>No stops yet.</span>
        <Link
          href="/trips"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Plan a trip
        </Link>
      </div>
    )
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Add to a stop
      </Button>
    )
  }

  const selected = stops.find((stop) => stop.id === stopId)
  const mismatched = selected !== undefined && selected.cityId !== activityCityId
  const tripIds = [...new Set(stops.map((stop) => stop.tripId))]

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t pt-3">
      <input type="hidden" name="activityId" value={activityId} />

      {failed && !failed.fields && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {failed.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${fieldId}-stop`} className="text-xs">
          Stop
        </Label>
        <select
          id={`${fieldId}-stop`}
          name="stopId"
          value={stopId}
          onChange={(event) => setStopId(event.currentTarget.value)}
          aria-invalid={Boolean(error("stopId") || error("activityId"))}
          className={SELECT}
        >
          {tripIds.map((tripId) => (
            <optgroup
              key={tripId}
              label={stops.find((stop) => stop.tripId === tripId)?.tripName ?? "Trip"}
            >
              {stops
                .filter((stop) => stop.tripId === tripId)
                .map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {stop.cityName} · {stopWindow(stop)}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {(error("stopId") || error("activityId")) && (
          <p className="text-sm text-destructive">
            {error("activityId") ?? error("stopId")}
          </p>
        )}
        {mismatched && !error("activityId") && (
          <p className="text-xs text-muted-foreground">
            This activity is in {activityCityName}. Only a {activityCityName}{" "}
            stop can take it.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-date`} className="text-xs">
            Date
          </Label>
          <Input
            // Remount on a stop change so the default snaps into the new
            // stop's window instead of keeping the old stop's arrival date.
            key={stopId}
            id={`${fieldId}-date`}
            name="scheduledDate"
            type="date"
            min={selected?.from}
            max={selected?.to}
            defaultValue={selected?.from}
            aria-invalid={Boolean(error("scheduledDate"))}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-time`} className="text-xs">
            Start time
          </Label>
          <Input
            id={`${fieldId}-time`}
            name="startTime"
            type="time"
            aria-invalid={Boolean(error("startTime"))}
          />
        </div>
      </div>

      {error("scheduledDate") && (
        <p className="text-sm text-destructive">{error("scheduledDate")}</p>
      )}
      {error("startTime") && (
        <p className="text-sm text-destructive">{error("startTime")}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={adding}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
