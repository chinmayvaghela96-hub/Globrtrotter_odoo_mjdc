"use client"

/**
 * Analyses a day's activities and surfaces:
 *   - Time conflicts (two activities overlap)
 *   - Inefficient ordering (a later start-time appears before an earlier one)
 *   - Long idle gaps (> 3 hours between consecutive activities)
 *
 * Pure client component — no server calls. Re-runs on every render with fresh
 * props so the hints update immediately after a drag.
 */

export type HintActivity = {
  id: string
  name: string
  startTime: string | null // "HH:MM" or null
  durationMin: number
}

type Hint = {
  type: "conflict" | "order" | "gap"
  message: string
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function deriveHints(activities: HintActivity[]): Hint[] {
  const timed = activities
    .filter((a) => a.startTime != null)
    .map((a) => ({
      ...a,
      start: toMinutes(a.startTime!),
      end: toMinutes(a.startTime!) + a.durationMin,
    }))
    .sort((x, y) => x.start - y.start)

  const hints: Hint[] = []

  // Check for overlaps
  for (let i = 0; i < timed.length - 1; i++) {
    const cur = timed[i]
    const next = timed[i + 1]
    if (cur.end > next.start) {
      hints.push({
        type: "conflict",
        message: `"${cur.name}" and "${next.name}" overlap by ${cur.end - next.start} min.`,
      })
    } else if (next.start - cur.end > 180) {
      // Gap > 3 hours
      const gapH = Math.round((next.start - cur.end) / 60)
      hints.push({
        type: "gap",
        message: `${gapH}h gap between "${cur.name}" and "${next.name}".`,
      })
    }
  }

  // Check ordering vs the list (no start time → can't judge order)
  const unsorted = activities.filter((a) => a.startTime != null)
  for (let i = 0; i < unsorted.length - 1; i++) {
    const cur = toMinutes(unsorted[i].startTime!)
    const next = toMinutes(unsorted[i + 1].startTime!)
    if (next < cur) {
      hints.push({
        type: "order",
        message: `"${unsorted[i + 1].name}" starts earlier than "${unsorted[i].name}". Consider reordering.`,
      })
      break // one order hint is enough
    }
  }

  return hints
}

export function ScheduleHints({ activities }: { activities: HintActivity[] }) {
  const hints = deriveHints(activities)
  if (hints.length === 0) return null

  return (
    <ul className="flex flex-col gap-1.5" role="list" aria-label="Schedule hints">
      {hints.map((hint, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
            hint.type === "conflict"
              ? "border border-destructive/30 bg-destructive/10 text-destructive"
              : hint.type === "gap"
                ? "border border-amber-300/40 bg-amber-50/60 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                : "border border-blue-300/40 bg-blue-50/60 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
          }`}
        >
          <span aria-hidden="true">
            {hint.type === "conflict" ? "⚠" : hint.type === "gap" ? "⏱" : "↕"}
          </span>
          {hint.message}
        </li>
      ))}
    </ul>
  )
}
