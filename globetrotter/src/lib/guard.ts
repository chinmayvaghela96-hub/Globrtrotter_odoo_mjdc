import { cache } from "react"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { User } from "@prisma/client"
import { prisma } from "@/lib/db"
import { SESSION_COOKIE, verifySession } from "@/lib/session"
import {
  findOwnedStop,
  findOwnedTrip,
  findOwnedTripActivity,
  findReadableTrip,
} from "@/lib/authz"

/**
 * Session plumbing wrapped around the predicates in `lib/authz.ts`.
 *
 * The rule for this codebase: **ownership goes in the `where` clause**, never
 * in an `if` after the fetch. There is no window in which an unauthorized row
 * exists in memory, and no branch a tired developer can forget to write.
 *
 * Every failure is `notFound()`, never a 403. A 403 confirms that the id
 * exists, which is itself a disclosure; a 404 is indistinguishable from a
 * resource that was never there.
 *
 * The predicates live in `authz.ts` rather than here so they can be tested
 * without a request context — see `tests/authz.test.ts`.
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
  const trip = await findOwnedTrip(user.id, tripId)
  if (!trip) notFound()
  return { user, trip }
}

/** Read access: the owner, or anyone at all when the trip is public. */
export async function requireTripReadable(tripId: string) {
  const user = await currentUser() // may legitimately be null
  const trip = await findReadableTrip(user?.id ?? null, tripId)
  if (!trip) notFound()
  return { user, trip }
}

export async function requireStopOwner(stopId: string) {
  const user = await requireUser()
  const stop = await findOwnedStop(user.id, stopId)
  if (!stop) notFound()
  return { user, stop }
}

export async function requireTripActivityOwner(tripActivityId: string) {
  const user = await requireUser()
  const tripActivity = await findOwnedTripActivity(user.id, tripActivityId)
  if (!tripActivity) notFound()
  return { user, tripActivity }
}
