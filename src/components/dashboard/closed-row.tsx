import { Link } from '@tanstack/react-router'
import { ROW_LINK_ATTR } from './use-list-keys'
import { cn, formatMoney } from '#/lib/utils'
import type { ProposalSummary } from '#/lib/analytics/summaries'

export function ClosedRow({ proposal }: { proposal: ProposalSummary }) {
  const won = proposal.status === 'won'
  const date = proposal.outcomeAt
    ? new Date(proposal.outcomeAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Rendered at one breakpoint or the other, never both.
  const money =
    proposal.dealValueCents == null ? null : (
      <p
        className={cn(
          'shrink-0 text-right font-display text-base font-semibold tracking-tight tnum',
          won ? 'text-good' : 'text-ink-3 line-through',
        )}
      >
        {formatMoney(proposal.dealValueCents, proposal.currency)}
      </p>
    )

  return (
    <li>
      <Link
        to="/proposals/$id"
        params={{ id: proposal.id }}
        {...{ [ROW_LINK_ATTR]: '' }}
        className={cn(
          'row-enter relative block overflow-hidden rounded-md border border-line bg-surface px-4 py-3.5 shadow-sm transition-[border-color,box-shadow]',
          'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[""]',
          won ? 'before:bg-good' : 'before:bg-transparent',
          'hover:border-ink-3 hover:shadow-md',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          '[&[data-row-nav]]:outline-2 [&[data-row-nav]]:outline-offset-2 [&[data-row-nav]]:outline-ring',
        )}
      >
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

          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
            {won ? 'Won' : 'Lost'}
            {date && ` \u00b7 ${date}`}
          </p>

          <div className="hidden xl:block">{money}</div>
        </div>
      </Link>
    </li>
  )
}
