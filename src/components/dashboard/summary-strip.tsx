import { totalByCurrency } from './totals'
import { formatMoney } from '#/lib/utils'
import type { ProposalSummary, SecuredTotal } from '#/lib/analytics/summaries'

/**
 * The numbers you act on, above the list — so the page answers "who do I call?"
 * before you scroll. Currencies are joined rather than summed, matching how
 * secured totals are grouped server-side.
 */
export function SummaryStrip({
  secured,
  active,
}: {
  secured: Array<SecuredTotal>
  active: Array<ProposalSummary>
}) {
  const won = secured.filter((s) => s.allTimeCents > 0)
  const allTime = won
    .map((s) => formatMoney(s.allTimeCents, s.currency))
    .join(' · ')
  const last30 = won
    .filter((s) => s.last30Cents > 0)
    .map((s) => formatMoney(s.last30Cents, s.currency))
    .join(' · ')

  const pipeline = totalByCurrency(active)
  const hottest = active.reduce<ProposalSummary | null>(
    (best, p) =>
      best === null || p.intent.score > best.intent.score ? p : best,
    null,
  )
  const topSignal = hottest?.intent.signals[0]?.label

  return (
    <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-[1.25fr_1fr_1fr]">
      <Cell
        kicker="Secured with Closewatch"
        value={won.length > 0 ? allTime : '—'}
        detail={
          last30
            ? `+${last30} in the last 30 days`
            : 'No wins in the last 30 days'
        }
        tone="good"
      />
      <Cell
        kicker="Open pipeline"
        value={pipeline ?? '—'}
        detail={`Across ${active.length} active ${active.length === 1 ? 'proposal' : 'proposals'}`}
      />
      <Cell
        kicker="Hottest right now"
        value={hottest?.clientName ?? '—'}
        detail={hottest ? (topSignal ?? 'No activity yet') : 'Nothing open'}
        small
      />
    </div>
  )
}

function Cell({
  kicker,
  value,
  detail,
  tone,
  small,
}: {
  kicker: string
  value: string
  detail: string
  tone?: 'good'
  small?: boolean
}) {
  const good = tone === 'good'

  return (
    <div className={good ? 'bg-good-soft px-4 py-4' : 'bg-surface px-4 py-4'}>
      <p className={good ? 'kicker text-good/75' : 'kicker'}>{kicker}</p>
      <p
        className={[
          'mt-1.5 font-display font-semibold tracking-tight tnum leading-tight',
          small ? 'truncate text-base' : 'text-2xl',
          good ? 'text-good' : 'text-ink',
        ].join(' ')}
      >
        {value}
      </p>
      <p
        className={`mt-0.5 truncate text-[13px] ${good ? 'text-good/80' : 'text-ink-2'}`}
      >
        {detail}
      </p>
    </div>
  )
}
