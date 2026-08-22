"use client"

import { useActionState, useTransition } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { moveStop, removeStop, updateStopCosts } from "@/actions/stop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { labelDateUTC, parseDateUTC } from "@/lib/dates"
import type { ActionResult } from "@/lib/result"
import { formatMoney } from "@/lib/serialize"
import type { TripDetailStop } from "@/lib/trip-queries"

type Props = {
  stops: TripDetailStop[]
  currency: string
}

export function SortableStopList({ stops, currency }: Props) {
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const toIndex = stops.findIndex((s) => s.id === over.id)
    if (toIndex === -1) return

    startTransition(async () => {
      const result = await moveStop({ stopId: String(active.id), toIndex })
      if (!result.ok) toast.error(result.error)
    })
  }

  if (stops.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        No cities yet. Add the first one below.
      </p>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-3" role="list">
          {stops.map((stop, index) => (
            <SortableStopRow
              key={stop.id}
              stop={stop}
              index={index}
              lastIndex={stops.length - 1}
              currency={currency}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

type StopRowProps = {
  stop: TripDetailStop
  index: number
  lastIndex: number
  currency: string
}

function SortableStopRow({ stop, index, lastIndex, currency }: StopRowProps) {
  const [pending, startTransition] = useTransition()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  }

  const run = (fn: () => Promise<ActionResult<unknown>>, success: string) =>
    startTransition(async () => {
      const result = await fn()
      if (result.ok) toast.success(success)
      else toast.error(result.error)
    })

  const activityTotal = stop.activities.reduce((sum, a) => sum + a.cost, 0)

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs transition-shadow data-[dragging]:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            type="button"
            aria-label={`Drag to reorder ${stop.city.name}`}
            className="mt-1 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          >
            ⠿
          </button>

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
        </div>

        {/* Arrow buttons as keyboard fallback */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Move ${stop.city.name} earlier`}
            disabled={pending || index === 0}
            onClick={() => run(() => moveStop({ stopId: stop.id, toIndex: index - 1 }), `${stop.city.name} moved earlier`)}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Move ${stop.city.name} later`}
            disabled={pending || index === lastIndex}
            onClick={() => run(() => moveStop({ stopId: stop.id, toIndex: index + 1 }), `${stop.city.name} moved later`)}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${stop.city.name}? Its ${stop.activities.length} scheduled ${stop.activities.length === 1 ? "activity goes" : "activities go"} with it.`)) return
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

type FormState = { result: ActionResult<unknown>; values: Record<string, string> } | null

function StopCostForm({ stop, currency }: { stop: TripDetailStop; currency: string }) {
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
    <form action={formAction} className="flex flex-wrap items-end gap-3 border-t pt-3">
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
