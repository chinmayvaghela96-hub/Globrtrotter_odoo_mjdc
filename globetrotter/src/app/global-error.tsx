"use client"

/**
 * Rung 5: the root layout itself failed, so this replaces the whole
 * document — it must render its own html and body. Last resort only.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "5rem 1.5rem" }}>
        <main style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            GlobeTrotter stopped responding
          </h1>
          <p style={{ marginTop: "0.75rem", lineHeight: 1.6 }}>
            Something failed before the page could render. Reloading usually
            clears it.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", opacity: 0.7 }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid currentColor",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  )
}
