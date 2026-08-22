import { notFound } from "next/navigation"
import { BarChart3, Globe2, MapPin, ShieldCheck, TrendingUp, Users, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/guard"
import { labelDateUTC } from "@/lib/dates"

export const metadata = { title: "Admin Analytics · GlobeTrotter" }

export default async function AdminPage() {
  await requireAdmin()

  const [
    userCount,
    tripCount,
    publicTripCount,
    stopCount,
    activityCount,
    topCityStops,
    recentTrips,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.trip.count(),
    prisma.trip.count({ where: { isPublic: true } }),
    prisma.stop.count(),
    prisma.tripActivity.count(),
    prisma.stop.groupBy({
      by: ["cityId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),
    prisma.trip.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { stops: true, expenses: true } },
      },
    }),
  ])

  // Resolve city names for top stops
  const cityIds = topCityStops.map((c) => c.cityId)
  const cities = await prisma.city.findMany({
    where: { id: { in: cityIds } },
    select: { id: true, name: true, country: true, region: true, popularity: true },
  })
  const cityMap = new Map(cities.map((c) => [c.id, c]))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Admin & Platform Analytics</h1>
            <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Platform-wide metrics, route adoption, and recent activity logs.
          </p>
        </div>
      </div>

      {/* ── Top Metric Cards ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Travellers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{userCount}</div>
            <p className="text-xs text-muted-foreground">Registered user accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Itineraries
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{tripCount}</div>
            <p className="text-xs text-muted-foreground">
              {publicTripCount} publicly shared ({tripCount > 0 ? Math.round((publicTripCount / tripCount) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Destination Stops
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stopCount}</div>
            <p className="text-xs text-muted-foreground">
              {tripCount > 0 ? (stopCount / tripCount).toFixed(1) : 0} avg stops per trip
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Activities Booked
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{activityCount}</div>
            <p className="text-xs text-muted-foreground">Scheduled in itineraries</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Popular Destinations & Recent Trips ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Top Planned Destinations
            </CardTitle>
            <CardDescription>
              Most added cities across all itineraries in the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Stops Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCityStops.map((item, idx) => {
                  const city = cityMap.get(item.cityId)
                  if (!city) return null
                  return (
                    <TableRow key={item.cityId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <span className="font-medium">{city.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({city.country})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {city.region}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {item._count.id}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Trips Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Recent Itineraries Created
            </CardTitle>
            <CardDescription>
              Latest trips planned by platform users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip Name</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Stops</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium leading-tight">{trip.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {labelDateUTC(trip.startDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {trip.user.name}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {trip._count.stops} cities
                    </TableCell>
                    <TableCell className="text-right">
                      {trip.isPublic ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-300 text-[10px] text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-400"
                        >
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          Private
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
