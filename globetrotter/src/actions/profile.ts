"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { z } from "zod"
import { action } from "@/lib/action"
import { prisma } from "@/lib/db"
import { rejectField } from "@/lib/result"
import { SESSION_COOKIE } from "@/lib/session"

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
] as const

export const CURRENCIES = [
  { value: "INR", label: "Indian rupee (INR)" },
  { value: "USD", label: "US dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "Pound sterling (GBP)" },
  { value: "JPY", label: "Japanese yen (JPY)" },
  { value: "AUD", label: "Australian dollar (AUD)" },
  { value: "SGD", label: "Singapore dollar (SGD)" },
  { value: "THB", label: "Thai baht (THB)" },
] as const

/**
 * `role` is deliberately absent from this schema.
 *
 * Zod strips unknown keys, so posting `role=ADMIN` to this form does not
 * reach Prisma at all — privilege escalation is blocked by the shape of the
 * input rather than by a check someone has to remember to write.
 */
const UpdateProfileInput = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  photoUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.url("Enter a full URL, starting with https://").optional(),
  ),
  language: z.enum(LANGUAGES.map((l) => l.value) as [string, ...string[]]),
  currency: z.enum(CURRENCIES.map((c) => c.value) as [string, ...string[]]),
})

/** Deleting an account is irreversible, so it asks for the email back. */
const DeleteAccountInput = z.object({
  confirmEmail: z.string().trim().toLowerCase(),
})

export const updateProfile = action(UpdateProfileInput, async (input, user) => {
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: input.name,
      photoUrl: input.photoUrl ?? null,
      language: input.language,
      currency: input.currency,
    },
  })

  revalidatePath("/profile")
  revalidatePath("/dashboard", "layout")
  return { name: input.name }
})

/**
 * No `$transaction`: every foreign key pointing at `User` is declared
 * `onDelete: Cascade`, so Postgres removes the trips, stops, scheduled
 * activities, expenses and saved cities in the same atomic statement.
 */
export const deleteAccount = action(DeleteAccountInput, async (input, user) => {
  if (input.confirmEmail !== user.email.toLowerCase()) {
    rejectField("confirmEmail", "That does not match your email address.")
  }

  await prisma.user.delete({ where: { id: user.id } })
  ;(await cookies()).delete(SESSION_COOKIE)

  redirect("/signup")
})
