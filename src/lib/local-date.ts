import { useSyncExternalStore } from 'react'

/**
 * Dates that agree across the server/client boundary.
 *
 * SSR runs in workerd, whose clock is UTC, while the browser is wherever the
 * owner is. `toLocaleDateString(undefined, …)` therefore renders a different
 * day on each side for any timestamp near midnight, and React discards the
 * server tree with a hydration mismatch. Pinning both sides to UTC would stop
 * that, but a deal marked paid at 8pm in Chicago would then read as tomorrow.
 *
 * So both sides format in UTC — matching what the server can actually know —
 * and the client re-renders in the real time zone once hydration is done.
 */

const NEVER_CHANGES = () => () => {}

const browserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const serverTimeZone = () => 'UTC'

/**
 * `useSyncExternalStore` is doing the work here rather than a mount effect:
 * React reads the server snapshot while hydrating and then re-reads the live
 * one, which is exactly the "render what the server could know, then correct
 * it" sequence — without a mismatch, and without a wasted first paint.
 */
export function useTimeZone(): string {
  return useSyncExternalStore(NEVER_CHANGES, browserTimeZone, serverTimeZone)
}

/** "Aug 30, 2026". Locale is pinned too — workerd's ICU need not match Chrome's. */
export function formatDay(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  })
}
