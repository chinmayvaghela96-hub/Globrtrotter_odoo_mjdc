"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { addDaysUTC, formatDateUTC, parseDateUTC } from "@/lib/dates"
import { appendStop } from "@/lib/stop-order"

/**
 * Pre-made trip templates.
 *
 * A template is just city names + durations. On creation the server:
 * 1. Creates the Trip row.
 * 2. Looks up each city by name (best-match from the seeded catalogue).
 * 3. Appends stops, each in its own transaction via appendStop().
 * 4. Redirects to the builder so the user can tweak.
 *
 * Cities that aren't in the catalogue are silently skipped — the template is
 * still useful with partial coverage.
 */

export type Template = {
  id: string
  name: string
  description: string
  durationDays: number
  cities: { name: string; country: string; nights: number }[]
  emoji: string
}

export const TEMPLATES: Template[] = [
  {
    id: "sea-loop",
    name: "Southeast Asia Loop",
    description: "Bangkok → Chiang Mai → Ubud. Street food, temples and rice terraces.",
    durationDays: 21,
    emoji: "🌴",
    cities: [
      { name: "Bangkok", country: "Thailand", nights: 4 },
      { name: "Chiang Mai", country: "Thailand", nights: 4 },
      { name: "Ubud", country: "Indonesia", nights: 5 },
    ],
  },
  {
    id: "europe-highlights",
    name: "Europe Highlights",
    description: "Paris → Rome → Barcelona. The classics in three weeks.",
    durationDays: 21,
    emoji: "🗼",
    cities: [
      { name: "Paris", country: "France", nights: 5 },
      { name: "Rome", country: "Italy", nights: 5 },
      { name: "Barcelona", country: "Spain", nights: 5 },
    ],
  },
  {
    id: "japan-rail",
    name: "Japan Rail Pass",
    description: "Tokyo → Kyoto → Osaka. Bullet trains, shrines, and ramen.",
    durationDays: 14,
    emoji: "🗾",
    cities: [
      { name: "Tokyo", country: "Japan", nights: 5 },
      { name: "Kyoto", country: "Japan", nights: 4 },
      { name: "Osaka", country: "Japan", nights: 3 },
    ],
  },
  {
    id: "india-triangle",
    name: "Golden Triangle India",
    description: "Delhi → Agra → Jaipur. Mughal forts, the Taj and pink-city bazaars.",
    durationDays: 10,
    emoji: "🕌",
    cities: [
      { name: "Delhi", country: "India", nights: 3 },
      { name: "Agra", country: "India", nights: 2 },
      { name: "Jaipur", country: "India", nights: 3 },
    ],
  },
  {
    id: "australia-east",
    name: "Australia East Coast",
    description: "Sydney → Melbourne. Coffee culture, beaches, and the Great Ocean Road.",
    durationDays: 14,
    emoji: "🦘",
    cities: [
      { name: "Sydney", country: "Australia", nights: 5 },
      { name: "Melbourne", country: "Australia", nights: 5 },
    ],
  },
]

const CreateFromTemplateInput = z.object({
  templateId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
})

export const createTripFromTemplate = action(
  CreateFromTemplateInput,
  async (input, user) => {
    const template = TEMPLATES.find((t) => t.id === input.templateId)
    if (!template) throw new Error("Unknown template.")

    const start = parseDateUTC(input.startDate)
    const end = addDaysUTC(start, template.durationDays)

    // 1. Create the Trip
    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        name: template.name,
        description: template.description,
        startDate: start,
        endDate: end,
        currency: "INR",
      },
    })

    // 2. Resolve city ids from catalogue, appending stops in order
    let cursor = start
    for (const stop of template.cities) {
      const city = await prisma.city.findFirst({
        where: {
          name: { equals: stop.name, mode: "insensitive" },
          country: { equals: stop.country, mode: "insensitive" },
        },
        select: { id: true },
      })
      if (!city) continue // city not in catalogue — skip gracefully

      const arrival = cursor
      const departure = addDaysUTC(cursor, stop.nights)
      // Clamp departure to trip end
      const clampedDeparture =
        formatDateUTC(departure) > formatDateUTC(end) ? end : departure

      await appendStop({
        tripId: trip.id,
        cityId: city.id,
        arrivalDate: arrival,
        departureDate: clampedDeparture,
      })

      cursor = departure
    }

    revalidatePath("/trips")
    revalidatePath("/dashboard")
    redirect(`/trips/${trip.id}/build`)
  },
)
