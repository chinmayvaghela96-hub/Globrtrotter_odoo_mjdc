import { prisma } from "@/lib/db"

/**
 * Authorization predicates.
 *
 * These are the actual security boundary: each one puts ownership into the
 * `where` clause, so an unauthorized row is never fetched in the first place.
 * They are kept free of any Next import on purpose — `lib/guard.ts` wires
 * them to the session and to `notFound()`, while these stay callable from a
 * plain test with no request context. `tests/authz.test.ts` exercises them.
 *
 * All of them return `null` rather than throwing, and every caller turns that
 * null into a 404 — never a 403, which would confirm the id exists.
 */

export function findOwnedTrip(userId: string, tripId: string) {
  return prisma.trip.findFirst({ where: { id: tripId, userId } })
}

/** The owner, or anyone at all when the trip has been made public. */
export function findReadableTrip(userId: string | null, tripId: string) {
  return prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [{ isPublic: true }, ...(userId ? [{ userId }] : [])],
    },
  })
}

export function findTripByShareSlug(shareSlug: string) {
  // Revoking a share nulls the slug, so an old link stops resolving rather
  // than quietly continuing to work.
  return prisma.trip.findFirst({ where: { shareSlug, isPublic: true } })
}

/**
 * Nested resource. A stop id is not a trip id, so the ownership filter walks
 * the relation inside the query instead of fetching then comparing.
 */
export function findOwnedStop(userId: string, stopId: string) {
  return prisma.stop.findFirst({
    where: { id: stopId, trip: { userId } },
    include: { trip: true },
  })
}

/** One level deeper again: a scheduled activity inside a stop inside a trip. */
export function findOwnedTripActivity(userId: string, tripActivityId: string) {
  return prisma.tripActivity.findFirst({
    where: { id: tripActivityId, stop: { trip: { userId } } },
    include: { stop: true },
  })
}
