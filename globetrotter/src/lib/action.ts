import { z } from "zod"
import type { User } from "@prisma/client"
import { requireUser } from "@/lib/guard"
import { type ActionResult, fail, ok, Rejected } from "@/lib/result"

/**
 * The wrapper every mutation goes through.
 *
 * Three properties fall out of it, and all three are the point:
 *  1. Authentication cannot be skipped — `requireUser()` runs before the
 *     handler exists, so an action written without this wrapper is visible
 *     by inspection.
 *  2. Invalid input never reaches Prisma — Zod parses first, so a malformed
 *     date is a field error on the form rather than a 500 from the driver.
 *  3. Failure is a value, not a crash — the form re-renders intact, and the
 *     raw error stays in the server log where it cannot leak the schema.
 */

/**
 * `redirect()` and `notFound()` signal by throwing a tagged error, so a
 * blanket catch would silently break navigation. Detected by digest rather
 * than by importing from `next/dist/...`, which moves between versions.
 */
function isFrameworkSignal(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false
  }
  const digest = (error as { digest: unknown }).digest
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") ||
      digest === "NEXT_NOT_FOUND" ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  )
}

/** First message per field, keyed by dotted path, for inline form errors. */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form"
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

const GENERIC_FAILURE = "Something went wrong. Nothing was saved."
const INVALID_INPUT = "Check the highlighted fields."

/** Authenticated mutation. The handler receives validated input and the user. */
export function action<TSchema extends z.ZodType, TOut>(
  schema: TSchema,
  handler: (input: z.output<TSchema>, user: User) => Promise<TOut>,
) {
  return async (raw: unknown): Promise<ActionResult<TOut>> => {
    const user = await requireUser()

    const parsed = schema.safeParse(raw)
    if (!parsed.success) return fail(INVALID_INPUT, fieldErrors(parsed.error))

    try {
      return ok(await handler(parsed.data, user))
    } catch (error) {
      if (isFrameworkSignal(error)) throw error
      // A business-rule rejection is expected, not a fault: turn it back into
      // a value without logging it as an error.
      if (error instanceof Rejected) return fail(error.message, error.fields)
      console.error("[action]", error)
      return fail(GENERIC_FAILURE)
    }
  }
}

/**
 * Unauthenticated mutation — sign-up and sign-in only. Same validation and
 * error shaping, minus the user. Nothing else may use this.
 */
export function guestAction<TSchema extends z.ZodType, TOut>(
  schema: TSchema,
  handler: (input: z.output<TSchema>) => Promise<ActionResult<TOut>>,
) {
  return async (raw: unknown): Promise<ActionResult<TOut>> => {
    const parsed = schema.safeParse(raw)
    if (!parsed.success) return fail(INVALID_INPUT, fieldErrors(parsed.error))

    try {
      return await handler(parsed.data)
    } catch (error) {
      if (isFrameworkSignal(error)) throw error
      if (error instanceof Rejected) return fail(error.message, error.fields)
      console.error("[guestAction]", error)
      return fail(GENERIC_FAILURE)
    }
  }
}
