"use client"

import { useTransition } from "react"
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
import { moveTripActivity, removeTripActivity } from "@/actions/catalogue"
import { formatMoney } from "@/lib/serialize"
import { ScheduleHints } from "./schedule-hints"

type Activity = {
  id: string
  name: string
  startTime: string | null
  durationMin: number
  cost: number
  category: string | null
}

function duration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function SortableActivityList({
  activities,
  currency,
}: {
  activities: Activity[]
  currency: string
}) {
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = activities.findIndex((a) => a.id === active.id)
    const toIndex = activities.findIndex((a) => a.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    startTransition(async () => {
      const result = await moveTripActivity({
        tripActivityId: String(active.id),
        toIndex,
      })
      if (!result.ok) toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <ScheduleHints activities={activities} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2" role="list">
            {activities.map((activity) => (
              <SortableActivityItem
                key={activity.id}
                activity={activity}
                currency={currency}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableActivityItem({
  activity,
  currency,
}: {
  activity: Activity
  currency: string
}) {
  const [, startTransition] = useTransition()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  }

  function remove() {
    if (!confirm(`Remove "${activity.name}"?`)) return
    startTransition(async () => {
      const result = await removeTripActivity({ tripActivityId: activity.id })
      if (!result.ok) toast.error(result.error)
      else toast.success("Activity removed")
    })
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border bg-card px-3 py-2 shadow-xs transition-shadow data-[dragging]:shadow-md"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label={`Drag to reorder ${activity.name}`}
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        ⠿
      </button>

      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {activity.startTime ?? "--:--"}
      </span>
      <span className="min-w-0 flex-1 text-sm">{activity.name}</span>
      {activity.category && (
        <span className="text-xs text-muted-foreground capitalize">
          {activity.category.toLowerCase()}
        </span>
      )}
      <span className="text-xs text-muted-foreground">{duration(activity.durationMin)}</span>
      <span className="text-sm tabular-nums">
        {activity.cost === 0 ? "Free" : formatMoney(activity.cost, currency)}
      </span>

      <button
        type="button"
        aria-label={`Remove ${activity.name}`}
        onClick={remove}
        className="ml-auto text-xs text-muted-foreground/0 transition-opacity group-hover:text-destructive focus-visible:text-destructive"
      >
        ✕
      </button>
    </li>
  )
}
