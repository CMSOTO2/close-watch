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

type Flush = {
  engagedMs: number
  pages: Array<{ page: number; ms: number }>
  events: Array<{ type: string; page?: number; payload?: unknown }>
}

export type TrackerOptions = {
  visitId: string
  token: string
  /** Element per page, in order. Index 0 is page 1. */
  getPageElements: () => Array<HTMLElement>
}

export function startTracker({ visitId, token, getPageElements }: TrackerOptions) {
  const endpoint = `/api/track/${visitId}`

  let engagedMs = 0
  const pageMs = new Map<number, number>()
  let queuedEvents: Flush['events'] = []

  let currentPage = 1
  let lastActivityAt = Date.now()
  let lastTickAt = Date.now()
  let stopped = false

  const visibility = new Map<number, number>()

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

  // Which page is the reader actually looking at: the one occupying the most
  // of the viewport right now.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const page = Number((entry.target as HTMLElement).dataset.page)
        if (Number.isFinite(page)) visibility.set(page, entry.intersectionRatio)
      }

      let best = currentPage
      let bestRatio = 0
      for (const [page, ratio] of visibility) {
        if (ratio > bestRatio) {
          bestRatio = ratio
          best = page
        }
      }

      if (best !== currentPage && bestRatio > 0.25) {
        currentPage = best
        queuedEvents.push({ type: 'page_enter', page: best })
      }
    },
    { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
  )

  for (const el of getPageElements()) observer.observe(el)

  const tickTimer = window.setInterval(() => {
    const now = Date.now()
    const delta = Math.min(now - lastTickAt, MAX_TICK_MS)
    lastTickAt = now
    if (!isActive()) return

    engagedMs += delta
    pageMs.set(currentPage, (pageMs.get(currentPage) ?? 0) + delta)
  }, TICK_MS)

  function drain(): Flush | null {
    if (engagedMs === 0 && pageMs.size === 0 && queuedEvents.length === 0) return null
    const payload: Flush = {
      engagedMs,
      pages: [...pageMs.entries()].map(([page, ms]) => ({ page, ms })),
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

  const flushTimer = window.setInterval(() => flush(false), FLUSH_MS)

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
