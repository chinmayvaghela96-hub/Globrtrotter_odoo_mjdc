"use client"

import { useState, useTransition } from "react"
import { createTripFromTemplate, TEMPLATES } from "@/actions/template"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDateUTC, addDaysUTC } from "@/lib/dates"

/**
 * A collapsible template gallery on the Create Trip page.
 * Selecting a template pre-fills the start date and fires the creation action.
 */
export function TripTemplates() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    const base = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    )
    return formatDateUTC(addDaysUTC(base, 14))
  })
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function create() {
    if (!selected) return
    setError(null)
    startTransition(async () => {
      const result = await createTripFromTemplate({ templateId: selected, startDate })
      if (!result.ok) setError(result.error ?? "Something went wrong.")
      // On success, the action redirects — no extra handling needed here.
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <button
        type="button"
        className="flex items-center justify-between text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold tracking-tight">Start from a template</span>
          <span className="text-sm text-muted-foreground">
            Pick a ready-made itinerary skeleton and customise from there.
          </span>
        </div>
        <span
          className="text-muted-foreground transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t pt-4">
          {/* Template grid */}
          <div
            role="radiogroup"
            aria-label="Trip templates"
            className="grid gap-3 sm:grid-cols-2"
          >
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected === t.id}
                onClick={() => setSelected(t.id)}
                className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected === t.id
                    ? "border-ring bg-accent"
                    : "hover:border-ring/40 hover:bg-accent/50"
                }`}
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="font-medium text-sm leading-tight">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.description}</span>
                <span className="text-xs text-muted-foreground/70">
                  {t.durationDays} days · {t.cities.length} cities
                </span>
              </button>
            ))}
          </div>

          {/* Start date + create button */}
          {selected && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="template-start" className="text-sm">
                  Start date
                </Label>
                <Input
                  id="template-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <Button
                type="button"
                onClick={create}
                disabled={pending}
                className="self-end"
              >
                {pending ? "Creating…" : "Create from template"}
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
