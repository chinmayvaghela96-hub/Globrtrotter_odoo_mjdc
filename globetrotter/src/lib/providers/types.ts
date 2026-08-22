/**
 * The shape every external-data adapter returns.
 *
 * An external API being down is an expected state, not an exception. Every
 * adapter therefore resolves — never throws — and says which of the two paths
 * produced the answer, so the UI can label an estimate honestly instead of
 * passing fallback numbers off as live ones.
 */
export type DataSource = "live" | "fallback"

export type ProviderResult<T> = {
  data: T
  source: DataSource
  /** Why the fallback ran. Shown to the user; keep it plain. */
  reason?: string
}

export const live = <T>(data: T): ProviderResult<T> => ({ data, source: "live" })

export const fallback = <T>(data: T, reason: string): ProviderResult<T> => ({
  data,
  source: "fallback",
  reason,
})

/** Every outbound call is bounded — a hanging vendor must not hang a page. */
export const PROVIDER_TIMEOUT_MS = 6000

/**
 * Fetch JSON with a timeout, resolving to null on any failure.
 *
 * Deliberately swallows: callers turn null into their own fallback, and the
 * detail belongs in the server log rather than in a user's face.
 */
export async function fetchJson<T>(
  url: string,
  label: string,
  init?: RequestInit,
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error(`[provider:${label}] responded ${response.status}`)
      return null
    }
    return (await response.json()) as T
  } catch (error) {
    console.error(`[provider:${label}] request failed`, error)
    return null
  }
}
