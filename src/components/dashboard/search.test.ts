import { describe, expect, it } from 'vitest'
import { filterByQuery } from './search'
import type { ProposalSummary } from '#/lib/analytics/summaries'

// Only the two searched fields matter here; the rest is filler so the shape is
// a real ProposalSummary without the tests depending on any of it.
function proposal(clientName: string, title: string): ProposalSummary {
  return {
    id: `${clientName}-${title}`,
    title,
    clientName,
    status: 'sent',
    pageCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    dealValueCents: null,
    currency: 'USD',
    outcomeAt: null,
    qualifiedVisits: 0,
    distinctViewers: 0,
    totalEngagedMs: 0,
    pricingEngagedMs: 0,
    hasPricingPage: false,
    lastViewedAt: null,
    shareUrl: null,
    folderId: null,
    intent: { score: 0, band: 'cold', signals: [] },
  }
}

const acme = proposal('Acme Studio', 'Brand refresh')
const northwind = proposal('Northwind Traders', 'Website redesign')
const pinecrest = proposal('Pinecrest Dental', 'Brand identity — Q3')
const all = [acme, northwind, pinecrest]

const names = (list: Array<ProposalSummary>) => list.map((p) => p.clientName)

describe('filterByQuery', () => {
  it('returns everything for an empty or whitespace-only query', () => {
    expect(filterByQuery(all, '')).toEqual(all)
    expect(filterByQuery(all, '   ')).toEqual(all)
  })

  it('matches the client name and the title', () => {
    expect(names(filterByQuery(all, 'northwind'))).toEqual([
      'Northwind Traders',
    ])
    expect(names(filterByQuery(all, 'redesign'))).toEqual(['Northwind Traders'])
  })

  it('ignores case and surrounding whitespace', () => {
    expect(names(filterByQuery(all, '  ACME  '))).toEqual(['Acme Studio'])
  })

  it('matches a partial word, so results narrow while still typing', () => {
    expect(names(filterByQuery(all, 'pine'))).toEqual(['Pinecrest Dental'])
  })

  it('requires every term but not in order or adjacent', () => {
    expect(names(filterByQuery(all, 'brand acme'))).toEqual(['Acme Studio'])
    // "brand" alone spans two proposals; the second term narrows it to one.
    expect(names(filterByQuery(all, 'brand'))).toEqual([
      'Acme Studio',
      'Pinecrest Dental',
    ])
  })

  it('returns nothing when one term of several misses', () => {
    expect(filterByQuery(all, 'acme website')).toEqual([])
  })

  it('preserves the incoming order so the caller still controls sorting', () => {
    expect(names(filterByQuery(all, 'a'))).toEqual(names(all))
  })
})
