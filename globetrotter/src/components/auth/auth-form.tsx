"use client"

import { useActionState } from "react"
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
}

type Props = {
  action: (raw: unknown) => Promise<ActionResult<unknown>>
  fields: Field[]
  submitLabel: string
  pendingLabel: string
}

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

/**
 * Rungs 1 and 2 of the error ladder, in one component.
 *
 * Field-level messages render under their input; an action-level message
 * renders as a banner above the form. The submitted values are echoed back
 * as defaults so a rejected submit never makes the user retype what they
 * already entered — passwords excepted, which are deliberately not echoed.
 */
export function AuthForm({ action, fields, submitLabel, pendingLabel }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      return { result: await action(values), values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null
  const fieldError = (name: string) => failed?.fields?.[name]

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {failed && !failed.fields && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {failed.error}
        </p>
      )}

      {fields.map((field) => {
        const error = fieldError(field.name)
        const isPassword = field.type === "password"

        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              // `key` forces a remount when the echoed value changes, so the
              // uncontrolled input actually picks the new default up.
              key={`${field.name}:${isPassword ? "" : (state?.values[field.name] ?? "")}`}
              defaultValue={isPassword ? "" : (state?.values[field.name] ?? "")}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${field.name}-error` : undefined}
            />
            {error && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )
      })}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  )
}
