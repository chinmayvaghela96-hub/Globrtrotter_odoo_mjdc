"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"

/**
 * Saved destinations.
 *
 * `SavedCity` has a composite primary key `[userId, cityId]`, so the row is
 * addressed by the pair — a user can only ever touch their own, and the same
 * city cannot be saved twice. No transaction: each of these is a single-row
 * write, already atomic in Postgres.
 */

const CityIdInput = z.object({ cityId: z.string().min(1) })

/** Every surface that lists saved cities. */
function revalidateSaved() {
  revalidatePath("/cities")
  revalidatePath("/wishlist")
  revalidatePath("/profile")
}

export const saveCity = action(CityIdInput, async (input, user) => {
  await prisma.savedCity.upsert({
    where: { userId_cityId: { userId: user.id, cityId: input.cityId } },
    update: {}, // saving twice is a no-op, not an error
    create: { userId: user.id, cityId: input.cityId },
  })

  revalidateSaved()
  return { saved: true }
})

export const unsaveCity = action(CityIdInput, async (input, user) => {
  // deleteMany, not delete: removing something already gone is not an error.
  await prisma.savedCity.deleteMany({
    where: { userId: user.id, cityId: input.cityId },
  })

  revalidateSaved()
  return { saved: false }
})

export const toggleSavedCity = action(CityIdInput, async (input, user) => {
  const key = { userId_cityId: { userId: user.id, cityId: input.cityId } }
  const existing = await prisma.savedCity.findUnique({ where: key })

  if (existing) {
    await prisma.savedCity.delete({ where: key })
    revalidateSaved()
    return { saved: false }
  }

  await prisma.savedCity.create({
    data: { userId: user.id, cityId: input.cityId },
  })
  revalidateSaved()
  return { saved: true }
})
