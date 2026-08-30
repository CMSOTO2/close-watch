/**
 * Buying-intent scoring.
 *
 * Deliberately rules-based and deliberately explainable. "High intent" on its
 * own is a horoscope; "they came back Tuesday morning and spent 4 minutes on
 * pricing" is something a consultant can act on before lunch. The reasons are
 * the product, the number is just how we sort the list.
 */

export type IntentInput = {
  pageCount: number
  qualifiedVisits: number
  distinctViewers: number
  totalEngagedMs: number
  pricingEngagedMs: number
  reachedLastPage: boolean
  firstVisitAt: Date | null
  lastVisitAt: Date | null
  /** Someone saved a copy of the PDF. */
  downloaded?: boolean
  /** Someone printed the PDF. */
  printed?: boolean
}

export type IntentSignal = { label: string; points: number }

export type IntentResult = {
  score: number
  band: 'cold' | 'warm' | 'hot'
  signals: Array<IntentSignal>
}

const HOUR = 60 * 60 * 1000

export function scoreIntent(input: IntentInput): IntentResult {
  const signals: Array<IntentSignal> = []
  const add = (points: number, label: string) => {
    if (points > 0) signals.push({ label, points })
  }

  if (input.qualifiedVisits === 0) {
    return { score: 0, band: 'cold', signals: [{ label: 'Not opened yet', points: 0 }] }
  }

  // Repeat opens. One read is politeness, three is a decision in progress.
  if (input.qualifiedVisits >= 4) add(20, `Opened ${input.qualifiedVisits} times`)
  else if (input.qualifiedVisits === 3) add(15, 'Opened 3 times')
  else if (input.qualifiedVisits === 2) add(10, 'Opened twice')

  // Forwarded internally. A second person on a link sent to one recipient means
  // it reached someone who was not the original contact, which usually means a
  // budget holder. Strongest single signal we can observe.
  if (input.distinctViewers >= 3) add(25, `Shared with ${input.distinctViewers - 1} other people`)
  else if (input.distinctViewers === 2) add(18, 'Forwarded to someone else')

  // Depth of read, normalised by document length so a 3-page proposal is not
  // punished against a 30-page one.
  const secondsPerPage = input.totalEngagedMs / 1000 / Math.max(input.pageCount, 1)
  if (secondsPerPage >= 45) add(20, `Read closely (${Math.round(secondsPerPage)}s per page)`)
  else if (secondsPerPage >= 20) add(12, 'Read the whole thing')
  else if (secondsPerPage >= 8) add(5, 'Skimmed it')

  // Pricing dwell.
  const pricingSec = Math.round(input.pricingEngagedMs / 1000)
  if (pricingSec >= 90) add(25, `${formatDuration(pricingSec)} on pricing`)
  else if (pricingSec >= 40) add(18, `${formatDuration(pricingSec)} on pricing`)
  else if (pricingSec >= 15) add(10, `${formatDuration(pricingSec)} on pricing`)

  if (input.reachedLastPage) add(8, 'Reached the last page')

  // Took it offline. Downloading or printing is a deliberate step past reading —
  // saving a copy to keep, or printing to mark up or bring into a meeting. Both
  // are strong action signals; printing is the more committed of the two.
  if (input.printed) add(18, 'Printed it')
  if (input.downloaded) add(15, 'Downloaded a copy')

  // Return visit on a later day. Same-session re-reads are already covered by
  // visit count; a genuine return means they went away and came back.
  if (input.firstVisitAt && input.lastVisitAt) {
    const gap = input.lastVisitAt.getTime() - input.firstVisitAt.getTime()
    if (gap >= 24 * HOUR) add(15, 'Came back on a later day')
    else if (gap >= 4 * HOUR) add(8, 'Came back the same day')
  }

  const raw = signals.reduce((sum, s) => sum + s.points, 0)
  const score = Math.min(100, raw)

  return {
    score,
    band: score >= 65 ? 'hot' : score >= 30 ? 'warm' : 'cold',
    signals: signals.sort((a, b) => b.points - a.points),
  }
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s === 0 ? `${m}m` : `${m}m ${s}s`
}
