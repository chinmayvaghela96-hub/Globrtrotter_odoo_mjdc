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

/**
 * How a handler rejects on a business rule — a stop dated outside its trip,
 * an activity that does not belong to the stop's city.
 *
 * A handler cannot express this by *returning* `fail(...)`, because the
 * wrapper's job is to wrap whatever the handler returns in `ok(...)`; a
 * returned failure would come back as `{ ok: true, data: { ok: false } }` and
 * the form would treat a rejection as a success. Throwing is unambiguous, and
 * `action()` converts it straight back into a value — so callers still never
 * see an exception.
 */
export class Rejected extends Error {
  readonly fields?: Record<string, string>

  constructor(message: string, fields?: Record<string, string>) {
    super(message)
    this.name = "Rejected"
    this.fields = fields
  }
}

/** Rejects with a message attached to one form field. */
export function rejectField(field: string, message: string): never {
  throw new Rejected("Check the highlighted fields.", { [field]: message })
}
