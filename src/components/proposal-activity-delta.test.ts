import { describe, expect, it } from 'vitest'
import { diffSince, snapshotOf } from './proposal-activity-delta'
import type { ActivitySnapshot } from './proposal-activity-delta'
import type { ProposalAnalytics } from '#/lib/analytics/proposal-analytics'

type Totals = ProposalAnalytics['totals']

const totals = (over: Partial<Totals> = {}): Totals => ({
  qualifiedVisits: 4,
  distinctViewers: 2,
  totalEngagedMs: 120_000,
  firstOpenedAt: '2026-08-30T10:00:00.000Z',
  lastOpenedAt: '2026-08-31T10:00:00.000Z',
  botVisits: 1,
  downloads: 1,
  prints: 0,
  ...over,
})

const snap = (over: Partial<ActivitySnapshot> = {}): ActivitySnapshot => ({
  at: '2026-08-30T09:00:00.000Z',
  opens: 4,
  viewers: 2,
  engagedMs: 120_000,
  downloads: 1,
  prints: 0,
  ...over,
})

describe('diffSince', () => {
  it('reports nothing on a first visit, when there is no baseline', () => {
    expect(diffSince(null, totals())).toBeNull()
  })

  it('reports nothing when the counters have not moved', () => {
    expect(diffSince(snap(), totals())).toBeNull()
  })

  it('reports what moved', () => {
    const delta = diffSince(snap(), totals({ qualifiedVisits: 7, prints: 2 }))
    expect(delta).toEqual({
      opens: 3,
      viewers: 0,
      engagedMs: 0,
      downloads: 0,
      prints: 2,
    })
  })

  it('counts new reading time on its own as news', () => {
    // Someone came back to a proposal they had already opened: no new visit,
    // no new reader, but three more minutes on the page.
    const delta = diffSince(snap(), totals({ totalEngagedMs: 300_000 }))
    expect(delta).toEqual({
      opens: 0,
      viewers: 0,
      engagedMs: 180_000,
      downloads: 0,
      prints: 0,
    })
  })

  // A bot reclassification can take a counter backwards. "1 fewer open than
  // last time" is noise, not news.
  it('never reports a loss', () => {
    expect(diffSince(snap({ opens: 9 }), totals({ qualifiedVisits: 4 }))).toBeNull()
  })

  it('floors a mixed result rather than netting it off', () => {
    const delta = diffSince(
      snap({ opens: 9 }),
      totals({ qualifiedVisits: 4, prints: 3 }),
    )
    expect(delta).toEqual({
      opens: 0,
      viewers: 0,
      engagedMs: 0,
      downloads: 0,
      prints: 3,
    })
  })
})

describe('snapshotOf', () => {
  it('round-trips to no news', () => {
    const t = totals()
    expect(diffSince(snapshotOf(t), t)).toBeNull()
  })
})
