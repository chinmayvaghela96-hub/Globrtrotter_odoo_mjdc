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
  defaultValue?: string
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
 * Polished, accessible authentication form with immediate feedback,
 * loading spinner during transition, and error alerts.
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
    <form action={formAction} className="flex flex-col gap-4">
      {failed && !failed.fields && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/15 px-3.5 py-2.5 text-sm text-destructive"
        >
          <span>⚠</span>
          <span>{failed.error}</span>
        </div>
      )}

      {fields.map((field) => {
        const error = fieldError(field.name)
        const isPassword = field.type === "password"
        const initialVal = isPassword
          ? ""
          : (state?.values[field.name] ?? field.defaultValue ?? "")

        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={field.name} className="text-xs font-medium text-foreground/90">
              {field.label}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              key={`${field.name}:${initialVal}`}
              defaultValue={initialVal}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${field.name}-error` : undefined}
              className="h-10 border-white/20 bg-background/50 text-foreground transition-all placeholder:text-muted-foreground/60 focus-visible:border-[#dcae72] focus-visible:ring-[#dcae72]/30"
            />
            {error && (
              <p id={`${field.name}-error`} className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
        )
      })}

      <Button
        type="submit"
        disabled={pending}
        className="mt-2 h-10 w-full bg-[#dcae72] text-sm font-semibold text-[#102b39] transition-all hover:bg-[#e6bd8a] active:scale-[0.99] disabled:opacity-75"
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="size-4 animate-spin text-[#102b39]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {pendingLabel}
          </span>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )
}
