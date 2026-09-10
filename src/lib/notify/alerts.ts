import type { IntentResult } from '#/lib/analytics/intent'
import { escapeHtml } from './resend'

/**
 * Which reads are worth an email, and what the email says.
 *
 * The first-open email used to be the only one, so the moments that actually
 * say a deal is moving — a client coming back days later, a browser the link
 * has not seen before, the score crossing into hot — reached the owner only if
 * they happened to open the dashboard. LAUNCH.md already expected most people
 * never to open it.
 *
 * Pure, so the rules are testable without a database or a mail provider.
 * proposal-activity.ts does the reading, claiming and sending.
 */

export type Alert =
  | { kind: 'first_open' }
  | { kind: 'went_hot' }
  | { kind: 'new_reader' }
  | { kind: 'returned'; gapMs: number }

/**
 * No two emails about one proposal inside this window, the hot one excepted.
 *
 * The case it exists for is one person opening the link on a laptop and then on
 * a phone: two browsers, so it reads as a new reader, and an email ten minutes
 * after the last one announcing that would be the noisiest kind of wrong.
 */
export const ALERT_FLOOR_MS = 60 * 60 * 1000

/**
 * How long a proposal has to sit unread before opening it again counts as
 * coming back. Twelve hours rather than the intent score's twenty-four so that
 * read-it-in-the-evening, back-in-the-morning counts. The email states the real
 * gap, so the threshold never has to be stated as a claim.
 */
export const RETURN_GAP_MS = 12 * 60 * 60 * 1000

export function withinFloor(lastAlertedAt: Date | null, now: Date): boolean {
  return (
    lastAlertedAt !== null &&
    now.getTime() - lastAlertedAt.getTime() < ALERT_FLOOR_MS
  )
}

export type AlertVisit = {
  id: string
  visitorId: string
  startedAt: Date
  lastSeenAt: Date
}

export type AlertState = {
  /** The visit whose flush is being handled. */
  current: AlertVisit & { alerted: boolean }
  /** Every other qualified, human visit on the proposal. */
  others: ReadonlyArray<AlertVisit>
  firstOpenNotified: boolean
  hotNotified: boolean
  lastAlertedAt: Date | null
  /** The proposal's score without the current visit, and with it. */
  before: IntentResult
  after: IntentResult
  now: Date
}

/**
 * The one email this flush should send, or null.
 *
 * Hot is checked ahead of the per-session and per-proposal limits on purpose.
 * It is the only one that needs reading to accumulate, so it nearly always
 * lands in a session that has already sent something — the first open, or the
 * return that started it — and holding it to those limits would mean it almost
 * never went out. It can fire once per proposal, ever, which bounds the noise.
 *
 * It fires on crossing rather than on being hot, so a proposal that was hot
 * before this shipped is not announced by the next read of it.
 */
export function pickAlert(s: AlertState): Alert | null {
  if (!s.firstOpenNotified) return { kind: 'first_open' }

  if (!s.hotNotified && s.after.band === 'hot' && s.before.band !== 'hot')
    return { kind: 'went_hot' }

  if (s.current.alerted || withinFloor(s.lastAlertedAt, s.now)) return null

  // Only reads that began before this one. A second person opening the link
  // while the first is still reading does not make the first one new.
  const earlier = s.others.filter((v) => v.startedAt < s.current.startedAt)
  if (earlier.length === 0) return null

  if (!earlier.some((v) => v.visitorId === s.current.visitorId))
    return { kind: 'new_reader' }

  const lastSeen = Math.max(...earlier.map((v) => v.lastSeenAt.getTime()))
  const gapMs = s.current.startedAt.getTime() - lastSeen
  return gapMs >= RETURN_GAP_MS ? { kind: 'returned', gapMs } : null
}

export type AlertContext = {
  title: string
  clientName: string
  /** Who the opened link was sent to, when the owner said. */
  recipient: string | null
  /** "Safari · iOS, London, United Kingdom" for the current read. */
  thisRead: string | null
  /** The same for earlier reads, deduplicated. Shown for a new reader. */
  earlierReads: ReadonlyArray<string>
  intent: IntentResult
  /** The proposal's page in the app. */
  url: string
  /**
   * The owner is on the free plan, where the first open is the only email.
   * Said once, in that email, so they know what they will not be told.
   */
  upsell?: boolean
}

export type RenderedEmail = { subject: string; text: string; html: string }

export const UPSELL_NOTE =
  'On Solo, Closewatch also emails you when they come back, when a new reader opens it, and when it turns hot.'

export function alertEmail(alert: Alert, c: AlertContext): RenderedEmail {
  const who = c.recipient ?? 'Someone'
  const title = `"${c.title}"`
  let subject: string
  let lead: string
  const notes: Array<string> = []
  if (alert.kind === 'first_open' && c.upsell) notes.push(UPSELL_NOTE)

  switch (alert.kind) {
    case 'first_open':
      subject = `${who} opened ${title} proposal`
      lead = `${who} just opened your proposal ${title} for ${c.clientName}.`
      break
    case 'went_hot':
      subject = `${title} for ${c.clientName} just went hot`
      lead = `Your proposal ${title} for ${c.clientName} just crossed into hot at ${c.intent.score}/100, and someone is reading it now.`
      break
    case 'new_reader':
      subject = `A new reader opened ${title}`
      lead = c.recipient
        ? `A browser that has not opened ${title} before just opened the link you sent to ${c.recipient}.`
        : `A browser that has not opened ${title} for ${c.clientName} before just opened it.`
      // The same honesty as the dashboard's "Opened by a second reader": say
      // what was seen and leave the inference to the person who knows who
      // they sent it to.
      notes.push(
        'That is often a forward. It can also be the same person on another device or in a private window, which only you can judge.',
      )
      if (c.thisRead) notes.push(`This read: ${c.thisRead}.`)
      if (c.earlierReads.length)
        notes.push(`Earlier reads: ${c.earlierReads.join('; ')}.`)
      break
    case 'returned': {
      const gap = formatGap(alert.gapMs)
      subject = `${who} came back to ${title} after ${gap}`
      lead = `${who} is reading ${title} for ${c.clientName} again, ${gap} after it was last open.`
      break
    }
  }

  const reasons = c.intent.signals.filter((s) => s.points > 0)
  const standing = reasons.length
    ? `Where it stands: ${c.intent.score}/100, ${c.intent.band}.`
    : null

  const text = [
    lead,
    ...notes,
    '',
    ...(standing ? [standing, ...reasons.map((r) => `- ${r.label}`), ''] : []),
    `See what they read: ${c.url}`,
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.5;color:#171717">
      <p>${escapeHtml(lead)}</p>
      ${notes.map((n) => `<p style="color:#525252">${escapeHtml(n)}</p>`).join('')}
      ${
        standing
          ? `<p style="margin-bottom:4px">${escapeHtml(standing)}</p>
      <ul style="margin-top:0;padding-left:20px">${reasons.map((r) => `<li>${escapeHtml(r.label)}</li>`).join('')}</ul>`
          : ''
      }
      <p><a href="${escapeHtml(c.url)}" style="color:#2563eb">See what they read →</a></p>
    </div>`

  return { subject, text, html }
}

/** "14 hours" up to two days, whole days after that. Never under twelve. */
export function formatGap(ms: number): string {
  const hours = Math.round(ms / (60 * 60 * 1000))
  return hours < 48 ? `${hours} hours` : `${Math.round(hours / 24)} days`
}
