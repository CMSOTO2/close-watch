/**
 * Viewer-side engagement tracker.
 *
 * The whole value of this product rests on one number being honest: how long
 * did they actually look at this. So time only accrues while the tab is
 * visible, the window has focus, and the person has done something in the last
 * IDLE_MS. A proposal left open in a background tab overnight must report
 * roughly the time they actually spent, not eight hours.
 */

const TICK_MS = 500
const FLUSH_MS = 10_000
const IDLE_MS = 60_000
/** Guards against a machine waking from sleep and reporting a single huge tick. */
const MAX_TICK_MS = 2_000

export type PageBox = { page: number; top: number; bottom: number }

/**
 * Where down the viewport the reader is assumed to be looking. People read the
 * upper middle of a screen, not the centre, and a line is a better model than
 * "whichever page covers the most pixels": on a short cover page followed by a
 * long one, area picks the page below the one being looked at.
 */
const READING_LINE = 0.35

/** How close to the end of the scroll still counts as the end of it. */
const BOTTOM_SLACK_PX = 24

/**
 * Which page a reader with these boxes on screen is reading.
 *
 * Split out and pure because the interesting cases are geometric and would
 * otherwise only be reachable by scrolling a real browser.
 *
 * `atBottom` is not a nicety. At the end of a document there is nowhere left
 * to scroll, so a final page shorter than the one above it can never win any
 * "most visible" contest, however long the reader sits on it — which is how
 * the last page of a proposal came to be worth no time at all, and why
 * "Reached the last page" could not score.
 */
export function pickPage(
  boxes: Array<PageBox>,
  viewportHeight: number,
  atBottom: boolean,
  fallback: number,
): number {
  if (boxes.length === 0) return fallback
  if (atBottom) return Math.max(...boxes.map((b) => b.page))

  const line = viewportHeight * READING_LINE

  const onLine = boxes.find((b) => b.top <= line && b.bottom > line)
  if (onLine) return onLine.page

  // In the gutter between two pages: whichever edge the line is nearer.
  let best = boxes[0]
  let bestDistance = Infinity
  for (const box of boxes) {
    const distance = box.bottom <= line ? line - box.bottom : box.top - line
    if (distance < bestDistance) {
      bestDistance = distance
      best = box
    }
  }
  return best.page
}

/**
 * How much of the screen a page must hold before it is credited with any of
 * the time. Below this it is a sliver at an edge, not something being read,
 * and crediting it would let a page earn "reached" just by being scrolled past.
 */
const MIN_SHARE = 0.1

/** Rounding slack for "wholly on screen": a page framed exactly can report -0.5. */
const WHOLE_SLACK_PX = 2

/**
 * How to divide a tick between the pages on screen.
 *
 * A page wholly on screen is the one being read. When there is one, it takes
 * the tick, and pages cut off at the top or bottom edge get none of it: they
 * are the ones being scrolled to or from. This is the shape a slide deck lives
 * in. A 16:9 page is 486px tall in the viewer, so the slide being read nearly
 * always sits between the tail of the one before and the head of the one after,
 * and splitting by area gave it barely half the time spent on it. A real deck,
 * read on its pricing slide for most of each visit, came back as 45s on pricing
 * and 39s on the two slides either side.
 *
 * With no page wholly on screen — a portrait page taller than the window, or
 * two halves across a page boundary — each page gets the share of the window it
 * holds, because a reader with two sections in front of them is not reading
 * only one of them. Two or more whole pages split the same way.
 *
 * The cut-off pages' shares are handed to the whole ones rather than dropped,
 * so a framed slide is credited with the screen it is being read on. What is
 * never handed to anyone is the part of the window that is not a page at all —
 * on a phone the demo puts its report under the proposal — so weights still
 * sum to at most one and page time still cannot exceed engaged time; it is
 * allowed to fall short of it, which is the honest answer when part of the
 * screen was not the document.
 */
