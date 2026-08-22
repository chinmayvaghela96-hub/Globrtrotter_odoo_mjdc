"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

/**
 * Rung 3 of the error ladder: a route segment failed to load. The shell and
 * the navigation survive, and the user gets a way forward rather than a
 * blank page. The underlying error stays in the server log.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[route]", error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start gap-4 px-4 py-20">
      <h1 className="text-xl font-semibold tracking-tight">
        We could not load this page
      </h1>
      <p className="text-sm text-muted-foreground">
        The problem was on our side, and nothing you were working on has been
        changed. Try again, and if it keeps happening, reload the app.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
