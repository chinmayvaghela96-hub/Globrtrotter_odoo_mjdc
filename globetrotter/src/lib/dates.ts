/**
 * Every date in this app is a calendar day, never an instant.
 *
 * `@db.Date` stores no time and no zone. Building a Date with
 * `new Date(2026, 8, 1)` at UTC+5:30 produces 2026-08-31T18:30:00Z, which
 * Postgres then truncates to 2026-08-31 — a trip that starts a day early.
 * Every construction and every read goes through these helpers instead.
 */

const DAY_MS = 86_400_000
const pad = (n: number) => String(n).padStart(2, "0")

/** "2026-09-01" -> UTC-midnight Date. Throws on a malformed input. */
export function parseDateUTC(input: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
  if (!m) throw new Error(`Expected YYYY-MM-DD, received "${input}"`)
  const [, y, mo, d] = m
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)))
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date "${input}"`)
  return date
}

/** UTC-midnight Date -> "2026-09-01". Safe to send to a client component. */
export function formatDateUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** Inclusive day count: same day = 1. */
export function dayCountUTC(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1)
}

export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/** Every calendar day from start to end, inclusive. */
export function eachDayUTC(start: Date, end: Date): Date[] {
  const out: Date[] = []
  for (let i = 0; i < dayCountUTC(start, end); i++) out.push(addDaysUTC(start, i))
  return out
}

/** Human label for headers: "Tue, 1 Sep". Formatted in UTC, deliberately. */
export function labelDateUTC(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}
