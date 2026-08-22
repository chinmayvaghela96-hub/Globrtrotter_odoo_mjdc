/**
 * Where it is safe to send someone after they sign in.
 *
 * The middleware records the page an anonymous visitor was trying to reach as
 * `?next=/trips/abc`, and the sign-in form sends it back. That value is
 * attacker-controlled — anyone can hand out a link with `?next=` pointing
 * anywhere — so it can never be used as a redirect target unchecked. A link
 * like `/login?next=https://evil.example/harvest` would otherwise turn our own
 * login page into a convincing hop to somebody else's.
 *
 * Only a path on this site is allowed through; everything else silently falls
 * back to the dashboard. Covered by `tests/safe-redirect.test.ts`.
 */

export const DEFAULT_REDIRECT = "/dashboard"

/** Paths that would bounce the user straight back out again. */
const NEVER_RETURN_TO = ["/login", "/signup", "/forgot-password"]

/**
 * Whitespace, control characters and backslashes. Browsers strip or rewrite
 * these, which can turn an apparently local path into a foreign one. A genuine
 * path carries them percent-encoded, never literal.
 * Written as a loop rather than a character class: a range like the one this
 * replaced is easy to get subtly wrong, and being wrong here is a security
 * bug.
 */
function hasUnsafeCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code <= 0x20) return true // control characters and space
    if (code === 0x7f) return true // DEL
    if (character === String.fromCharCode(92)) return true // backslash
  }
  return false
}

export function safeRedirect(
  target: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (!target) return fallback

  const value = target.trim()
  if (value === "") return fallback

  // Must be a site-relative path.
  if (!value.startsWith("/")) return fallback

  // `//evil.example` is a protocol-relative URL: the browser reads it as
  // another origin even though it starts with a slash.
  if (value.startsWith("//")) return fallback

  if (hasUnsafeCharacter(value)) return fallback

  // Refuse anything that still parses as absolute once decoded.
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return fallback // malformed percent-encoding
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return fallback
  if (decoded.startsWith("//") || decoded.includes("\\")) return fallback

  // Sending someone back to the page they just left is a loop.
  const path = value.split(/[?#]/)[0]
  if (NEVER_RETURN_TO.includes(path)) return fallback

  return value
}
