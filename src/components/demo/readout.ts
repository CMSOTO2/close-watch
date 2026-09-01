import { PRICING_PAGES, SAMPLE_PAGE_COUNT } from './sample'
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
}

export const EMPTY_READ: DemoRead = { engagedMs: 0, pageMs: {} }

export function applyFlush(read: DemoRead, flush: Flush): DemoRead {
  const pageMs = { ...read.pageMs }
  for (const { page, ms } of flush.pages) {
    pageMs[page] = (pageMs[page] ?? 0) + ms
  }
  return { engagedMs: read.engagedMs + flush.engagedMs, pageMs }
}

export function pricingMs(read: DemoRead): number {
  return PRICING_PAGES.reduce((sum, page) => sum + (read.pageMs[page] ?? 0), 0)
}

/** Pages that got any attention at all, which is what "read" means here. */
export function pagesSeen(read: DemoRead): number {
  return Object.values(read.pageMs).filter((ms) => ms > 0).length
}

export function reachedLastPage(read: DemoRead): boolean {
  return (read.pageMs[SAMPLE_PAGE_COUNT] ?? 0) > 0
}

/**
 * One visitor, one sitting — so one visit and one viewer, and no gap between
 * first and last. The demo does not pretend to a forward or a return it did
 * not see; those signals are worth more than everything here put together, and
 * inventing them is exactly the dishonesty the product is selling against.
 */
export function toIntentInput(read: DemoRead, now: Date = new Date()): IntentInput {
  return {
    pageCount: SAMPLE_PAGE_COUNT,
    qualifiedVisits: read.engagedMs > 0 ? 1 : 0,
    distinctViewers: read.engagedMs > 0 ? 1 : 0,
    totalEngagedMs: read.engagedMs,
    pricingEngagedMs: pricingMs(read),
    reachedLastPage: reachedLastPage(read),
    firstVisitAt: now,
    lastVisitAt: now,
    downloaded: false,
    printed: false,
  }
}
