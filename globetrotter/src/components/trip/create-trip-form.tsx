"use client"

import { useActionState } from "react"
import { createTrip } from "@/actions/trip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult } from "@/lib/result"

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

export function CreateTripForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string
  defaultEnd: string
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      return { result: await createTrip(values), values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null
  const error = (name: string) => failed?.fields?.[name]
  const value = (name: string, fallback = "") => state?.values[name] ?? fallback

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {failed && !failed.fields && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {failed.error}
        </p>
      )}

      <Field name="name" label="Trip name" error={error("name")}>
        <Input
          id="name"
          name="name"
          placeholder="Southeast Asia Loop"
          defaultValue={value("name")}
          aria-invalid={Boolean(error("name"))}
        />
      </Field>

      <Field
        name="description"
        label="Description"
        hint="Optional"
        error={error("description")}
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What is this trip for?"
          defaultValue={value("description")}
          aria-invalid={Boolean(error("description"))}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="startDate" label="Starts" error={error("startDate")}>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={value("startDate", defaultStart)}
            aria-invalid={Boolean(error("startDate"))}
          />
        </Field>

        <Field name="endDate" label="Ends" error={error("endDate")}>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={value("endDate", defaultEnd)}
            aria-invalid={Boolean(error("endDate"))}
          />
        </Field>
      </div>

      <Field
        name="budgetCap"
        label="Total budget"
        hint="Optional — used to flag days that run over"
        error={error("budgetCap")}
      >
        <Input
          id="budgetCap"
          name="budgetCap"
          type="number"
          min="0"
          step="100"
          inputMode="numeric"
          placeholder="60000"
          defaultValue={value("budgetCap")}
          aria-invalid={Boolean(error("budgetCap"))}
        />
      </Field>

      <input type="hidden" name="currency" value="INR" />

      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? "Creating..." : "Create trip"}
      </Button>
    </form>
  )
}

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={name}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
