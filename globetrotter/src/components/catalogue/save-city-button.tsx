"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { toggleSavedCity } from "@/actions/saved"
import { Button } from "@/components/ui/button"

/**
 * Save toggle for one city card.
 *
 * Optimistic on purpose: the write is a single reversible row, and a grid of
 * cards each waiting on a round trip feels broken. The label flips first and
 * rolls back if the action returns a failure, so the button never shows
 * "Saved" for a city the server did not save.
 */
export function SaveCityButton({
  cityId,
  cityName,
  initialSaved,
}: {
  cityId: string
  cityName: string
  initialSaved: boolean
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    const next = !saved
    setSaved(next)

    startTransition(async () => {
      const result = await toggleSavedCity({ cityId })

      if (!result.ok) {
        setSaved(!next)
        toast.error(result.error)
        return
      }

      // Trust the server's answer over the guess — they differ if the same
      // city was toggled in another tab.
      setSaved(result.data.saved)
    })
  }

  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${cityName} from saved` : `Save ${cityName}`}
      onClick={toggle}
    >
      {saved ? "Saved" : "Save"}
    </Button>
  )
}
