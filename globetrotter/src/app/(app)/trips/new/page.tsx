import Link from "next/link"
import { CreateTripForm } from "@/components/trip/create-trip-form"
import { addDaysUTC, formatDateUTC } from "@/lib/dates"
import { requireUser } from "@/lib/guard"

export const metadata = { title: "Plan a new trip · GlobeTrotter" }

export default async function NewTripPage() {
  await requireUser()

  // Sensible defaults so the form is one click from valid. Built in UTC for
  // the same reason every other date in this app is.
  const today = new Date()
  const base = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/trips"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← My trips
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Plan a new trip</h1>
        <p className="text-sm text-muted-foreground">
          Name it and set the dates. You will add cities next.
        </p>
      </div>

      <CreateTripForm
        defaultStart={formatDateUTC(addDaysUTC(base, 14))}
        defaultEnd={formatDateUTC(addDaysUTC(base, 21))}
      />
    </div>
  )
}
