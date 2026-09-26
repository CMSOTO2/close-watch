import { Link } from '@tanstack/react-router'
import { RowMenu } from './row-menu'
import { ROW_LINK_ATTR } from './use-list-keys'
import { ScoreRing } from './score-ring'
import { FolderTag } from './folder-tag'
import { formatDuration } from '#/lib/analytics/intent'
import { cn, formatMoney } from '#/lib/utils'
import type { Delta } from './since-last-visit'
import type { IntentResult, IntentSignal } from '#/lib/analytics/intent'
import type { ProposalSummary } from '#/lib/analytics/summaries'

const REASON = {
  hot: 'border-hot-line bg-hot-soft text-hot',
  warm: 'border-warm-line bg-warm-soft text-warm',
  cold: 'border-line bg-surface-2 text-ink-2',
} as const

export function ProposalRow({
  proposal,
  delta,
  folderName = null,
  selected = false,
  onSelect,
}: {
  proposal: ProposalSummary
  delta?: Delta
  /** Set only under All, where the row's folder is not otherwise shown. */
  folderName?: string | null
  /** Shown in the dashboard's preview pane. */
  selected?: boolean
  /**
   * Given only where a preview pane is on screen. A plain click on a row that
   * is not yet selected previews it instead of navigating; clicking it again,
   * or any modified click, opens the proposal as before.
   */
  onSelect?: (id: string) => void
}) {
  const { intent } = proposal
  const reason = reasonFor(intent)
  const opened = proposal.qualifiedVisits > 0

  return (
    <li
      className={cn(
        'row-enter group relative rounded-xl border border-line bg-surface px-4 py-4 shadow-sm transition-[border-color,box-shadow] sm:px-5',
        'hover:border-line-strong hover:shadow-md',
        selected && 'border-ink shadow-md hover:border-ink',
        // The focus ring belongs to the whole card even though focus lands on
        // the stretched link inside it.
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring',
        'has-[a[data-row-nav]]:outline-2 has-[a[data-row-nav]]:outline-offset-2 has-[a[data-row-nav]]:outline-ring',
      )}
    >
      {/* Ring, then who and how they read, then money and the one reason. The
          third column drops under the other two when the list is narrow. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 @2xl:grid-cols-[auto_minmax(0,1fr)_auto] @2xl:gap-x-5">
        <ScoreRing score={intent.score} band={intent.band} opened={opened} />

        <div className="min-w-0">
          <p className="flex min-w-0 items-baseline gap-2">
            {delta && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 self-center rounded-full bg-brand-2"
              />
            )}
            {/* after:inset-0 stretches the hit area over the whole card, so
                the row still opens from anywhere the menu is not. */}
            <Link
              to="/proposals/$id"
              params={{ id: proposal.id }}
              {...{ [ROW_LINK_ATTR]: '' }}
              aria-current={selected || undefined}
              // Keyboard focus only (j/k, Tab). A mouse press focuses the link
              // before its click lands, and selecting there would make the
              // click see a selected row and navigate on the first press.
              onFocus={(e) => {
                if (e.currentTarget.matches(':focus-visible'))
                  onSelect?.(proposal.id)
              }}
              onClick={(e) => {
                if (
                  !onSelect ||
                  selected ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey ||
                  e.button !== 0
                )
                  return
                e.preventDefault()
                onSelect(proposal.id)
              }}
              className="shrink-0 truncate text-base font-semibold tracking-[-0.01em] outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
            >
              {proposal.clientName}
            </Link>
            <span className="truncate text-[13px] text-ink-3">
              {proposal.title}
            </span>
            {folderName && <FolderTag name={folderName} />}
          </p>

          <ReadingLine proposal={proposal} delta={delta} />
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3 @2xl:col-span-1 @2xl:flex-col @2xl:items-end @2xl:justify-center @2xl:gap-1.5">
          <div className="flex items-center gap-1.5">
            {proposal.dealValueCents != null && (
              <span className="text-lg font-semibold tracking-tight tnum">
                {formatMoney(proposal.dealValueCents, proposal.currency)}
              </span>
            )}
            <RowMenu proposal={proposal} />
          </div>
          {reason ? (
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[12px] font-medium',
                REASON[intent.band],
              )}
            >
              {reason.label}
            </span>
          ) : (
            !opened && <span className="text-[12px] text-ink-3">Waiting</span>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * How it was read, as a bar: time on pricing against everything else, which
 * is the one split a sender acts on. A proposal with no page tagged pricing
 * gets a plain total instead, so "0s on pricing" only ever means skipped it.
 */
function ReadingLine({
  proposal: p,
  delta,
}: {
  proposal: ProposalSummary
  delta?: Delta
}) {
  const news = delta && (
    <span className="font-medium text-ink">{describeDelta(delta)}</span>
  )

  if (p.qualifiedVisits === 0 || p.totalEngagedMs === 0) {
    return (
      <p className="mt-1 text-[13px] text-ink-3">
        {news ? <>{news}, </> : null}Not opened yet
      </p>
    )
  }

  const total = p.totalEngagedMs
  const pricing = p.hasPricingPage ? Math.min(p.pricingEngagedMs, total) : 0
  const share = (pricing / total) * 100
  const readers = `${p.distinctViewers} ${p.distinctViewers === 1 ? 'reader' : 'readers'}`
  const opens = `${p.qualifiedVisits} ${p.qualifiedVisits === 1 ? 'open' : 'opens'}`

  return (
    <div className="mt-2.5 max-w-md">
      <div
        aria-hidden
        className="flex h-1.5 overflow-hidden rounded-full bg-surface-3"
      >
        {p.hasPricingPage && (
          <span
            className="h-full bg-warm-2"
            style={{ width: `${pricing > 0 ? Math.max(share, 2) : 0}%` }}
          />
        )}
        <span className="h-full flex-1 bg-line-strong/60" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
        <span>
          {p.hasPricingPage ? (
            <>
              <b className="text-[13px] font-semibold text-ink tnum">
                {formatDuration(pricing / 1000)}
              </b>{' '}
              on pricing of{' '}
              <b className="text-[13px] font-semibold text-ink tnum">
                {formatDuration(total / 1000)}
              </b>
            </>
          ) : (
            <>
              <b className="text-[13px] font-semibold text-ink tnum">
                {formatDuration(total / 1000)}
              </b>{' '}
              reading
            </>
          )}
        </span>
        <span className="tnum">
          {news ? <>{news}, </> : null}
          {readers}, {opens}
        </span>
      </div>
    </div>
  )
}

/**
 * Signals the reading line already states: opens, readers, time reading, and
 * time on pricing, which the bar spells out. "Opened by 3 readers" beside
 * "3 readers" was the same fact twice, and so was a "10m 3s on pricing" chip
 * under a bar captioned "10m 3s on pricing".
 */
const RESTATES_METRICS = /^(Opened|Read (closely|it properly))|on pricing$/

/**
 * The one reason worth a chip: the strongest signal the reading line does not
 * already say — a print, a forward, a return on a later day.
 */
function reasonFor(intent: IntentResult): IntentSignal | null {
  return (
    intent.signals.find(
      (s) => s.points > 0 && !RESTATES_METRICS.test(s.label),
    ) ?? null
  )
}

/** "2 new opens" / "1 new reader" — what actually moved, not a generic badge. */
function describeDelta(delta: Delta): string {
  const parts: Array<string> = []
  if (delta.opens > 0) {
    parts.push(`${delta.opens} new open${delta.opens === 1 ? '' : 's'}`)
  }
  if (delta.readers > 0) {
    parts.push(`${delta.readers} new reader${delta.readers === 1 ? '' : 's'}`)
  }
  return parts.join(', ')
}
