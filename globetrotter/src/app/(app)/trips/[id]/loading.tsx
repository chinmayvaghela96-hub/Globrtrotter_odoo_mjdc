export default function TripLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading trip">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-64 animate-pulse rounded bg-muted" />
          <div className="h-3 w-52 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
