"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { guestAction } from "@/lib/action"
import { prisma } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/password"
import { fail, ok } from "@/lib/result"
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session"

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."))

const SignUpInput = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  email,
  password: z.string().min(8, "Use at least 8 characters."),
})

const SignInInput = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
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

export const signUp = guestAction(SignUpInput, async ({ name, email, password }) => {
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
  redirect("/dashboard") // throws NEXT_REDIRECT; guestAction rethrows it
})

export const signIn = guestAction(SignInInput, async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } })

  // One message for "no such account" and "wrong password" alike. Telling
  // them apart would turn this form into a directory of registered emails.
  const rejected = fail("Email or password is incorrect.")

  if (!user) {
    // Hash anyway so a missing account does not answer measurably faster
    // than a wrong password.
    await hashPassword(password)
    return rejected
  }

  if (!(await verifyPassword(password, user.passwordHash))) return rejected

  await startSession(user.id)
  redirect("/dashboard")
})

export async function signOut() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect("/login")
}
