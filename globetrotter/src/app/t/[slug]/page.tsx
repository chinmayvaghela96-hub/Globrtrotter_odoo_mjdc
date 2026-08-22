import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Calendar,
  Clock,
  Copy,
  Globe,
  MapPin,
  Sparkles,
  User as UserIcon,
  Tag,
  DollarSign,
  Share2,
} from "lucide-react"
import { copyTrip } from "@/actions/share"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SocialShareButtons } from "@/components/share/social-share-buttons"
import { prisma } from "@/lib/db"
import { currentUser } from "@/lib/guard"
import {
  dayCountUTC,
  eachDayUTC,
  formatDateUTC,
  labelDateUTC,
} from "@/lib/dates"
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
    include: {
      user: { select: { name: true } },
      stops: {
        take: 1,
        orderBy: { orderIndex: "asc" },
        include: { city: { select: { name: true, country: true, imageUrl: true } } },
      },
    },
  })

  if (!trip) return { title: "Trip Not Found · GlobeTrotter" }

  const daysCount = dayCountUTC(trip.startDate, trip.endDate)
  const description =
    trip.description ??
    `Explore this ${daysCount}-day itinerary curated by ${trip.user.name} on GlobeTrotter.`

  const imageUrl =
    trip.coverUrl ?? trip.stops[0]?.city?.imageUrl ?? "/globe.svg"

  return {
    title: `${trip.name} · Shared Itinerary · GlobeTrotter`,
    description,
    openGraph: {
      title: `${trip.name} · GlobeTrotter`,
      description,
      type: "article",
      siteName: "GlobeTrotter",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: trip.name,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${trip.name} · GlobeTrotter Itinerary`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}m`
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

function categoryBadgeColor(category: string | null) {
  switch (category) {
    case "FOOD":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    case "ADVENTURE":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
    case "CULTURE":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
    case "NATURE":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    case "NIGHTLIFE":
      return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
    case "SHOPPING":
      return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20"
    case "RELAXATION":
      return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
    default:
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
  }
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
      user: { select: { name: true, photoUrl: true } },
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
  const heroImage =
    trip.coverUrl ?? trip.stops.find((s) => s.city.imageUrl)?.city.imageUrl ?? null

  const isOwner = user?.id === trip.userId

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Public Top Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <Globe className="h-5 w-5 text-primary" />
            <span>GlobeTrotter</span>
          </Link>

          <div className="flex items-center gap-3">
            {isOwner ? (
              <Link href={`/trips/${trip.id}/build`}>
                <Button size="sm" variant="outline" className="gap-1.5 shadow-sm">
                  Edit Itinerary
                </Button>
              </Link>
            ) : user ? (
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
        {/* Trip Hero Header */}
        <div className="flex flex-col gap-6 border-b pb-8">
          {heroImage && (
            <div className="relative h-48 sm:h-64 w-full overflow-hidden rounded-2xl border shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={trip.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                    <Globe className="h-3 w-3" />
                    Public Itinerary
                  </span>
                  <span className="rounded-full bg-background/80 backdrop-blur px-2.5 py-0.5 text-xs font-medium text-foreground">
                    Curated by {trip.user.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!heroImage && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Globe className="h-3 w-3" />
                Public Itinerary
              </span>
              <span className="text-xs text-muted-foreground">
                Curated by {trip.user.name}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {trip.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
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
          </div>

          {/* Social Share Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Share this itinerary:
              </span>
              <SocialShareButtons
                shareUrl={typeof window !== "undefined" ? window.location.href : ""}
                tripName={trip.name}
                tripDescription={trip.description}
                showPrint={true}
              />
            </div>

            {user && !isOwner && (
              <form
                action={async () => {
                  "use server"
                  await copyTrip({ sourceId: trip.id })
                }}
              >
                <Button size="sm" variant="default" className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Clone Itinerary
                </Button>
              </form>
            )}
          </div>

          {/* Highlights ribbon */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Estimated Total
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
                Route
              </span>
              <span className="text-base font-semibold truncate" title={trip.stops.map((s) => s.city.name).join(" → ")}>
                {trip.stops.map((s) => s.city.name).join(" → ") || "Open Route"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Activities
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {trip.stops.reduce((sum, s) => sum + s.activities.length, 0)} planned
              </span>
            </div>
          </div>
        </div>

        {/* ── Route & Cities Overview ────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Destinations on this Route</h2>
            <span className="text-xs text-muted-foreground">
              {trip.stops.length} {trip.stops.length === 1 ? "stop" : "stops"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trip.stops.map((stop, index) => (
              <div
                key={stop.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/30"
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
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      Stop {index + 1}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {labelDateUTC(stop.arrivalDate)} — {labelDateUTC(stop.departureDate)}
                  </span>
                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground border-t">
                    <span>{stop.city.country}</span>
                    <span className="font-medium">{stop.activities.length} activities</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Day-by-Day Detailed Schedule ───────────────────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Day-by-Day Itinerary</h2>
            <span className="text-xs text-muted-foreground">
              {days.length} days total
            </span>
          </div>

          <div className="flex flex-col gap-6">
            {days.map((day, dayIndex) => {
              const dateStr = formatDateUTC(day)
              const dateLabel = labelDateUTC(day)

              const activeStops = trip.stops.filter(
                (stop) =>
                  dateStr >= formatDateUTC(stop.arrivalDate) &&
                  dateStr <= formatDateUTC(stop.departureDate),
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
                <div
                  key={dateStr}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between border-b pb-3 gap-2">
                    <div className="flex items-baseline gap-3">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                        Day {dayIndex + 1}
                      </span>
                      <h3 className="font-semibold text-base">{dateLabel}</h3>
                      {activeStops.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          {activeStops.map((s) => s.city.name).join(" / ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {arrivalStops.map((stop) => (
                    <div
                      key={`arr-${stop.id}`}
                      className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-xs font-medium text-primary border border-primary/10"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>Arrive in {stop.city.name}, {stop.city.country}</span>
                      </div>
                      {money(stop.transportCost) > 0 && (
                        <span className="tabular-nums text-muted-foreground">
                          Transit: {formatMoney(money(stop.transportCost), trip.currency)}
                        </span>
                      )}
                    </div>
                  ))}

                  {scheduledActivities.length > 0 ? (
                    <ul className="flex flex-col gap-2 pt-1">
                      {scheduledActivities.map((act) => {
                        const category = act.activity?.category ?? null
                        return (
                          <li
                            key={act.id}
                            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border bg-background/60 px-3.5 py-2.5 text-sm transition-colors hover:bg-background"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-medium text-muted-foreground min-w-11">
                                {act.startTime ?? "--:--"}
                              </span>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {act.activity?.name ?? act.customName ?? "Activity"}
                                </span>
                                {category && (
                                  <span
                                    className={`inline-block w-fit mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-medium border ${categoryBadgeColor(
                                      category,
                                    )}`}
                                  >
                                    {category}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {durationLabel(act.durationMin)}
                              </span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {money(act.cost) === 0
                                  ? "Free"
                                  : formatMoney(money(act.cost), trip.currency)}
                              </span>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : arrivalStops.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">
                      Open day / free exploration and leisure.
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Bottom Clone CTA ────────────────────────────────────── */}
        <section className="flex flex-col items-center justify-center gap-4 rounded-2xl border bg-gradient-to-b from-card to-muted/20 p-8 text-center shadow-sm print:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex flex-col gap-1 max-w-lg">
            <h3 className="text-xl font-bold tracking-tight">Love this itinerary?</h3>
            <p className="text-sm text-muted-foreground">
              Clone this complete route, stops, and scheduled activities to your personal GlobeTrotter account with one click, then customize it for your own dates and budget.
            </p>
          </div>

          {user ? (
            <form
              action={async () => {
                "use server"
                await copyTrip({ sourceId: trip.id })
              }}
            >
              <Button size="lg" className="gap-2 shadow-md">
                <Copy className="h-4 w-4" />
                Clone Trip to My Account
              </Button>
            </form>
          ) : (
            <Link href={`/login?next=/t/${slug}`}>
              <Button size="lg" className="gap-2 shadow-md">
                <Sparkles className="h-4 w-4" />
                Sign in to Clone Itinerary
              </Button>
            </Link>
          )}
        </section>
      </main>
    </div>
  )
}
