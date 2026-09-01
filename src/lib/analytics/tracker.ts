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

/**
 * How to divide a tick between the pages on screen.
 *
 * A reader with two sections in front of them is not reading only one of them,
 * and handing the whole tick to a single page was making that claim several
 * times a second. Weights are the share of the viewport each page holds,
 * normalised so a tick is still worth exactly one tick — total page time never
 * exceeds engaged time.
 *
 * Returns an empty array when nothing qualifies, which the caller treats as
 * "leave it on the page they were already on".
 */
export function pageWeights(
  boxes: Array<PageBox>,
  viewportHeight: number,
): Array<{ page: number; weight: number }> {
  if (viewportHeight <= 0) return []

  const shares = boxes.map((box) => ({
    page: box.page,
    share:
      Math.max(0, Math.min(box.bottom, viewportHeight) - Math.max(box.top, 0)) /
      viewportHeight,
  }))

  const kept = shares.filter((s) => s.share >= MIN_SHARE)
  const total = kept.reduce((sum, s) => sum + s.share, 0)
  if (total <= 0) return []

  return kept.map((s) => ({ page: s.page, weight: s.share / total }))
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

  const markActivity = () => {
    lastActivityAt = Date.now()
  }

  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']
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

    const weights = pageWeights(boxes, viewportHeight)
    if (weights.length === 0) {
      pageMs.set(currentPage, (pageMs.get(currentPage) ?? 0) + delta)
    } else {
      for (const { page, weight } of weights) {
        pageMs.set(page, (pageMs.get(page) ?? 0) + delta * weight)
      }
    }
  }, TICK_MS)

  function drain(): Flush | null {
    if (engagedMs === 0 && pageMs.size === 0 && queuedEvents.length === 0) return null
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
    if (useBeacon && navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain' }))) {
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

  const onHide = () => {
    if (document.visibilityState === 'hidden') flush(true)
  }
  document.addEventListener('visibilitychange', onHide)
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
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeprint', onPrint)
      for (const name of activityEvents) window.removeEventListener(name, markActivity)
    },
  }
}
