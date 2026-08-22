import { SignJWT, jwtVerify } from "jose"

/**
 * Pure session crypto. Deliberately imports nothing from Node, Prisma, or
 * bcrypt, because `middleware.ts` runs on the Edge runtime and would crash
 * on any of them. Password hashing lives in `password.ts`, which is only
 * ever called from a server action.
 */

export const SESSION_COOKIE = "gt_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET
  if (!value) throw new Error("SESSION_SECRET is not set")
  return new TextEncoder().encode(value)
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret())
}

/** Returns the user id, or null for any invalid, expired, or forged token. */
export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] })
    return typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null // expired or tampered — both are simply "not signed in"
  }
}
