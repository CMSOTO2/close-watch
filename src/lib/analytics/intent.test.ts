import { describe, expect, it } from 'vitest'
import { formatDuration, scoreIntent } from './intent'
import type { IntentInput } from './intent'

// A neutral baseline: opened once, read for a moment, no other signal. Each
// test overrides only the fields it is about, so the arithmetic under test is
// never entangled with unrelated signals.
const base: IntentInput = {
  pageCount: 10,
  qualifiedVisits: 1,
  distinctViewers: 1,
  totalEngagedMs: 2_000,
  pricingEngagedMs: 0,
  reachedLastPage: false,
  firstVisitAt: null,
  lastVisitAt: null,
}

describe('scoreIntent', () => {
  it('reports an unopened proposal as cold with a single plain reason', () => {
    const r = scoreIntent({ ...base, qualifiedVisits: 0 })
    expect(r.score).toBe(0)
    expect(r.band).toBe('cold')
    expect(r.signals).toEqual([{ label: 'Not opened yet', points: 0 }])
  })

  it('scores a single glance as cold with no manufactured signals', () => {
    const r = scoreIntent(base)
    expect(r.score).toBe(0)
    expect(r.band).toBe('cold')
    expect(r.signals).toEqual([])
  })

  it('adds a signal when the link is forwarded to a colleague', () => {
    const r = scoreIntent({ ...base, distinctViewers: 2 })
    expect(r.signals).toContainEqual({ label: 'Forwarded to someone else', points: 18 })
  })

  it('normalises read depth by document length', () => {
    // 300s over 5 pages is 60s/page: read closely. The same 300s over 60 pages
    // is 5s/page and earns nothing. Length must not decide intent.
    const shallowOverLong = scoreIntent({ ...base, pageCount: 60, totalEngagedMs: 300_000 })
    const deepOverShort = scoreIntent({ ...base, pageCount: 5, totalEngagedMs: 300_000 })
    expect(shallowOverLong.signals.some((s) => /per page|whole thing/.test(s.label))).toBe(false)
    expect(deepOverShort.signals).toContainEqual({ label: 'Read closely (60s per page)', points: 20 })
  })

  it('rewards taking the proposal offline, printing above downloading', () => {
    const printed = scoreIntent({ ...base, printed: true })
    const downloaded = scoreIntent({ ...base, downloaded: true })
    expect(printed.signals).toContainEqual({ label: 'Printed it', points: 18 })
    expect(downloaded.signals).toContainEqual({ label: 'Downloaded a copy', points: 15 })
    expect(printed.score).toBeGreaterThan(downloaded.score)
  })

  it('sums signals into a warm band with the reasons attached', () => {
    // Opened 3 times (15) + 40s on pricing (18) = 33 -> warm.
    const r = scoreIntent({ ...base, qualifiedVisits: 3, pricingEngagedMs: 40_000 })
    expect(r.score).toBe(33)
    expect(r.band).toBe('warm')
    expect(r.signals.map((s) => s.label)).toEqual(
      expect.arrayContaining(['Opened 3 times', '40s on pricing']),
    )
  })

  it('reaches the hot band and never scores above 100', () => {
    const r = scoreIntent({
      pageCount: 5,
      qualifiedVisits: 4,
      distinctViewers: 3,
      totalEngagedMs: 300_000,
      pricingEngagedMs: 120_000,
      reachedLastPage: true,
      firstVisitAt: new Date('2026-01-01T09:00:00Z'),
      lastVisitAt: new Date('2026-01-03T09:00:00Z'),
    })
    expect(r.band).toBe('hot')
    expect(r.score).toBe(100)
  })

  it('returns signals sorted strongest first', () => {
    const r = scoreIntent({ ...base, qualifiedVisits: 2, distinctViewers: 2, pricingEngagedMs: 120_000 })
    const points = r.signals.map((s) => s.points)
    expect(points).toEqual([...points].sort((a, b) => b - a))
  })
})

describe('formatDuration', () => {
  it('formats seconds, whole minutes, and mixed durations', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(60)).toBe('1m')
    expect(formatDuration(125)).toBe('2m 5s')
  })
})
