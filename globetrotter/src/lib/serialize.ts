import { Prisma } from "@prisma/client"

/**
 * The Server -> Client boundary.
 *
 * `Prisma.Decimal` and `Date` are class instances, and React throws
 * "Only plain objects can be passed to Client Components" when either one
 * crosses. Everything a client component receives goes through here first,
 * so Prisma types stay on the server and the wire carries plain data.
 */

/** Decimal | null -> number. Null and undefined both become 0. */
export function money(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : value.toNumber()
}

/** Decimal | null -> number | null, where absent genuinely means "unset". */
export function moneyOrNull(
  value: Prisma.Decimal | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null
  return typeof value === "number" ? value : value.toNumber()
}

export const formatMoney = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
