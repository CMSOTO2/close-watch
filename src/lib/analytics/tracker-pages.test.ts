// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startTracker } from './tracker'

/**
 * The tracker's page attribution, driven end to end: fake geometry in, real
 * ticks, and the flush the server would have received read back out.
 *
 * A browser cannot check this from an automated tab — Chrome does not run
 * IntersectionObserver in a backgrounded one, which is exactly the state a
 * driven tab sits in.
 */

let fetchMock: ReturnType<typeof vi.fn>

/** Reports every observed element as on screen the moment it is observed. */
class FakeObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    this.cb(
      [{ target: el, isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  disconnect() {}
}

function page(n: number, top: number, bottom: number): HTMLElement {
  const el = document.createElement('div')
  el.dataset.page = String(n)
  el.getBoundingClientRect = () =>
    ({ top, bottom, height: bottom - top, left: 0, right: 800, width: 800, x: 0, y: top }) as DOMRect
  return el
}

/** Milliseconds flushed for one page, summed across every flush. */
function flushedMs(pageNumber: number): number {
  let total = 0
  for (const call of fetchMock.mock.calls) {
    const body = JSON.parse(call[1].body as string)
    for (const p of body.pages) if (p.page === pageNumber) total += p.ms
  }
  return total
}

function setScroll({ scrollY, scrollHeight }: { scrollY: number; scrollHeight: number }) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
}

beforeEach(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 })
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: vi.fn(() => true) })
  fetchMock = vi.fn(() => Promise.resolve({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('page attribution', () => {
  it('splits a read between the sections sharing the screen', () => {
    vi.useFakeTimers()
    // Mid-document: page 1 holds 60% of the viewport, page 2 holds 40%.
    setScroll({ scrollY: 500, scrollHeight: 5000 })
    const pages = [page(1, 0, 600), page(2, 600, 1000)]
    const tracker = startTracker({
      visitId: 'v1',
      token: 't',
      getPageElements: () => pages,
    })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    const first = flushedMs(1)
    const second = flushedMs(2)
    expect(first).toBeGreaterThan(second)
    // 60/40 of the ten seconds, give or take a tick.
    expect(first / (first + second)).toBeCloseTo(0.6, 1)
    expect(first + second).toBeCloseTo(10_000, -2)
  })

  it('sends whole milliseconds, which is all the ingest schema accepts', () => {
    vi.useFakeTimers()
    setScroll({ scrollY: 500, scrollHeight: 5000 })
    // Three-way split: 1/3 each, which does not divide evenly into a tick.
    const pages = [page(1, 0, 333), page(2, 333, 666), page(3, 666, 999)]
    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    for (const call of fetchMock.mock.calls) {
      for (const p of JSON.parse(call[1].body as string).pages) {
        expect(Number.isInteger(p.ms), `ms ${p.ms} must be an integer`).toBe(true)
      }
    }
  })

  // The bug the demo surfaced: at the end of a document the last page is what
  // the reader scrolled to, however much of the screen the page above it holds.
  it('credits the last page once there is nowhere left to scroll', () => {
    vi.useFakeTimers()
    setScroll({ scrollY: 4000, scrollHeight: 5000 })
    const pages = [page(5, 101, 508), page(6, 508, 793)]
    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    expect(flushedMs(6)).toBeGreaterThan(0)
  })

  it('does not credit a page that is only a sliver on screen', () => {
    vi.useFakeTimers()
    setScroll({ scrollY: 500, scrollHeight: 5000 })
    const pages = [page(1, 0, 970), page(2, 970, 1600)]
    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    expect(flushedMs(2)).toBe(0)
  })
})
