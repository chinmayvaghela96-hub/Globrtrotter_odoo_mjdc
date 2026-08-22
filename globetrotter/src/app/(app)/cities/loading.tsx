/**
 * Mirrors the real layout — filter bar, then a card grid — so the page does
 * not jump when the data arrives.
 */
export default function CitiesLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading cities">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-xl border bg-card">
            <div className="h-32 w-full animate-pulse bg-muted" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-full animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
