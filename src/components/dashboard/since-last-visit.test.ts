import { describe, expect, it } from 'vitest'
import { diffSince, sinceLabel, snapshotOf } from './since-last-visit'
import type { Snapshot } from './since-last-visit'
import type { ProposalSummary } from '#/lib/analytics/summaries'

function proposal(
  id: string,
  qualifiedVisits: number,
  distinctViewers: number,
): ProposalSummary {
  return {
    id,
    title: 't',
    clientName: 'c',
    status: 'sent',
    pageCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    dealValueCents: null,
    currency: 'USD',
    outcomeAt: null,
    qualifiedVisits,
    distinctViewers,
    totalEngagedMs: 0,
    pricingEngagedMs: 0,
    lastViewedAt: null,
    shareUrl: null,
    folderId: null,
    intent: { score: 0, band: 'cold', signals: [] },
  }
}

const snapshot = (byId: Snapshot['byId']): Snapshot => ({
  at: '2026-01-01T00:00:00.000Z',
  byId,
})

describe('diffSince', () => {
  it('reports nothing on a first-ever visit', () => {
    expect(diffSince(null, [proposal('a', 5, 2)]).size).toBe(0)
  })

  it('reports new opens and readers against the baseline', () => {
    const deltas = diffSince(snapshot({ a: { visits: 2, viewers: 1 } }), [
      proposal('a', 5, 3),
    ])
    expect(deltas.get('a')).toEqual({ opens: 3, readers: 2 })
  })

  it('stays silent when nothing moved', () => {
    const deltas = diffSince(snapshot({ a: { visits: 5, viewers: 2 } }), [
      proposal('a', 5, 2),
    ])
    expect(deltas.size).toBe(0)
  })

  it('skips proposals created since the snapshot — they are not news', () => {
    const deltas = diffSince(snapshot({ a: { visits: 1, viewers: 1 } }), [
      proposal('a', 1, 1),
      proposal('brand-new', 4, 2),
    ])
    expect(deltas.size).toBe(0)
  })

  it('never reports a negative as news if a counter goes backwards', () => {
    const deltas = diffSince(snapshot({ a: { visits: 9, viewers: 9 } }), [
      proposal('a', 2, 1),
    ])
    expect(deltas.size).toBe(0)
  })

  it('round-trips through a snapshot of the same data as no news', () => {
    const list = [proposal('a', 3, 2), proposal('b', 1, 1)]
    expect(diffSince(snapshotOf(list), list).size).toBe(0)
  })
})

describe('sinceLabel', () => {
  const at = new Date('2026-03-10T12:00:00.000Z')
  const after = (ms: number) => sinceLabel(at.toISOString(), at.getTime() + ms)
  const HOUR = 3_600_000
  const DAY = 24 * HOUR

  it('avoids a bogus time for a visit minutes ago', () => {
    expect(after(5 * 60_000)).toBe('since you last looked')
  })

  it('counts hours within the day', () => {
    expect(after(5 * HOUR)).toBe('since 5h ago')
  })

  it('says yesterday rather than "24h ago"', () => {
    expect(after(30 * HOUR)).toBe('since yesterday')
  })

  it('names the weekday within the week', () => {
    expect(after(4 * DAY)).toMatch(/^since \w+day$/)
  })

  it('falls back to a date beyond a week', () => {
    expect(after(30 * DAY)).toMatch(/^since \w{3} \d+$/)
  })
})
