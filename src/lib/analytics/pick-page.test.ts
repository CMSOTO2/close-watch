import { describe, expect, it } from 'vitest'
import { pickPage } from './tracker'
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