export function pageWeights(
  boxes: Array<PageBox>,
  viewportHeight: number,
): Array<{ page: number; weight: number }> {
  if (viewportHeight <= 0) return []

  const shares = boxes
    .map((box) => ({
      page: box.page,
      share:
        Math.max(
          0,
          Math.min(box.bottom, viewportHeight) - Math.max(box.top, 0),
        ) / viewportHeight,
      whole:
        box.top >= -WHOLE_SLACK_PX &&
        box.bottom <= viewportHeight + WHOLE_SLACK_PX,
    }))
    .filter((s) => s.share >= MIN_SHARE)

  const whole = shares.filter((s) => s.whole)
  if (whole.length === 0 || whole.length === shares.length) {
    return shares.map((s) => ({ page: s.page, weight: s.share }))
  }

  const wholeShare = whole.reduce((sum, s) => sum + s.share, 0)
  const total = shares.reduce((sum, s) => sum + s.share, 0)
  return whole.map((s) => ({
    page: s.page,
    weight: (s.share / wholeShare) * total,
  }))
}

export type Flush = {
  engagedMs: number
  pages: Array<{ page: number; ms: number }>
  events: Array<{ type: string; page?: number; payload?: unknown }>
}

export type TrackerOptions = {
  visitId: string
  token: string
  /** Element per page, in order. Index 0 is page 1. */
  getPageElements: () => Array<HTMLElement>
  /**
   * Where a flush goes. Defaults to the ingest endpoint for `visitId`.
   *
   * The landing page's demo passes its own, so the readout it shows is
   * produced by this file rather than by a second copy of these rules written
   * to look like them. A demo of honest timing has to be honestly timed, and
   * a parallel implementation would drift the first time either changed.
   */
  sink?: (payload: Flush) => void
  /**
   * How often accrued time is handed to the sink, in ms. Defaults to ten
   * seconds, which is the right cadence for a network write. The demo drops it
   * so its on-screen counter moves rather than jumping in ten-second steps —
   * this changes how often the total is reported, never how it is measured.
   */
  flushMs?: number
}

