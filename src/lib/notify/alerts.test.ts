import { describe, expect, it } from 'vitest'
import { ALERT_FLOOR_MS, alertEmail, pickAlert } from './alerts'
import type { AlertContext, AlertState, AlertVisit } from './alerts'
import type { IntentResult } from '#/lib/analytics/intent'

const HOUR = 60 * 60 * 1000
const t0 = new Date('2026-09-01T09:00:00Z').getTime()
const at = (hours: number) => new Date(t0 + hours * HOUR)

const warm: IntentResult = {
  score: 40,
  band: 'warm',
  signals: [{ label: 'Opened twice', points: 10 }],
}
const hot: IntentResult = {
  score: 70,
  band: 'hot',
  signals: [
    { label: '2m on pricing', points: 25 },
    { label: 'Opened 3 times', points: 15 },
  ],
}

function visit(id: string, visitorId: string, startH: number): AlertVisit {
  return { id, visitorId, startedAt: at(startH), lastSeenAt: at(startH + 0.1) }
}

// The state most flushes arrive in: the named recipient read it once this
// morning, the first-open email went out then, and they are back two hours
// later. Each test overrides only what it is about.
function state(overrides: Partial<AlertState> = {}): AlertState {
  return {
    current: { ...visit('now', 'recipient', 2), alerted: false },
    others: [visit('first', 'recipient', 0)],
    firstOpenNotified: true,
    hotNotified: false,
    lastAlertedAt: at(0),
    before: warm,
    after: warm,
    now: at(2.05),
    ...overrides,
  }
}

describe('pickAlert', () => {
  it('sends the first-open email before anything else', () => {
    expect(pickAlert(state({ firstOpenNotified: false, others: [] }))).toEqual({
      kind: 'first_open',
    })
  })

  it('stays quiet when the same reader rereads the same day', () => {
    expect(pickAlert(state())).toBeNull()
  })

  it('reports a return after the gap, carrying the real gap', () => {
    const r = pickAlert(
      state({
        current: { ...visit('now', 'recipient', 14.1), alerted: false },
        now: at(14.15),
      }),
    )
    expect(r).toEqual({ kind: 'returned', gapMs: 14 * HOUR })
  })

  it('does not call a gap just under twelve hours a return', () => {
    const r = pickAlert(
      state({
        current: { ...visit('now', 'recipient', 12), alerted: false },
        now: at(12.05),
      }),
    )
    expect(r).toBeNull()
  })

  it('reports a browser the proposal has not seen as a new reader', () => {
    const r = pickAlert(
      state({ current: { ...visit('now', 'colleague', 2), alerted: false } }),
    )
    expect(r).toEqual({ kind: 'new_reader' })
  })

  it('holds a new reader inside the floor after the last email', () => {
    const r = pickAlert(
      state({
        current: { ...visit('now', 'phone', 0.5), alerted: false },
        lastAlertedAt: at(0),
        now: at(0.5),
      }),
    )
    expect(r).toBeNull()
    expect(0.5 * HOUR).toBeLessThan(ALERT_FLOOR_MS)
  })

  it('does not treat the first reader as new because a second started later', () => {
    const r = pickAlert(
      state({
        current: { ...visit('now', 'recipient', 0), alerted: false },
        others: [visit('later', 'colleague', 0.05)],
        lastAlertedAt: null,
      }),
    )
    expect(r).toBeNull()
  })

  it('sends at most one return or new-reader email per session', () => {
    const r = pickAlert(
      state({ current: { ...visit('now', 'colleague', 2), alerted: true } }),
    )
    expect(r).toBeNull()
  })

  it('announces crossing into hot even inside the floor and an alerted session', () => {
    const r = pickAlert(
      state({
        current: { ...visit('now', 'recipient', 2), alerted: true },
        lastAlertedAt: at(2.04),
        before: warm,
        after: hot,
      }),
    )
    expect(r).toEqual({ kind: 'went_hot' })
  })

  it('does not announce a proposal that was already hot before this read', () => {
    expect(pickAlert(state({ before: hot, after: hot }))).toBeNull()
  })

  it('announces hot once', () => {
    expect(
      pickAlert(state({ hotNotified: true, before: warm, after: hot })),
    ).toBeNull()
  })
})

const context: AlertContext = {
  title: 'Website Redesign',
  clientName: 'Acme',
  recipient: 'Sarah',
  thisRead: 'Safari · iOS, London, United Kingdom',
  earlierReads: ['Chrome · macOS, Leeds, United Kingdom'],
  intent: { score: 0, band: 'cold', signals: [] },
  url: 'https://getclosewatch.com/proposals/abc',
}

describe('alertEmail', () => {
  it('reports a new reader as an observation, not a forward', () => {
    const e = alertEmail({ kind: 'new_reader' }, context)
    expect(e.subject).toBe('A new reader opened "Website Redesign"')
    expect(e.text).toContain('the link you sent to Sarah')
    expect(e.text).toContain('often a forward')
    expect(e.text).toContain('another device')
    expect(e.text).toContain('This read: Safari · iOS, London, United Kingdom.')
    expect(e.text).toContain('Earlier reads: Chrome · macOS, Leeds')
  })

  it('states the gap in hours, then in days', () => {
    expect(
      alertEmail({ kind: 'returned', gapMs: 14 * HOUR }, context).subject,
    ).toBe('Sarah came back to "Website Redesign" after 14 hours')
    expect(
      alertEmail({ kind: 'returned', gapMs: 73 * HOUR }, context).subject,
    ).toBe('Sarah came back to "Website Redesign" after 3 days')
  })

  it('lists the reasons behind the score, and nothing when there are none', () => {
    const quiet = alertEmail({ kind: 'first_open' }, context)
    expect(quiet.text).not.toContain('Where it stands')

    const loud = alertEmail({ kind: 'went_hot' }, { ...context, intent: hot })
    expect(loud.subject).toBe('"Website Redesign" for Acme just went hot')
    expect(loud.text).toContain('Where it stands: 70/100, hot.')
    expect(loud.text).toContain('- 2m on pricing')
    expect(loud.html).toContain('<li>2m on pricing</li>')
  })

  it('escapes what the owner typed before it reaches the HTML', () => {
    const e = alertEmail(
      { kind: 'first_open' },
      { ...context, title: '<b>Acme & Co</b>' },
    )
    expect(e.html).toContain('&lt;b&gt;Acme &amp; Co&lt;/b&gt;')
    expect(e.html).not.toContain('<b>Acme')
  })

  it('tells a free account what Solo would also email, in the first open only', () => {
    const free = alertEmail(
      { kind: 'first_open' },
      { ...context, upsell: true },
    )
    expect(free.text).toContain('On Solo')
    expect(
      alertEmail({ kind: 'first_open' }, { ...context, upsell: false }).text,
    ).not.toContain('On Solo')
    expect(
      alertEmail({ kind: 'went_hot' }, { ...context, upsell: true }).text,
    ).not.toContain('On Solo')
  })
})
