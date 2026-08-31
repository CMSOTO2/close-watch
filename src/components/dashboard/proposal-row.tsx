import { Link } from '@tanstack/react-router'
import { HeatMeter } from './heat-meter'
import { formatDuration } from '#/lib/analytics/intent'
import { cn, formatMoney } from '#/lib/utils'
import type { ProposalSummary } from '#/lib/analytics/summaries'

// A 3px spine on the left edge marks hot and warm deals, so the list is
// scannable in peripheral vision without reading a single label.
const SPINE = {
  hot: 'before:bg-hot',
  warm: 'before:bg-brand-2',
  cold: 'before:bg-transparent',
} as const

export function ProposalRow({ proposal }: { proposal: ProposalSummary }) {
  const { intent } = proposal
  const metrics = readMetrics(proposal)
  // Non-empty in practice, but a low-scoring visit can leave it empty.
  const flag = intent.signals.length > 0 ? intent.signals[0] : null

  // Rendered at one breakpoint or the other, never both — so the markup lives
  // here once instead of being duplicated into each branch.
  const money = (
    <div className="flex shrink-0 items-center justify-end gap-3.5">
      {proposal.dealValueCents != null && (
        <span className="font-display text-base font-semibold tracking-tight tnum">
          {formatMoney(proposal.dealValueCents, proposal.currency)}
        </span>
      )}
      <HeatMeter band={intent.band} score={intent.score} />
    </div>
  )

  return (
    <li>
      <Link
        to="/proposals/$id"
        params={{ id: proposal.id }}
        className={cn(
          'relative block overflow-hidden rounded-md border border-line bg-surface px-4 py-3.5 shadow-sm transition-[border-color,box-shadow]',
          'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[""]',
          'hover:border-ink-3 hover:shadow-md',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          SPINE[intent.band],
        )}
      >
        {/* One line only at xl, where the shell is at its full 1280 and the
            signal column has room without wrapping. Below that it stacks, with
            money riding alongside the client name. */}
        <div className="flex flex-col gap-2 xl:grid xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_auto] xl:items-center xl:gap-6">
          <div className="flex items-start justify-between gap-4 xl:block">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.008em]">
                {proposal.clientName}
              </p>
              <p className="truncate text-[13px] text-ink-2">
                {proposal.title}
              </p>
            </div>
            <div className="xl:hidden">{money}</div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
            {metrics.map((m, i) => (
              <span key={m} className="flex items-center gap-2">
                {i > 0 && (
                  <span
                    aria-hidden
                    className="size-[3px] rounded-full bg-ink-3"
                  />
                )}
                <span>{m}</span>
              </span>
            ))}
            {flag !== null && flag.points > 0 && (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-[3px] rounded-full bg-ink-3"
                />
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide',
                    intent.band === 'hot'
                      ? 'bg-hot-soft text-hot'
                      : 'bg-brand-soft text-warm',
                  )}
                >
                  {flag.label}
                </span>
              </span>
            )}
          </div>

          <div className="hidden xl:block">{money}</div>
        </div>
      </Link>
    </li>
  )
}

/** Signals, not sentences: the same information in a third of the reading time. */
function readMetrics(p: ProposalSummary): Array<string> {
  if (p.qualifiedVisits === 0) return ['Not opened yet']

  const metrics = [
    `Viewed ${p.qualifiedVisits} ${p.qualifiedVisits === 1 ? 'time' : 'times'}`,
  ]
  if (p.totalEngagedMs > 0) {
    metrics.push(`${formatDuration(p.totalEngagedMs / 1000)} engaged`)
  }
  if (p.distinctViewers > 1) metrics.push(`${p.distinctViewers} readers`)
  return metrics
}