export function startTracker({
  visitId,
  token,
  getPageElements,
  sink,
  flushMs = FLUSH_MS,
}: TrackerOptions) {
  const endpoint = `/api/track/${visitId}`

  let engagedMs = 0
  const pageMs = new Map<number, number>()
  let queuedEvents: Flush['events'] = []

  let currentPage = 1
  let lastActivityAt = Date.now()
  let lastTickAt = Date.now()
  let stopped = false

  const onScreen = new Set<number>()
  const elements = new Map<number, HTMLElement>()

  const isActive = () =>
    document.visibilityState === 'visible' &&
    document.hasFocus() &&
    Date.now() - lastActivityAt < IDLE_MS

  /**
   * Restart the tick clock without crediting anything.
   *
   * A tick measures the interval that just ended and only then asks whether
   * the reader was there for it, so any gap the timer did not run through gets
   * banked at the moment it resumes. Browsers throttle background tabs and
   * suspend them outright on a phone, so the gap is exactly the time the
   * reader was somewhere else: switch tabs for four seconds and the first tick
   * back credited MAX_TICK_MS of it. Every path back to active resets the
   * clock here, so the first tick after a return measures the return.
   */
  const resumeClock = () => {
    lastTickAt = Date.now()
  }

  const markActivity = () => {
    // Coming back from idle is a resume too, or the tick after the first
    // keypress banks the silence before it.
    if (Date.now() - lastActivityAt >= IDLE_MS) resumeClock()
    lastActivityAt = Date.now()
  }

  const activityEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'scroll',
    'touchstart',
    'wheel',
  ]
  for (const name of activityEvents) {
    window.addEventListener(name, markActivity, { passive: true })
  }

  // The observer only answers "which pages are on screen at all", so the tick
  // below reads geometry for two or three elements instead of all of them —
  // a 500-page document must not measure 500 rects twice a second.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const page = Number((entry.target as HTMLElement).dataset.page)
        if (!Number.isFinite(page)) continue
        if (entry.isIntersecting) onScreen.add(page)
        else onScreen.delete(page)
      }
    },
    { threshold: 0 },
  )

  for (const el of getPageElements()) {
    const page = Number(el.dataset.page)
    if (Number.isFinite(page)) elements.set(page, el)
    observer.observe(el)
  }

  /** Reads the boxes of the pages currently on screen, in page order. */
  function onScreenBoxes(viewportHeight: number): Array<PageBox> {
    const boxes: Array<PageBox> = []
    for (const page of [...onScreen].sort((a, b) => a - b)) {
      const el = elements.get(page)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.bottom <= 0 || rect.top >= viewportHeight) continue
      boxes.push({ page, top: rect.top, bottom: rect.bottom })
    }
    return boxes
  }

  const tickTimer = window.setInterval(() => {
    const now = Date.now()
    const delta = Math.min(now - lastTickAt, MAX_TICK_MS)
    lastTickAt = now
    if (!isActive()) return

    const viewportHeight = window.innerHeight
    const doc = document.documentElement
    // Both callers scroll the window rather than an inner container.
    const atBottom =
      window.scrollY + viewportHeight >= doc.scrollHeight - BOTTOM_SLACK_PX

    const boxes = onScreenBoxes(viewportHeight)
    const next = pickPage(boxes, viewportHeight, atBottom, currentPage)
    if (next !== currentPage) {
      currentPage = next
      queuedEvents.push({ type: 'page_enter', page: next })
    }

    engagedMs += delta

    // No page credited when none is on screen. There is somewhere to be in
    // these documents that is not a page — below the last one on the demo sits
    // the report itself — and the tick used to hand that time to whatever page
    // the reader had last been on, so reading the report read as reading the
    // terms. Engaged time above still counts: they are looking at the page,
    // just not at any part of the proposal.
    for (const { page, weight } of pageWeights(boxes, viewportHeight)) {
      pageMs.set(page, (pageMs.get(page) ?? 0) + delta * weight)
    }
  }, TICK_MS)

  function drain(): Flush | null {
    if (engagedMs === 0 && pageMs.size === 0 && queuedEvents.length === 0)
      return null
    const payload: Flush = {
      engagedMs,
      // Rounded because splitting a tick across pages leaves fractions, and
      // the ingest schema takes integers — a fractional ms fails its parse,
      // which that endpoint answers with the same silent 204 as success, and
      // the whole flush goes with it.
      pages: [...pageMs.entries()]
        .map(([page, ms]) => ({ page, ms: Math.round(ms) }))
        .filter((p) => p.ms > 0),
      events: queuedEvents,
    }
    engagedMs = 0
    pageMs.clear()
    queuedEvents = []
    return payload
  }

  function flush(useBeacon: boolean) {
    const payload = drain()
    if (!payload) return

    if (sink) {
      sink(payload)
      return
    }

    const body = JSON.stringify({ token, ...payload })

    // sendBeacon is the only thing that reliably survives a tab close, and it
    // is why the ingest endpoint accepts text/plain.
    if (
      useBeacon &&
      navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain' }))
    ) {
      return
    }

    void fetch(endpoint, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // A dropped flush costs a few seconds of resolution. Never surface it.
    })
  }

  const flushTimer = window.setInterval(() => flush(false), flushMs)

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush(true)
    else resumeClock()
  }
  document.addEventListener('visibilitychange', onVisibility)
  // A window that never lost visibility can still have lost focus — another
  // window in front of this one, or another app. Same gap, same reset.
  window.addEventListener('focus', resumeClock)
  window.addEventListener('pagehide', () => flush(true))

  const onPrint = () => queuedEvents.push({ type: 'print' })
  window.addEventListener('beforeprint', onPrint)

  return {
    /** Call when the reader hits the download button. */
    recordDownload() {
      queuedEvents.push({ type: 'download', page: currentPage })
      flush(false)
    },
    /**
     * Call when the reader hits the print button. The browser's own Ctrl+P is
     * already caught by the beforeprint listener; this covers the in-app button,
     * which prints an off-screen iframe and so never fires beforeprint here.
     */
    recordPrint() {
      queuedEvents.push({ type: 'print', page: currentPage })
      flush(false)
    },
    stop() {
      if (stopped) return
      stopped = true
      flush(true)
      window.clearInterval(tickTimer)
      window.clearInterval(flushTimer)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', resumeClock)
      window.removeEventListener('beforeprint', onPrint)
      for (const name of activityEvents)
        window.removeEventListener(name, markActivity)
    },
  }
}
