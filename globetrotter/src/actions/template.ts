"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { addDaysUTC, formatDateUTC, parseDateUTC } from "@/lib/dates"
import { appendStop } from "@/lib/stop-order"
import { TEMPLATES } from "@/lib/trip-templates"


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
