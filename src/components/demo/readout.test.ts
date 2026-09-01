import { describe, expect, it } from 'vitest'
import {
  EMPTY_READ,
  applyFlush,
  pagesSeen,
  pricingMs,
  reachedLastPage,
  toIntentInput,
} from './readout'
import { scoreIntent } from '#/lib/analytics/intent'
import type { Flush } from '#/lib/analytics/tracker'

const flush = (engagedMs: number, pages: Array<[number, number]>): Flush => ({
  engagedMs,
  pages: pages.map(([page, ms]) => ({ page, ms })),
  events: [],
})

describe('applyFlush', () => {
  it('adds up across flushes, which arrive every ten seconds', () => {
    let read = EMPTY_READ
    read = applyFlush(read, flush(10_000, [[1, 6_000], [2, 4_000]]))
    read = applyFlush(read, flush(8_000, [[2, 3_000], [5, 5_000]]))

    expect(read.engagedMs).toBe(18_000)
    expect(read.pageMs).toEqual({ 1: 6_000, 2: 7_000, 5: 5_000 })
  })

  it('does not mutate the read it was given', () => {
    const read = applyFlush(EMPTY_READ, flush(1_000, [[1, 1_000]]))
    applyFlush(read, flush(1_000, [[1, 1_000]]))
    expect(read.pageMs[1]).toBe(1_000)
  })
})

describe('derived facts', () => {
  const read = applyFlush(
    EMPTY_READ,
    flush(30_000, [[1, 4_000], [5, 20_000], [6, 6_000]]),
  )

  it('reads pricing dwell off the pricing page', () => {
    expect(pricingMs(read)).toBe(20_000)
  })

  it('counts only pages that got attention', () => {
    expect(pagesSeen(read)).toBe(3)
  })

  it('knows whether the last page was reached', () => {
    expect(reachedLastPage(read)).toBe(true)
    expect(reachedLastPage(applyFlush(EMPTY_READ, flush(1_000, [[1, 1_000]])))).toBe(false)
  })
})

describe('toIntentInput', () => {
  it('reports nothing for a visitor who has not read anything yet', () => {
    const input = toIntentInput(EMPTY_READ)
    expect(input.qualifiedVisits).toBe(0)
    // The real scorer's own empty case, reached honestly.
    expect(scoreIntent(input).band).toBe('cold')
  })

  // The demo has one person in one sitting and must not imply otherwise:
  // forwarding and returning are the two highest-scoring signals there are.
  it('never claims a forward or a return', () => {
    const read = applyFlush(EMPTY_READ, flush(120_000, [[5, 120_000]]))
    const input = toIntentInput(read)
    expect(input.distinctViewers).toBe(1)
    expect(input.firstVisitAt).toEqual(input.lastVisitAt)

    const labels = scoreIntent(input).signals.map((s) => s.label)
    expect(labels.some((l) => /forward|shared/i.test(l))).toBe(false)
    expect(labels.some((l) => /came back/i.test(l))).toBe(false)
  })

  it('surfaces real pricing dwell through the real scorer', () => {
    const read = applyFlush(EMPTY_READ, flush(100_000, [[5, 95_000]]))
    const signals = scoreIntent(toIntentInput(read)).signals.map((s) => s.label)
    expect(signals.some((l) => l.includes('on pricing'))).toBe(true)
  })
})
