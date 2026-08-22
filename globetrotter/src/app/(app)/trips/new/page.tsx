import Link from "next/link"
import { CreateTripForm } from "@/components/trip/create-trip-form"
import { TripTemplates } from "@/components/trip/trip-templates"
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
          Start from a template or name it and set the dates yourself.
        </p>
      </div>

      {/* Quick-start templates */}
      <TripTemplates />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or create from scratch</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <CreateTripForm
        defaultStart={formatDateUTC(addDaysUTC(base, 14))}
        defaultEnd={formatDateUTC(addDaysUTC(base, 21))}
      />
    </div>
  )
}
