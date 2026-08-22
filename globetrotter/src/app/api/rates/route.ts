import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { currentUser } from "@/lib/guard"
import { CURRENCY_CODES } from "@/lib/money"
import { getRate, isCurrencyProviderConfigured } from "@/lib/providers/currency"

/**
 * Exchange rates for the expense form.
 *
 * Always answers 200 with a usable rate. A missing key or an unreachable
 * vendor is an expected state, reported as `source: "fallback"` with a reason
 * the UI shows verbatim — not an error the form has to handle.
 */

const Query = z.object({
  from: z.enum(CURRENCY_CODES as [string, ...string[]]),
  to: z.enum(CURRENCY_CODES as [string, ...string[]]),
})

export async function GET(request: NextRequest) {
  const user = await currentUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in to load rates." }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const parsed = Query.safeParse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Unknown currency.",
        supported: CURRENCY_CODES,
      },
      { status: 400 },
    )
  }

  const result = await getRate(parsed.data.from, parsed.data.to)

  return NextResponse.json(
    {
      ...result.data,
      source: result.source,
      reason: result.reason ?? null,
      providerConfigured: isCurrencyProviderConfigured(),
    },
    {
      headers: {
        // Matches the adapter's own cache window.
        "Cache-Control": "private, max-age=3600",
      },
    },
  )
}
