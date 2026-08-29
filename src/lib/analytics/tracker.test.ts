// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startTracker } from './tracker'

// The tracker's one promise: engaged time only accrues while the reader is
// actually looking. These tests drive it through the browser conditions that
// promise depends on and read back what it would have flushed to the server.

let fetchMock: ReturnType<typeof vi.fn>
let visibility: DocumentVisibilityState

function setVisibility(state: DocumentVisibilityState) {
  visibility = state
}

/** Total engagedMs the tracker has POSTed so far, summed across all flushes. */
function flushedEngagedMs(): number {
  return fetchMock.mock.calls.reduce((sum, call) => {
    const body = JSON.parse(call[1].body as string)
    return sum + (body.engagedMs ?? 0)
  }, 0)
}

function start() {
  return startTracker({ visitId: 'v1', token: 'share-token', getPageElements: () => [] })
}

beforeEach(() => {
  setVisibility('visible')
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)

  // jsdom ships neither of these; the tracker only needs them to not throw.
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: vi.fn(() => true) })

  fetchMock = vi.fn(() => Promise.resolve({ ok: true }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('startTracker', () => {
  it('accrues visible time while the reader is active', () => {
    vi.useFakeTimers()
    const t = start()

    vi.advanceTimersByTime(10_000)
    t.stop()

    // ~10s of attention, allowing a tick of slack at the flush boundary.
    expect(flushedEngagedMs()).toBeGreaterThanOrEqual(9_000)
    expect(flushedEngagedMs()).toBeLessThanOrEqual(10_000)
  })

  it('accrues nothing while the tab is hidden', () => {
    vi.useFakeTimers()
    setVisibility('hidden')
    const t = start()

    vi.advanceTimersByTime(30_000)
    t.stop()

    expect(flushedEngagedMs()).toBe(0)
  })

  it('stops accruing once the reader goes idle', () => {
    vi.useFakeTimers()
    const t = start()

    // Two minutes with no input at all. Time should stop counting at the 60s
    // idle cutoff, not run for the full two minutes.
    vi.advanceTimersByTime(120_000)
    t.stop()

    const engaged = flushedEngagedMs()
    expect(engaged).toBeGreaterThan(55_000)
    expect(engaged).toBeLessThanOrEqual(61_000)
  })

  it('caps a single tick so waking from sleep cannot dump hours of time', () => {
    // Decouple Date from the timer clock so we can simulate a real-time gap the
    // interval slept through, then fired once for.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
    const base = 1_000_000
    const now = vi.spyOn(Date, 'now').mockReturnValue(base)

    const t = start()

    now.mockReturnValue(base + 500)
    vi.advanceTimersByTime(500) // one honest 500ms tick

    // Machine sleeps for an hour, then wakes with the reader active again.
    now.mockReturnValue(base + 500 + 3_600_000)
    window.dispatchEvent(new Event('mousemove')) // fresh activity on wake
    vi.advanceTimersByTime(500) // the tick that fires with a one-hour delta

    t.recordDownload() // force a synchronous flush we can read
    const engaged = JSON.parse(fetchMock.mock.calls.at(-1)![1].body as string).engagedMs

    // 500ms + a single capped tick (<=2000), nowhere near the hour that elapsed.
    expect(engaged).toBeLessThan(5_000)
    t.stop()
  })
})
