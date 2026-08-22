"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

/**
 * Rung 3, scoped to this trip. Placed here rather than only at the root so a
 * failed budget or calendar query does not blank out the whole application —
 * the shell, the navigation and the trip header all survive.
 */
export default function TripError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[trip]", error)
  }, [error])

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed p-8">
      <h2 className="font-medium">We could not load this section</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Your trip is safe and nothing has been changed. Try again, or switch to
        another tab and come back.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <Button onClick={reset} size="sm">
        Try again
      </Button>
    </div>
  )
}
