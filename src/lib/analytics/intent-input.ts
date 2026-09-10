import { PAGE_READ_MS } from '#/constants'
import type { IntentInput } from './intent'

export type IntentVisit = {
  id: string
  visitor_id: string
  engaged_ms: number
  started_at: string
}
export type IntentPageView = {
  visit_id: string
  page_number: number
  engaged_ms: number
}
export type IntentEvent = { visit_id: string; type: string }

/**
 * One proposal's rows, turned into what `scoreIntent` reads.
 *
 * Shared by the dashboard and the activity emails so the two cannot disagree
 * about a number: an email saying "hot" about a proposal the dashboard shows as
 * warm would cost more trust than either is worth.
 *
 * `visits` must already be the qualified, human ones. Page views and events are
 * held to those visits here rather than trusted to the caller, so time a
 * scanner or a sub-three-second glance put on the pricing page never reaches
 * the score. Passing every page view on the proposal is fine.
 */
export function intentInputFor({
  pageCount,
  visits,
  pageViews,
  events,
  pricingPages,
}: {
  pageCount: number
  visits: ReadonlyArray<IntentVisit>
  pageViews: ReadonlyArray<IntentPageView>
  events: ReadonlyArray<IntentEvent>
  /** Page numbers tagged pricing on this proposal. */
  pricingPages: ReadonlySet<number>
}): IntentInput {
  const ids = new Set(visits.map((v) => v.id))
  const ownPages = pageViews.filter((pv) => ids.has(pv.visit_id))
  const ownEvents = events.filter((e) => ids.has(e.visit_id))
  const starts = visits.map((v) => new Date(v.started_at).getTime())
  const msOn = (keep: (page: number) => boolean) =>
    ownPages
      .filter((pv) => keep(pv.page_number))
      .reduce((sum, pv) => sum + pv.engaged_ms, 0)

  return {
    pageCount,
    qualifiedVisits: visits.length,
    distinctViewers: new Set(visits.map((v) => v.visitor_id)).size,
    totalEngagedMs: visits.reduce((sum, v) => sum + v.engaged_ms, 0),
    pricingEngagedMs: msOn((page) => pricingPages.has(page)),
    // Summed across visits and held to PAGE_READ_MS, not merely "a row exists
    // for the last page". A row is written for any page that held a tenth of
    // the window for a single tick, so scrolling to the bottom of a document
    // wrote one for every page on the way and handed this signal its 8 points
    // for a scroll.
    reachedLastPage: msOn((page) => page === pageCount) >= PAGE_READ_MS,
    firstVisitAt: starts.length ? new Date(Math.min(...starts)) : null,
    lastVisitAt: starts.length ? new Date(Math.max(...starts)) : null,
    downloaded: ownEvents.some((e) => e.type === 'download'),
    printed: ownEvents.some((e) => e.type === 'print'),
  }
}
