"use client"

import { useActionState, useState } from "react"
import { deleteAccount } from "@/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ActionResult } from "@/lib/result"

type FormState = {
  result: ActionResult<unknown>
  values: Record<string, string>
} | null

/**
 * Irreversible, so it is gated twice: the panel stays collapsed until asked
 * for, and then requires the account's own email typed back. The server
 * checks that email again — this control is a speed bump, not the guard.
 */
export function DeleteAccount({
  email,
  tripCount,
}: {
  email: string
  tripCount: number
}) {
  const [open, setOpen] = useState(false)

  const [state, formAction, deleting] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const values = Object.fromEntries(formData) as Record<string, string>
      return { result: await deleteAccount(values), values }
    },
    null,
  )

  const failed = state && !state.result.ok ? state.result : null

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-destructive/30 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold tracking-tight">Delete account</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          This removes your account and{" "}
          {tripCount === 0
            ? "everything saved to it"
            : `all ${tripCount} of your trips, with their stops, activities and expenses`}
          . It cannot be undone.
        </p>
      </div>

      {!open ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="self-start"
          onClick={() => setOpen(true)}
        >
          Delete my account
        </Button>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmEmail">
              Type <span className="font-mono">{email}</span> to confirm
            </Label>
            <Input
              id="confirmEmail"
              name="confirmEmail"
              autoComplete="off"
              className="max-w-sm"
              aria-invalid={Boolean(failed?.fields?.confirmEmail)}
            />
            {failed && (
              <p className="text-sm text-destructive">
                {failed.fields?.confirmEmail ?? failed.error}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" variant="destructive" size="sm" disabled={deleting}>
              {deleting ? "Deleting..." : "Permanently delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
