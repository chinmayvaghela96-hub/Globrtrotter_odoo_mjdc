"use client"

import { useActionState } from "react"
import { toast } from "sonner"
import { updateProfile } from "@/actions/profile"
import { CURRENCIES, LANGUAGES } from "@/lib/preferences"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ActionResult } from "@/lib/result"

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

const selectClass =
  "h-9 rounded-lg border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"

export function ProfileForm({
  defaults,
}: {
  defaults: {
    name: string
    email: string
    photoUrl: string
    language: string
    currency: string
  }
}) {
  const [state, formAction, saving] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      const result = await updateProfile(values)
      if (result.ok) toast.success("Profile saved")
      return { result, values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null
  const error = (name: string) => failed?.fields?.[name]
  const value = (name: string, fallback: string) =>
    state?.values[name] ?? fallback

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

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={value("name", defaults.name)}
          aria-invalid={Boolean(error("name"))}
        />
        {error("name") && <p className="text-sm text-destructive">{error("name")}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={defaults.email} readOnly disabled />
        <p className="text-xs text-muted-foreground">
          Your email identifies the account and cannot be changed here.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="photoUrl">Photo URL</Label>
          <span className="text-xs text-muted-foreground">Optional</span>
        </div>
        <Input
          id="photoUrl"
          name="photoUrl"
          type="url"
          placeholder="https://example.com/photo.jpg"
          defaultValue={value("photoUrl", defaults.photoUrl)}
          aria-invalid={Boolean(error("photoUrl"))}
        />
        {error("photoUrl") && (
          <p className="text-sm text-destructive">{error("photoUrl")}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="language">Language</Label>
          <select
            id="language"
            name="language"
            defaultValue={value("language", defaults.language)}
            className={selectClass}
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            name="currency"
            defaultValue={value("currency", defaults.currency)}
            className={selectClass}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Used for new trips. Existing trips keep the currency they were
            created with.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="mt-1 self-start">
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </form>
  )
}
