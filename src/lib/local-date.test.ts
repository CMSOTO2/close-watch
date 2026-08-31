import { describe, expect, it } from 'vitest'
import { formatDay } from './local-date'

// 9pm Aug 30 in Chicago is already Aug 31 in UTC. The bare
// toLocaleDateString this replaced rendered "Aug 31" in workerd and
// "Aug 30" in the browser, which is what tore the hydration.
const NEAR_MIDNIGHT = '2026-08-31T02:00:00.000Z'

describe('formatDay', () => {
  it('depends on the passed zone, never on the process clock', () => {
    expect(formatDay(NEAR_MIDNIGHT, 'UTC')).toBe('Aug 31, 2026')
    expect(formatDay(NEAR_MIDNIGHT, 'America/Chicago')).toBe('Aug 30, 2026')
  })

  it('pins the locale, so workerd and Chrome agree on month names', () => {
    expect(formatDay('2026-01-05T12:00:00.000Z', 'UTC')).toBe('Jan 5, 2026')
  })
})
