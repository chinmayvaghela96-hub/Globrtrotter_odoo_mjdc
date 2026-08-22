/**
 * The single shape every server action returns.
 *
 * Actions never throw at the caller — they return a value the form can
 * render. This is what makes failure demonstrable: we can show the unhappy
 * path on purpose, and the user never sees a stack trace or a raw Prisma
 * message (which would leak the schema).
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string> }

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })

export const fail = (
  error: string,
  fields?: Record<string, string>,
): ActionResult<never> => ({ ok: false, error, fields })
