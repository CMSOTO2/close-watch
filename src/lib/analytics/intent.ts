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

/**
 * Attention saturates; it does not scale with page count.
 *
 * The argument in a proposal lives in its first dozen pages. Past that sit
 * appendices, case studies and terms that nobody reads front to back. Dividing
 * engaged time by the true page count asked for an hour of reading before an
 * 80-page document could count as read closely, and 27 minutes before it
 * counted as read at all. Nobody spends that, so the depth signal went dead on
 * exactly the long documents where "did they actually engage" is hardest to
 * eyeball, and the score fell to whatever the forward and offline signals said.
 *
 * Capping the divisor fixes the direction without inverting the original
 * intent: a short proposal is still not punished against a long one, and a
 * 43-second skim of 80 pages still earns nothing, because 43 seconds over
 * twelve effective pages is under four seconds a page.
 */
const DEPTH_PAGE_CAP = 12

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

  // Circulation. What is actually observed is a second browser opening a link
  // that was sent to one person — nothing more. Usually that is a forward, and
  // it is the strongest signal here for that reason, but it is also what the
  // same recipient reading on their phone looks like, or on a second browser,
  // or after clearing their cookies.
  //
  // So the label states the observation and leaves the inference to the reader,
  // who knows who they sent it to and we do not. It used to say "Forwarded to
  // someone else" as a flat fact, which is a claim this cannot support and the
  // wrong one to overstate: it is worth 18 points, it is the thing the product
  // is bought for, and a consultant who chases a forward that was their own
  // contact on a train stops trusting the number entirely.
  //
  // "Reader" is the word the rest of the product already uses for a distinct
  // visitor, and the FAQ now says what makes one: a browser that has not opened
  // this link before. Device would be a second guess dressed as a fact.
  if (input.distinctViewers >= 3) add(25, `Opened by ${input.distinctViewers} readers`)
  else if (input.distinctViewers === 2) add(18, 'Opened by a second reader')

  // Depth of read, normalised by document length so a 3-page proposal is not
  // punished against a 30-page one, and capped so a 60-page one is still
  // reachable. See DEPTH_PAGE_CAP.
  const totalSec = Math.round(input.totalEngagedMs / 1000)
  const effectivePages = Math.min(Math.max(input.pageCount, 1), DEPTH_PAGE_CAP)
  const secondsPerPage = input.totalEngagedMs / 1000 / effectivePages
  // Labelled with the total rather than a per-page rate: once the divisor is
  // capped, "60s per page" would be a number the reader never actually spent,
  // and "read the whole thing" would claim a completeness we cannot see.
  if (secondsPerPage >= 45) add(20, `Read closely (${formatDuration(totalSec)})`)
  else if (secondsPerPage >= 20) add(12, `Read it properly (${formatDuration(totalSec)})`)
  else if (secondsPerPage >= 8) add(5, 'Skimmed it')

  // Pricing dwell.
  const pricingSec = Math.round(input.pricingEngagedMs / 1000)
  if (pricingSec >= 90) add(25, `${formatDuration(pricingSec)} on pricing`)
  else if (pricingSec >= 40) add(18, `${formatDuration(pricingSec)} on pricing`)
  else if (pricingSec >= 15) add(10, `${formatDuration(pricingSec)} on pricing`)

  if (input.reachedLastPage) add(8, 'Reached the last page')

  // Took it offline. Downloading or printing is a deliberate step past reading:
  // saving a copy to keep, or printing to mark up or bring into a meeting. Both
  // are strong action signals; printing is the more committed of the two.
  //
  // They are capped together because they are two halves of one act. Scored
  // separately they summed to 33, which cleared the warm floor on its own, so a
  // reader who saved and printed a document they had barely opened came back
  // warm on no reading at all.
  if (input.printed && input.downloaded) add(20, 'Printed and downloaded it')
  else if (input.printed) add(18, 'Printed it')
  else if (input.downloaded) add(15, 'Downloaded a copy')

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
