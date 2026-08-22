"use client"

import { useActionState, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ActionResult } from "@/lib/result"

type Field = {
  name: string
  label: string
  type?: string
  autoComplete?: string
  placeholder?: string
  hint?: string
}

type Props = {
  action: (raw: unknown) => Promise<ActionResult<unknown>>
  fields: Field[]
  submitLabel: string
  pendingLabel: string
  /** Where to land afterwards; validated server-side by `safeRedirect`. */
  next?: string
  /** Pre-fills the form with the seeded demo account. */
  demo?: { email: string; password: string }
}

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

/**
 * Rungs 1 and 2 of the error ladder, in one component.
 *
 * Field messages render under their input and are wired to it with
 * `aria-describedby`; an action-level message renders as a live region above
 * the form so a screen reader announces it without moving focus. Submitted
 * values are echoed back so a rejected submit never makes anyone retype —
 * passwords excepted, which are deliberately not echoed.
 */
export function AuthForm({
  action,
  fields,
  submitLabel,
  pendingLabel,
  next,
  demo,
}: Props) {
  const formId = useId()
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [prefill, setPrefill] = useState<Record<string, string> | null>(null)

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      return { result: await action(values), values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null
  const fieldError = (name: string) => failed?.fields?.[name]

  const valueFor = (name: string) =>
    prefill?.[name] ?? state?.values[name] ?? ""

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}

      {/*
        Always mounted, so assistive tech treats it as a live region rather
        than newly inserted content it may miss.
      */}
      <div aria-live="polite" role="status" className="empty:hidden">
        {failed && !failed.fields && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {failed.error}
          </p>
        )}
      </div>

      {fields.map((field, index) => {
        const error = fieldError(field.name)
        const isPassword = field.type === "password"
        const inputId = `${formId}-${field.name}`
        const errorId = `${inputId}-error`
        const hintId = `${inputId}-hint`
        const shown = revealed[field.name] ?? false

        const describedBy =
          [error ? errorId : null, field.hint ? hintId : null]
            .filter(Boolean)
            .join(" ") || undefined

        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={inputId}>{field.label}</Label>

            <div className="relative">
              <Input
                id={inputId}
                name={field.name}
                type={isPassword && shown ? "text" : (field.type ?? "text")}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                autoFocus={index === 0}
                // Remount when the echoed value changes so the uncontrolled
                // input actually picks the new default up.
                key={`${field.name}:${isPassword ? "" : valueFor(field.name)}`}
                defaultValue={isPassword ? (prefill?.[field.name] ?? "") : valueFor(field.name)}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
                className={isPassword ? "pr-16" : undefined}
              />

              {isPassword && (
                <button
                  type="button"
                  onClick={() =>
                    setRevealed((current) => ({
                      ...current,
                      [field.name]: !shown,
                    }))
                  }
                  aria-pressed={shown}
                  className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {shown ? "Hide" : "Show"}
                </button>
              )}
            </div>

            {field.hint && !error && (
              <p id={hintId} className="text-xs text-muted-foreground">
                {field.hint}
              </p>
            )}

            {error && (
              <p id={errorId} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )
      })}

      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-1"
      >
        {pending ? pendingLabel : submitLabel}
      </Button>

      {demo && (
        <button
          type="button"
          onClick={() => setPrefill({ email: demo.email, password: demo.password })}
          className="self-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Fill in the demo account
        </button>
      )}
    </form>
  )
}
