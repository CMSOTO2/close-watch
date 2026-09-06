import { PRICING_PAGES, SAMPLE_PAGE_COUNT } from './sample'
import { PAGE_READ_MS } from '#/constants'
import type { Flush } from '#/lib/analytics/tracker'
import type { IntentInput } from '#/lib/analytics/intent'

/**
 * The demo's running total, fed by the real tracker's flushes.
 *
 * Kept as a plain accumulator with no React in it so the arithmetic that ends
 * up on screen can be tested. The scoring itself is not reimplemented here —
 * this only shapes what `scoreIntent` already expects, so the number the demo
 * shows is produced by the same function the dashboard uses.
 */

export type DemoRead = {
  engagedMs: number
  /** Milliseconds per page number. */
  pageMs: Record<number, number>
  downloaded: boolean
  printed: boolean
}

export const EMPTY_READ: DemoRead = {
  engagedMs: 0,
  pageMs: {},
  downloaded: false,
  printed: false,
}

export function applyFlush(read: DemoRead, flush: Flush): DemoRead {
  const pageMs = { ...read.pageMs }
  for (const { page, ms } of flush.pages) {
    pageMs[page] = (pageMs[page] ?? 0) + ms
  }
  // Downloads and prints ride in on the same flush the tracker already sends
  // for them, so the demo learns about them the way the server does.
  return {
    engagedMs: read.engagedMs + flush.engagedMs,
    pageMs,
    downloaded:
      read.downloaded || flush.events.some((e) => e.type === 'download'),
    printed: read.printed || flush.events.some((e) => e.type === 'print'),
  }
}

export function pricingMs(read: DemoRead): number {
  return PRICING_PAGES.reduce((sum, page) => sum + (read.pageMs[page] ?? 0), 0)
}

/**
 * Pages the reader actually stayed on, not pages that crossed the screen.
 *
 * Any nonzero time used to count, and that is how this reported five pages of
 * six to someone who read two: revealing the report scrolls the phone layout
 * past the rest of the document to reach it, and every page swept on the way
 * collected a tick. The threshold is the same one the server uses to decide a
 * visit was a person at all.
 */
export function pagesRead(read: DemoRead): number {
  return Object.values(read.pageMs).filter((ms) => ms >= PAGE_READ_MS).length
}

export function reachedLastPage(read: DemoRead): boolean {
  return (read.pageMs[SAMPLE_PAGE_COUNT] ?? 0) >= PAGE_READ_MS
}

/**
 * One visitor, one sitting — so one visit and one viewer, and no gap between
 * first and last. The demo does not pretend to a forward or a return it did
 * not see; those signals are worth more than everything here put together, and
 * inventing them is exactly the dishonesty the product is selling against.
 */
export function toIntentInput(
  read: DemoRead,
  now: Date = new Date(),
  /**
   * Set only by the "what a forward would add" preview, which is labelled as a
   * projection on screen. Nothing the visitor actually did produces it.
   */
  forwarded = false,
): IntentInput {
  return {
    pageCount: SAMPLE_PAGE_COUNT,
    qualifiedVisits: read.engagedMs > 0 ? 1 : 0,
    distinctViewers: read.engagedMs > 0 ? (forwarded ? 2 : 1) : 0,
    totalEngagedMs: read.engagedMs,
    pricingEngagedMs: pricingMs(read),
    reachedLastPage: reachedLastPage(read),
    firstVisitAt: now,
    lastVisitAt: now,
    downloaded: read.downloaded,
    printed: read.printed,
  }
}
