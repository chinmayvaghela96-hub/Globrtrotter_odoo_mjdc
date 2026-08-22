import Link from "next/link"
import { Compass } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export default function PublicTripNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Compass className="h-8 w-8" />
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h1 className="text-2xl font-bold tracking-tight">Shared Trip Not Found</h1>
        <p className="text-sm text-muted-foreground">
          This itinerary is no longer publicly shared, or the share link is invalid.
        </p>
      </div>

      <Link href="/dashboard" className={buttonVariants()}>
        Explore GlobeTrotter
      </Link>
    </div>
  )
}
