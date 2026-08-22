import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Clock, Copy, Globe, MapPin, Printer, Sparkles } from "lucide-react"
import { copyTrip } from "@/actions/share"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { prisma } from "@/lib/db"
import { currentUser } from "@/lib/guard"
import { dayCountUTC, eachDayUTC, formatDateUTC, labelDateUTC, parseDateUTC } from "@/lib/dates"
import { formatMoney, money, moneyOrNull } from "@/lib/serialize"
import { computeBudget, type CostCategory } from "@/lib/budget"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const trip = await prisma.trip.findFirst({
    where: { shareSlug: slug, isPublic: true },
    select: { name: true, description: true },
  })

  if (!trip) return { title: "Trip Not Found · GlobeTrotter" }

  return {
    title: `${trip.name} · Shared Itinerary · GlobeTrotter`,
    description: trip.description ?? `Explore the shared itinerary for ${trip.name} on GlobeTrotter.`,
    openGraph: {
      title: `${trip.name} · GlobeTrotter`,
      description: trip.description ?? "Explore this travel itinerary.",
      type: "website",
    },
  }
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await currentUser()

  const trip = await prisma.trip.findFirst({
    where: { shareSlug: slug, isPublic: true },
    include: {
      user: { select: { name: true } },
      stops: {
        orderBy: { orderIndex: "asc" },
        include: {
          city: true,
          activities: {
            orderBy: [{ scheduledDate: "asc" }, { orderIndex: "asc" }],
            include: { activity: { select: { name: true, category: true } } },
          },
        },
      },
      expenses: true,
    },
  })

  if (!trip) notFound()

  const daysCount = dayCountUTC(trip.startDate, trip.endDate)
  const budget = computeBudget({
    startDate: trip.startDate,
    endDate: trip.endDate,
    budgetCap: moneyOrNull(trip.budgetCap),
    currency: trip.currency,
    stops: trip.stops.map((stop) => ({
      arrivalDate: stop.arrivalDate,
      transportCost: money(stop.transportCost),
      stayCost: money(stop.stayCost),
      activities: stop.activities.map((act) => ({
        scheduledDate: act.scheduledDate,
        cost: money(act.cost),
      })),
    })),
    expenses: trip.expenses.map((exp) => ({
      date: exp.date,
      category: exp.category as CostCategory,
      amount: money(exp.amount),
    })),
  })

  const days = eachDayUTC(trip.startDate, trip.endDate)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Public Top Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <Globe className="h-5 w-5 text-primary" />
            <span>GlobeTrotter</span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <form
                action={async () => {
                  "use server"
                  await copyTrip({ sourceId: trip.id })
                }}
              >
                <Button size="sm" className="gap-1.5 shadow-sm">
                  <Copy className="h-4 w-4" />
                  Copy Trip to My Account
                </Button>
              </form>
            ) : (
              <Link href={`/login?next=/t/${slug}`}>
                <Button size="sm" className="gap-1.5 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  Sign in to Clone Itinerary
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:py-12">
        {/* Trip Hero / Header */}
        <div className="flex flex-col gap-4 border-b pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
              Public Itinerary
            </span>
            <span className="text-xs text-muted-foreground">
              Curated by {trip.user.name}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {trip.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {labelDateUTC(trip.startDate)} — {labelDateUTC(trip.endDate)}
            </span>
            <span>
              {daysCount} {daysCount === 1 ? "day" : "days"}
            </span>
            <span>
              {trip.stops.length} {trip.stops.length === 1 ? "destination" : "destinations"}
            </span>
          </div>

          {trip.description && (
            <p className="max-w-3xl text-base text-muted-foreground leading-relaxed pt-2">
              {trip.description}
            </p>
          )}

          {/* Highlights ribbon */}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-xl border bg-card p-4">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Total Budget
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(budget.total, trip.currency)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Daily Average
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(budget.perDayAvg, trip.currency)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Destinations
              </span>
              <span className="text-lg font-semibold">
                {trip.stops.map((s) => s.city.name).join(" → ") || "None"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Activities
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {trip.stops.reduce((sum, s) => sum + s.activities.length, 0)} scheduled
              </span>
            </div>
          </div>
        </div>

        {/* ── Route & Cities Overview ────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">Destinations on this Route</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trip.stops.map((stop, index) => (
              <div
                key={stop.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stop.city.imageUrl}
                  alt={stop.city.name}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{stop.city.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Stop {index + 1}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {labelDateUTC(stop.arrivalDate)} — {labelDateUTC(stop.departureDate)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stop.city.country} · {stop.activities.length} activities
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Day-by-Day Detailed Schedule ───────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Day-by-Day Itinerary</h2>
          </div>

          <div className="flex flex-col gap-8">
            {days.map((day, dayIndex) => {
              const dateStr = formatDateUTC(day)
              const dateLabel = labelDateUTC(day)

              const activeStops = trip.stops.filter(
                (stop) => dateStr >= formatDateUTC(stop.arrivalDate) && dateStr <= formatDateUTC(stop.departureDate),
              )
              const arrivalStops = trip.stops.filter(
                (stop) => formatDateUTC(stop.arrivalDate) === dateStr,
              )
              const scheduledActivities = trip.stops.flatMap((stop) =>
                stop.activities
                  .filter((act) => formatDateUTC(act.scheduledDate) === dateStr)
                  .map((act) => ({ ...act, cityName: stop.city.name })),
              )

              return (
                <div key={dateStr} className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-baseline justify-between border-b pb-3 gap-2">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs font-bold text-primary">
                        Day {dayIndex + 1}
                      </span>
                      <h3 className="font-semibold text-base">{dateLabel}</h3>
                      {activeStops.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {activeStops.map((s) => s.city.name).join(" / ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {arrivalStops.map((stop) => (
                    <div
                      key={`arr-${stop.id}`}
                      className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>Arrive in {stop.city.name}, {stop.city.country}</span>
                    </div>
                  ))}

                  {scheduledActivities.length > 0 ? (
                    <ul className="flex flex-col gap-2 pt-1">
                      {scheduledActivities.map((act) => (
                        <li
                          key={act.id}
                          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border bg-background/50 px-3.5 py-2.5 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {act.startTime ?? "--:--"}
                            </span>
                            <span className="font-medium">
                              {act.activity?.name ?? act.customName ?? "Activity"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{durationLabel(act.durationMin)}</span>
                            <span className="font-medium tabular-nums text-foreground">
                              {money(act.cost) === 0
                                ? "Free"
                                : formatMoney(money(act.cost), trip.currency)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : arrivalStops.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">
                      Open day / free exploration.
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Bottom Clone CTA ────────────────────────────────────── */}
        <section className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-8 text-center shadow-sm print:hidden">
          <Sparkles className="h-8 w-8 text-primary" />
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold">Love this itinerary?</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Clone this complete route and all activities to your personal GlobeTrotter account with one click, then customize it for your own dates and budget.
            </p>
          </div>

          {user ? (
            <form
              action={async () => {
                "use server"
                await copyTrip({ sourceId: trip.id })
              }}
            >
              <Button size="lg" className="gap-2">
                <Copy className="h-4 w-4" />
                Clone Trip & Start Planning
              </Button>
            </form>
          ) : (
            <Link href={`/login?next=/t/${slug}`}>
              <Button size="lg" className="gap-2">
                Sign in to Clone Itinerary
              </Button>
            </Link>
          )}
        </section>
      </main>
    </div>
  )
}
