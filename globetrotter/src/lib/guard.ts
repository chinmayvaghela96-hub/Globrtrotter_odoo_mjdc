import { cache } from "react"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { User } from "@prisma/client"
import { prisma } from "@/lib/db"
import { SESSION_COOKIE, verifySession } from "@/lib/session"

/**
 * Authorization, in one place.
 *
 * The rule for this codebase: **ownership goes in the `where` clause**, never
 * in an `if` after the fetch. There is no window in which an unauthorized row
 * exists in memory, and no branch a tired developer can forget to write.
 *
 * Every failure is `notFound()`, never a 403. A 403 confirms that the id
 * exists, which is itself a disclosure; a 404 is indistinguishable from a
 * resource that was never there.
 */

/** Resolves the signed-in user at most once per request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null

  const userId = await verifySession(token)
  if (!userId) return null

  return prisma.user.findUnique({ where: { id: userId } })
})

export async function requireUser(): Promise<User> {
  const user = await currentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (user.role !== "ADMIN") notFound()
  return user
}

/** Owner-only access to a trip: read, update, and delete. */
export async function requireTripOwner(tripId: string) {
  const user = await requireUser()
  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: user.id }, // <- the entire check
  })
  if (!trip) notFound()
  return { user, trip }
}

/** Read access: the owner, or anyone at all when the trip is public. */
export async function requireTripReadable(tripId: string) {
  const user = await currentUser() // may legitimately be null
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [{ isPublic: true }, ...(user ? [{ userId: user.id }] : [])],
    },
  })
  if (!trip) notFound()
  return { user, trip }
}

/**
 * Nested resource — the one that is easy to get wrong. A stop id is not a
 * trip id, so the ownership filter walks the relation inside the query
 * rather than fetching the stop and comparing afterwards.
 */
export async function requireStopOwner(stopId: string) {
  const user = await requireUser()
  const stop = await prisma.stop.findFirst({
    where: { id: stopId, trip: { userId: user.id } },
    include: { trip: true },
  })
  if (!stop) notFound()
  return { user, stop }
}

/** Same shape, one level deeper: a scheduled activity inside a stop. */
export async function requireTripActivityOwner(tripActivityId: string) {
  const user = await requireUser()
  const tripActivity = await prisma.tripActivity.findFirst({
    where: { id: tripActivityId, stop: { trip: { userId: user.id } } },
    include: { stop: true },
  })
  if (!tripActivity) notFound()
  return { user, tripActivity }
}
