import { ChevronRight } from 'lucide-react'
import { HeatMeter } from './heat-meter'
import { bestIntent } from './grouping'
import { totalByCurrency } from './totals'
import { cn } from '#/lib/utils'
import type { ListEntry } from './grouping'
import type { ProposalSummary } from '#/lib/analytics/summaries'

/**
 * Several proposals to one client, bracketed under a header that carries the
 * rollup — count, total value, and on open deals the strongest heat — so
 * collapsing the group loses nothing you were scanning for.
 */
export function ClientGroup({
  group,
  open,
  onToggle,
  showHeat,
  children,
}: {
  group: Extract<ListEntry, { kind: 'group' }>
  open: boolean
  onToggle: () => void
  /**
   * Off on the closed tab. Heat is a read on whether a deal is worth chasing,
   * which a won or lost one no longer is — and the rows underneath carry no
   * heat there either, so a header that did would be summarising a column
   * that isn't shown.
   */
  showHeat: boolean
  children: React.ReactNode
}) {
  const total = totalByCurrency(group.proposals)
  const count = group.proposals.length

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 rounded-md border border-line bg-surface-2 px-3 py-2.5 text-left transition-colors',
          'hover:border-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        <ChevronRight
          aria-hidden
          className={cn(
            'size-3.5 shrink-0 text-ink-3 transition-transform',
            open && 'rotate-90',
          )}
        />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.008em]">
          {group.clientName}
        </span>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-wide text-ink-3">
          {count} proposals
        </span>
        <span className="flex shrink-0 items-center justify-end gap-3.5">
          {total && (
            <span className="font-display text-base font-semibold tracking-tight tnum">
              {total}
            </span>
          )}
          {showHeat && <GroupHeat proposals={group.proposals} />}
        </span>
      </button>

      {open && (
        // The left rail is what reads as "these belong to the header above",
        // without nesting a card inside a card.
        <ul className="mt-1.5 ml-3 flex flex-col gap-1.5 border-l-2 border-line pl-3">
          {children}
        </ul>
      )}
    </li>
  )
}

/** Split out so bestIntent is only reached when the meter is actually shown. */
function GroupHeat({ proposals }: { proposals: Array<ProposalSummary> }) {
  const intent = bestIntent(proposals)
  return <HeatMeter band={intent.band} score={intent.score} />
}
