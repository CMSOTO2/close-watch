import { describe, expect, it } from 'vitest'
import { intentInputFor } from './intent-input'
import type { IntentVisit } from './intent-input'

const read = (id: string, visitor: string, startedAt: string): IntentVisit => ({
  id,
  visitor_id: visitor,
  engaged_ms: 60_000,
  started_at: startedAt,
})

const none = new Set<number>()

describe('intentInputFor', () => {
  it('holds page time and events to the visits it is given', () => {
    // "bot" is a visit that is not in the qualified list: a scanner that ran
    // the tracker, or a glance under three seconds. Nothing it did may count.
    const input = intentInputFor({
      pageCount: 5,
      visits: [read('q1', 'sarah', '2026-09-01T09:00:00Z')],
      pageViews: [
        { visit_id: 'q1', page_number: 4, engaged_ms: 20_000 },
        { visit_id: 'bot', page_number: 4, engaged_ms: 90_000 },
        { visit_id: 'bot', page_number: 5, engaged_ms: 9_000 },
      ],
      events: [{ visit_id: 'bot', type: 'download' }],
      pricingPages: new Set([4]),
    })
    expect(input.pricingEngagedMs).toBe(20_000)
    expect(input.reachedLastPage).toBe(false)
    expect(input.downloaded).toBe(false)
  })

  it('needs three seconds on the last page, summed across visits', () => {
    const visits = [
      read('a', 'sarah', '2026-09-01T09:00:00Z'),
      read('b', 'sarah', '2026-09-02T09:00:00Z'),
    ]
    const lastPage = (msEach: number) =>
      intentInputFor({
        pageCount: 5,
        visits,
        pageViews: [
          { visit_id: 'a', page_number: 5, engaged_ms: msEach },
          { visit_id: 'b', page_number: 5, engaged_ms: msEach },
        ],
        events: [],
        pricingPages: none,
      }).reachedLastPage
    expect(lastPage(1_500)).toBe(true)
    expect(lastPage(1_400)).toBe(false)
  })

  it('counts readers and the span between the first and last visit', () => {
    const input = intentInputFor({
      pageCount: 5,
      visits: [
        read('a', 'sarah', '2026-09-02T09:00:00Z'),
        read('b', 'sarah', '2026-09-01T09:00:00Z'),
        read('c', 'cfo', '2026-09-03T09:00:00Z'),
      ],
      pageViews: [],
      events: [{ visit_id: 'c', type: 'print' }],
      pricingPages: none,
    })
    expect(input.qualifiedVisits).toBe(3)
    expect(input.distinctViewers).toBe(2)
    expect(input.totalEngagedMs).toBe(180_000)
    expect(input.firstVisitAt?.toISOString()).toBe('2026-09-01T09:00:00.000Z')
    expect(input.lastVisitAt?.toISOString()).toBe('2026-09-03T09:00:00.000Z')
    expect(input.printed).toBe(true)
  })
})
