export default function WishlistLoading() {
  return (
    <div
      className="flex flex-col gap-8"
      aria-busy="true"
      aria-label="Loading your wishlist"
    >
      <div className="flex flex-col gap-2">
        <div className="h-8 w-36 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-xl border bg-card">
            <div className="h-32 w-full animate-pulse bg-muted" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
