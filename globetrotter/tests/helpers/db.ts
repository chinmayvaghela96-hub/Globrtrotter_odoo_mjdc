import { prisma } from "@/lib/db"
import { parseDateUTC } from "@/lib/dates"

/**
 * Fixtures for the integration tests. Everything created here is namespaced
 * with a `test_` prefix on the email so `cleanup()` can remove it without
 * touching the seeded demo data — the tests run against the same local
 * database you develop on.
 */

export const TEST_EMAIL_PREFIX = "test_"

export async function makeUser(label: string) {
  const email = `${TEST_EMAIL_PREFIX}${label}@example.test`
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: label, passwordHash: "not-a-real-hash" },
  })
}

export async function makeTrip(
  userId: string,
  overrides: { isPublic?: boolean; shareSlug?: string | null; name?: string } = {},
) {
  return prisma.trip.create({
    data: {
      userId,
      name: overrides.name ?? "Test trip",
      startDate: parseDateUTC("2026-09-01"),
      endDate: parseDateUTC("2026-09-10"),
      isPublic: overrides.isPublic ?? false,
      shareSlug: overrides.shareSlug ?? null,
    },
  })
}

/** Any seeded city will do; the tests never assert on which one. */
export async function someCityIds(count: number) {
  const cities = await prisma.city.findMany({ take: count, select: { id: true } })
  if (cities.length < count) {
    throw new Error(
      `Need ${count} cities but the catalogue has ${cities.length}. Run: npm run db:seed`,
    )
  }
  return cities.map((city) => city.id)
}

/** Removes every test user and, by cascade, everything they own. */
export async function cleanup() {
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_EMAIL_PREFIX } },
  })
}
