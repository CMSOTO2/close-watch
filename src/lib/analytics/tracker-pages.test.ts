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

/**
 * Reports whether an element overlaps the window, the way a real observer
 * would. Stubbing this as "everything is on screen" hides the thing the
 * tracker leans on: that it reads geometry for the two or three pages in view
 * rather than for all five hundred.
 */
class FakeObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(el: Element) {
    const rect = el.getBoundingClientRect()
    const isIntersecting = rect.bottom > 0 && rect.top < window.innerHeight
    this.cb(
      [{ target: el, isIntersecting } as IntersectionObserverEntry],
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

/**
 * The same rules under the shapes the real viewer actually has.
 *
 * Two of them, because proposals are not all portrait. Measured off a real
 * deck in the deployed viewer: 864px of content at max-w-4xl, and pages 486px
 * tall — a 16:9 presentation, shorter than the 873px window, so two of them
 * share the screen the way the demo's do. US Letter at the same width is
 * 1118px tall and taller than the window, so one page fills it. Both arrive
 * here through the same tracker and neither should be assumed.
 */
describe('page attribution in the PDF viewer', () => {
  const VIEWER_VIEWPORT = 900
  const PAGE_H = 1118
  const GAP = 24

  /** Page `n` with its top at `top`, at real viewer dimensions. */
  const pdfPage = (n: number, top: number) => page(n, top, top + PAGE_H)

  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: VIEWER_VIEWPORT,
    })
  })

  it('gives the whole tick to a page taller than the window', () => {
    vi.useFakeTimers()
    setScroll({ scrollY: 2000, scrollHeight: 12_000 })
    // Page 3 covers the window; its neighbours are off screen.
    const pages = [pdfPage(2, -1300), pdfPage(3, -160), pdfPage(4, 982)]
    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    expect(flushedMs(3)).toBeCloseTo(10_000, -2)
    expect(flushedMs(2)).toBe(0)
  })

  it('splits across a page boundary in view', () => {
    vi.useFakeTimers()
    setScroll({ scrollY: 2000, scrollHeight: 12_000 })
    // Page 4 holds the top 300px, page 5 the remaining 576 after the gap.
    const pages = [pdfPage(4, -818), pdfPage(5, 324)]
    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    const fourth = flushedMs(4)
    const fifth = flushedMs(5)
    expect(fourth).toBeGreaterThan(0)
    expect(fifth).toBeGreaterThan(fourth)
    expect(fourth + fifth).toBeCloseTo(10_000, -2)
  })

  // What a reader does at the end of a proposal, and the case that used to
  // leave the final page worth nothing.
  it('credits the final page of a document', () => {
    vi.useFakeTimers()
    const scrollHeight = 12_000
    setScroll({ scrollY: scrollHeight - VIEWER_VIEWPORT, scrollHeight })
    // Last page bottom-aligned with the window, previous one above it.
    const pages = [pdfPage(8, -1142), pdfPage(9, -218 + GAP)]
    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    expect(flushedMs(9)).toBeGreaterThan(0)
  })

  // The shape actually measured in production: a 16:9 deck, two pages sharing
  // an 873px window. The last page of one of these is precisely the case that
  // used to be worth nothing.
  it('splits a landscape deck the way it splits the demo', () => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 873 })
    setScroll({ scrollY: 1200, scrollHeight: 4749 })
    const DECK_H = 486
    const pages = [
      page(2, -100, -100 + DECK_H),
      page(3, 410, 410 + DECK_H),
      page(4, 920, 920 + DECK_H),
    ]
    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })

    vi.advanceTimersByTime(10_000)
    tracker.stop()

    // Page 2 shows its last 386px, page 3 all 486, page 4 is off screen.
    expect(flushedMs(3)).toBeGreaterThan(flushedMs(2))
    expect(flushedMs(2)).toBeGreaterThan(0)
    expect(flushedMs(4)).toBe(0)
    expect(flushedMs(2) + flushedMs(3)).toBeCloseTo(10_000, -2)
  })

  it('reads geometry only for the pages on screen, not all 500', () => {
    vi.useFakeTimers()
    setScroll({ scrollY: 2000, scrollHeight: 600_000 })

    let rectReads = 0
    const pages = Array.from({ length: 500 }, (_, i) => {
      const el = page(i + 1, -160 + i * (PAGE_H + GAP), -160 + i * (PAGE_H + GAP) + PAGE_H)
      const real = el.getBoundingClientRect.bind(el)
      el.getBoundingClientRect = () => {
        rectReads++
        return real()
      }
      return el
    })

    const tracker = startTracker({ visitId: 'v1', token: 't', getPageElements: () => pages })
    // Setup necessarily touches all of them once; the cost that matters is
    // what every tick does from here on.
    rectReads = 0
    vi.advanceTimersByTime(1_000)
    tracker.stop()

    // Two ticks over the handful in view, not two passes over 500.
    expect(rectReads).toBeLessThan(40)
  })
})
