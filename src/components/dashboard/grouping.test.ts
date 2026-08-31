import { describe, expect, it } from 'vitest'
import { clientKey, groupByClient } from './grouping'
import type { ProposalSummary } from '#/lib/analytics/summaries'

function proposal(
  id: string,
  clientName: string,
  score: number,
): ProposalSummary {
  return {
    id,
    title: `${id} title`,
    clientName,
    status: 'sent',
    pageCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    dealValueCents: 1000,
    currency: 'USD',
    outcomeAt: null,
    qualifiedVisits: 0,
    distinctViewers: 0,
    totalEngagedMs: 0,
    pricingEngagedMs: 0,
    lastViewedAt: null,
    shareUrl: null,
    intent: {
      score,
      band: score >= 65 ? 'hot' : score >= 30 ? 'warm' : 'cold',
      signals: [],
    },
  }
}

describe('clientKey', () => {
  it('ignores case and stray whitespace', () => {
    expect(clientKey('  Acme Studio ')).toBe(clientKey('acme   studio'))
  })

  it('keeps genuinely different names apart rather than guessing', () => {
    expect(clientKey('Los')).not.toBe(clientKey('Los Studios'))
  })
})

describe('groupByClient', () => {
  it('leaves a client with one proposal as a plain row', () => {
    const entries = groupByClient([proposal('a', 'Acme', 10)])
    expect(entries).toEqual([
      { kind: 'single', proposal: expect.objectContaining({ id: 'a' }) },
    ])
  })

  it('groups repeat clients and keeps one-offs inline', () => {
    const entries = groupByClient([
      proposal('a1', 'Acme', 90),
      proposal('n1', 'Northwind', 50),
      proposal('a2', 'acme', 20),
    ])
    expect(entries.map((e) => e.kind)).toEqual(['group', 'single'])
    const group = entries[0]
    if (group.kind !== 'group') throw new Error('expected a group')
    expect(group.proposals.map((p) => p.id)).toEqual(['a1', 'a2'])
  })

  it('places a group at its best-ranked member and keeps the incoming order', () => {
    // Sorted hottest-first: Northwind leads, so it must stay above the Acme group.
    const entries = groupByClient([
      proposal('n1', 'Northwind', 95),
      proposal('a1', 'Acme', 80),
      proposal('a2', 'Acme', 10),
    ])
    expect(entries[0]).toMatchObject({ kind: 'single' })
    expect(entries[1]).toMatchObject({ kind: 'group', clientName: 'Acme' })
  })

  it('names the group after its best-ranked member spelling', () => {
    const entries = groupByClient([
      proposal('a1', 'ACME Studio', 90),
      proposal('a2', 'acme studio', 10),
    ])
    expect(entries[0]).toMatchObject({ clientName: 'ACME Studio' })
  })

  it('returns nothing for an empty list', () => {
    expect(groupByClient([])).toEqual([])
  })
})
