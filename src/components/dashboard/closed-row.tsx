import { Link } from '@tanstack/react-router'
import { ROW_LINK_ATTR } from './use-list-keys'
import { FolderTag } from './folder-tag'
import { formatDay, useTimeZone } from '#/lib/local-date'
import { cn, formatMoney } from '#/lib/utils'
import type { ProposalSummary } from '#/lib/analytics/summaries'

export function ClosedRow({
  proposal,
  folderName = null,
}: {
  proposal: ProposalSummary
  /** Set only under All, where the row's folder is not otherwise shown. */
  folderName?: string | null
}) {
  const won = proposal.status === 'won'
  // Filed away rather than resolved, so it carries no outcome and no date. The
  // value is printed plainly: struck through would say the money was lost, and
  // the whole point of this status is that nobody has claimed that.
  const archived = proposal.status === 'archived'
  const timeZone = useTimeZone()
  const date =
    proposal.outcomeAt === null ? null : formatDay(proposal.outcomeAt, timeZone)

  // Rendered at one breakpoint or the other, never both.
  const money =
    proposal.dealValueCents == null ? null : (
      <p
        className={cn(
          'shrink-0 text-right font-display text-base font-semibold tracking-tight tnum',
          won && 'text-good',
          archived && 'text-ink-3',
          !won && !archived && 'text-ink-3 line-through',
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
          // A won deal and a lost one are both closed, but they are not the
          // same news; the spine is what separates them down the list. An
          // archived one is neither piece of news, and takes the neutral spine
          // so it reads as filed rather than as a third kind of result.
          won && 'before:bg-good-2',
          archived && 'before:bg-line-strong',
          !won && !archived && 'before:bg-lost-2',
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
              <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
                <span className="truncate">{proposal.title}</span>
                {folderName && <FolderTag name={folderName} />}
              </p>
            </div>
            <div className="xl:hidden">{money}</div>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
            {won ? 'Won' : archived ? 'Archived' : 'Lost'}
            {date && ` \u00b7 ${date}`}
          </p>

          <div className="hidden xl:block">{money}</div>
        </div>
      </Link>
    </li>
  )
}
