/**
 * Carrying "where I was going" through sign-in.
 *
 * Someone who clicks Choose Solo has told you what they want. Dropping them on
 * the dashboard afterwards throws that away and asks them to find Settings on
 * their own, which is a strange thing to do to the one visitor who was reaching
 * for their card.
 *
 * The destination travels in a short-lived cookie rather than in the query
 * string of the Supabase redirect URL, which is the obvious design and the
 * wrong one. Supabase only honours a redirect target that matches its allow
 * list; a project that has allow-listed the bare callback URL silently falls
 * back to the Site URL when a query string appears, and the fallback does not
 * carry the code, so sign-in breaks entirely rather than merely landing in the
 * wrong place. A cookie needs no dashboard configuration and cannot fail that
 * way. A `next` query parameter is still read if one shows up, because it costs
 * one line and makes the callback testable by hand.
 *
 * The trade is that a magic link opened on a different device than the one that
 * requested it has no cookie, and lands on the dashboard. That is the right
 * thing to lose: the alternative is putting a redirect target in an email,
 * where it lives forever in somebody's inbox.
 */

/** Where sign-in goes when nothing better is known. */
export const AFTER_SIGN_IN = '/dashboard'

export const NEXT_COOKIE = 'cw_next'

/** Long enough to read an email, short enough not to linger. */
const MAX_AGE_SECONDS = 15 * 60

/** Everything `\s` covers: tabs, newlines, NBSP, the Unicode spaces, BOM. */
const WHITESPACE = /\s/

/**
 * Whitespace or a control character anywhere in the string.
 *
 * Split from the regex it used to be because `\s` misses most of the C0 range
 * and writing the range into a character class means putting literal control
 * characters in source — invisible in an editor, which is how they survive
 * review, and a lint error for exactly that reason. Code points are legible.
 *
 * Neither belongs in a redirect target. A newline is how you smuggle a second
 * header past something that only checks the first line of one.
 */
function hasUnsafeChar(value: string): boolean {
  if (WHITESPACE.test(value)) return true

  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    // C0 controls, DEL, and the C1 range above it.
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true
  }
  return false
}

/**
 * Reduces anything claiming to be a destination to one we are willing to use.
 *
 * This is the security boundary, so it is an allow-shaped check rather than a
 * list of things to strip. The value arrives from a cookie or a URL, which is
 * to say from whoever is holding the browser:
 *
 * - it has to be a path on this origin, so `https://evil.example` is out and so
 *   is anything carrying a scheme;
 * - `//evil.example` and `/\evil.example` are protocol-relative URLs that
 *   browsers resolve off-origin, which is the classic open redirect, so a
 *   second leading slash or a leading backslash is out;
 * - control characters and whitespace are out, because they are only ever
 *   there to smuggle something past a check like this one;
 * - `/login` is out, because sending someone from sign-in back to sign-in is a
 *   loop rather than an attack.
 *
 * Returns null when there is nothing usable, so callers decide what the default
 * is rather than having it baked in here.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const next = value.trim()
  if (next.length === 0 || next.length > 512) return null
  if (!next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\')) return null
  if (hasUnsafeChar(next)) return null
  if (next === '/login' || next.startsWith('/login?')) return null

  return next
}

/**
 * Writes the destination down before a flow that leaves the page.
 *
 * Lax rather than Strict: the browser comes back to the callback as a top-level
 * navigation from an email client or from Google, and Strict would withhold the
 * cookie on exactly that hop, which is the only hop it exists for.
 */
export function rememberNext(next: string | null | undefined): void {
  if (typeof document === 'undefined') return

  const safe = safeNext(next)
  if (!safe) return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

/** Pulls the destination back out of a request's Cookie header. */
export function readNextCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name !== NEXT_COOKIE) continue
    try {
      return safeNext(decodeURIComponent(rest.join('=')))
    } catch {
      // A malformed percent-encoding is not a destination.
      return null
    }
  }
  return null
}

/**
 * The Set-Cookie that clears it.
 *
 * Sent on the way out of the callback whether or not the cookie was used: it
 * has done its job by then, and one left behind would send the next sign-in
 * somewhere nobody asked for.
 */
export function expiredNextCookie(): string {
  return `${NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}
