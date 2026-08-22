"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { guestAction } from "@/lib/action"
import { prisma } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/password"
import { fail } from "@/lib/result"
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session"

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."))

const safeRedirectUrl = z
  .string()
  .trim()
  .optional()
  .transform((val) => {
    if (!val || !val.startsWith("/") || val.startsWith("//")) return "/dashboard"
    return val
  })

const SignUpInput = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  email,
  password: z.string().min(8, "Use at least 8 characters."),
  redirectTo: safeRedirectUrl,
})

const SignInInput = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  redirectTo: safeRedirectUrl,
})

async function startSession(userId: string) {
  const token = await signSession(userId)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, // not readable from JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })
}

export const signUp = guestAction(SignUpInput, async ({ name, email, password, redirectTo }) => {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return fail("Check the highlighted fields.", {
      email: "An account already uses this email.",
    })
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  })

  await startSession(user.id)
  redirect(redirectTo || "/dashboard")
})

export const signIn = guestAction(SignInInput, async ({ email, password, redirectTo }) => {
  const user = await prisma.user.findUnique({ where: { email } })

  // One message for "no such account" and "wrong password" alike.
  const rejected = fail("Email or password is incorrect.")

  if (!user) {
    await hashPassword(password)
    return rejected
  }

  if (!(await verifyPassword(password, user.passwordHash))) return rejected

  await startSession(user.id)
  redirect(redirectTo || "/dashboard")
})

export async function signOut() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect("/login")
}
