import { describe, expect, it } from 'vitest'
import { pageWeights, pickPage } from './tracker'
import type { PageBox } from './tracker'

const VH = 873

describe('pickPage', () => {
  it('picks the page under the reading line', () => {
    const boxes: Array<PageBox> = [
      { page: 1, top: -200, bottom: 100 },
      { page: 2, top: 116, bottom: 600 },
    ]
    // Line sits at 305, inside page 2.
    expect(pickPage(boxes, VH, false, 1)).toBe(2)
  })

  it('keeps the current page when nothing is on screen', () => {
    expect(pickPage([], VH, false, 4)).toBe(4)
  })

  it('takes the nearer page when the line falls in the gutter', () => {
    const boxes: Array<PageBox> = [
      { page: 1, top: -100, bottom: 290 },
      { page: 2, top: 340, bottom: 800 },
    ]
    // Line 305: 15 past page 1's bottom, 35 before page 2's top.
    expect(pickPage(boxes, VH, false, 2)).toBe(1)
  })

  /**
   * The bug this function was extracted for. Measured off the live demo: at
   * the very bottom, page 5 and page 6 are both fully on screen, page 5 is the
   * taller of the two, and the reading line lands inside it. Page 6 is what
   * the reader scrolled to the end to read.
   */
  describe('at the end of the document', () => {
    const bottom: Array<PageBox> = [
      { page: 4, top: -205, bottom: 101 },
      { page: 5, top: 101, bottom: 508 },
      { page: 6, top: 508, bottom: 793 },
    ]

    it('used to hand the time to page 5', () => {
      expect(pickPage(bottom, VH, false, 5)).toBe(5)
    })

    it('gives it to the last page once there is nowhere left to scroll', () => {
      expect(pickPage(bottom, VH, true, 5)).toBe(6)
    })
  })

  it('does not jump to the last page merely because it is visible', () => {
    // Mid-document, the final page peeking in at the bottom must not win.
    const boxes: Array<PageBox> = [
      { page: 2, top: 40, bottom: 700 },
      { page: 3, top: 716, bottom: 860 },
    ]
    expect(pickPage(boxes, VH, false, 2)).toBe(2)
  })

  it('handles a page taller than the viewport', () => {
    expect(pickPage([{ page: 7, top: -400, bottom: 1400 }], VH, false, 6)).toBe(7)
  })
})

describe('pageWeights', () => {
  const VIEWPORT = 1000

  it('gives the whole tick to a page that fills the screen', () => {
    expect(pageWeights([{ page: 3, top: -100, bottom: 1100 }], VIEWPORT)).toEqual([
      { page: 3, weight: 1 },
    ])
  })

  // The point of the change: two sections on screen are two sections being read.
  it('splits between two pages in proportion to the screen each holds', () => {
    const weights = pageWeights(
      [
        { page: 1, top: 0, bottom: 600 },
        { page: 2, top: 600, bottom: 1000 },
      ],
      VIEWPORT,
    )
    expect(weights).toEqual([
      { page: 1, weight: 0.6 },
      { page: 2, weight: 0.4 },
    ])
  })

  // Total page time must never exceed engaged time, at any arrangement. It may
  // fall short of it, when part of the window was not a page.
  it('never credits more than the tick it is dividing', () => {
    const arrangements = [
      [{ page: 1, top: -300, bottom: 400 }, { page: 2, top: 400, bottom: 1400 }],
      [
        { page: 4, top: -50, bottom: 250 },
        { page: 5, top: 250, bottom: 700 },
        { page: 6, top: 700, bottom: 980 },
      ],
      [{ page: 9, top: 100, bottom: 900 }],
    ]
    for (const boxes of arrangements) {
      const total = pageWeights(boxes, VIEWPORT).reduce((s, w) => s + w.weight, 0)
      expect(total).toBeLessThanOrEqual(1)
      expect(total).toBeGreaterThan(0)
    }
  })

  // Otherwise a page earns "reached" simply by being scrolled past.
  it('ignores a sliver at the edge of the screen', () => {
    const weights = pageWeights(
      [
        { page: 1, top: 0, bottom: 960 },
        { page: 2, top: 960, bottom: 1600 },
      ],
      VIEWPORT,
    )
    // Page 1 is credited the 96% it holds, not a rounded-up whole tick.
    expect(weights).toEqual([{ page: 1, weight: 0.96 }])
  })

  // The reason the weights are raw: a page peeking in above something that is
  // not the document at all must not be credited with the whole tick.
  it('leaves the tick short when most of the window is not a page', () => {
    const weights = pageWeights([{ page: 6, top: 0, bottom: 200 }], VIEWPORT)
    expect(weights).toEqual([{ page: 6, weight: 0.2 }])
  })

  it('reports nothing when every page is a sliver, so the caller can hold', () => {
    expect(pageWeights([{ page: 2, top: 980, bottom: 1200 }], VIEWPORT)).toEqual([])
    expect(pageWeights([], VIEWPORT)).toEqual([])
  })

  it('survives a zero-height viewport rather than dividing by it', () => {
    expect(pageWeights([{ page: 1, top: 0, bottom: 10 }], 0)).toEqual([])
  })
})
