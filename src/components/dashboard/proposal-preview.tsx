import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CornerDownRight } from 'lucide-react'
import {
  PageAttentionChart,
  formatRelative,
  proposalAnalyticsQuery,
} from '#/components/proposal-activity'
import { useToast } from '#/components/toast'
import { Button } from '#/components/ui/button'
import { formatDuration } from '#/lib/analytics/intent'
import { formatDay, useTimeZone } from '#/lib/local-date'
import { cn, formatMoney } from '#/lib/utils'
import { HeatMeter } from './heat-meter'
import type { ProposalSummary } from '#/lib/analytics/summaries'

/**
 * The dashboard's right-hand pane on wide screens: the selected proposal's
 * answer to "where did they stop", without leaving the list.
 *
 * Read-only on purpose. The list, the row menu and the detail page already
 * own every action; this pane is for deciding which of them to take, so it
 * carries the one action that leads to all of them (Open) and the one people
 * reach for mid-call (Copy link).
 *
 * The analytics fetch is not suspense-backed: moving the selection must never
 * blank the list while a pane loads, so the pane shows its own placeholder.
 */
export function ProposalPreview({ proposal }: { proposal: ProposalSummary }) {
  const timeZone = useTimeZone()
  const notify = useToast()
  const { data, isPending } = useQuery(proposalAnalyticsQuery(proposal.id))
  const { intent } = proposal
  const signals = intent.signals.filter((s) => s.points > 0).slice(0, 4)
  const opened = proposal.qualifiedVisits > 0

  async function copyLink() {
    if (!proposal.shareUrl) return
    try {
      await navigator.clipboard.writeText(proposal.shareUrl)
      notify(`Link for ${proposal.clientName} copied`)
    } catch {
      notify('Could not copy — open the proposal to copy it manually', 'danger')
    }
  }

  return (
    <aside
      aria-label={`Preview of ${proposal.clientName}`}
      className="rounded-lg border border-line bg-surface px-5 py-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl leading-tight">
            {proposal.clientName}
          </h2>
          <p className="mt-1 truncate text-[13px] text-ink-2">
            {proposal.title}
          </p>
          <p className="text-[13px] text-ink-3">
            Created {formatDay(proposal.createdAt, timeZone)}
            {proposal.dealValueCents != null && (
              <>
                {', '}
                <span className="tnum text-ink-2">
                  {formatMoney(proposal.dealValueCents, proposal.currency)}
                </span>
              </>
            )}
          </p>
        </div>
        <HeatMeter band={intent.band} score={intent.score} />
      </div>

      <div className="mt-4 flex gap-2">
        <Button asChild size="sm">
          <Link to="/proposals/$id" params={{ id: proposal.id }}>
            Open proposal
          </Link>
        </Button>
        {proposal.shareUrl && (
          <Button size="sm" variant="outline" onClick={copyLink}>
            Copy link
          </Button>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-3 border-y border-line">
        <Stat label="Intent" value={opened ? String(intent.score) : '—'} />
        <Stat
          label="Readers"
          value={opened ? String(proposal.distinctViewers) : '—'}
          divided
        />
        <Stat
          label="Time reading"
          value={
            proposal.totalEngagedMs > 0
              ? formatDuration(proposal.totalEngagedMs / 1000)
              : '—'
          }
          divided
        />
      </dl>

      {!opened ? (
        <p className="mt-5 text-[13px] leading-relaxed text-ink-2">
          Not opened yet. Once the client reads it, this shows which pages held
          them and who else it reached.
        </p>
      ) : (
        <>
          {signals.length > 0 && (
            <div className="mt-5">
              <h3 className="kicker">Why it scores {intent.score}</h3>
              <ul className="mt-2 divide-y divide-line-soft">
                {signals.map((s) => (
                  <li
                    key={s.label}
                    className="flex justify-between gap-3 py-1.5 text-[13px]"
                  >
                    <span className="text-ink">{s.label}</span>
                    <span className="tnum text-ink-3">+{s.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isPending ? (
            <PanePlaceholder />
          ) : data && data.pages.length > 0 ? (
            <>
              <PageAttentionChart pages={data.pages} className="mt-6" />
              {data.visits.length > 0 && (
                <div className="mt-6">
                  <h3 className="kicker">Latest reads</h3>
                  <ul className="mt-2 divide-y divide-line-soft">
                    {data.visits.slice(0, 3).map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-3 py-1.5 text-[13px]"
                      >
                        <span className="flex min-w-0 items-center gap-1 text-ink">
                          {v.isForward && (
                            <CornerDownRight
                              aria-hidden
                              className="size-3.5 shrink-0 text-brand-2"
                            />
                          )}
                          <span className="truncate">
                            {v.isForward
                              ? `Reader ${v.viewerIndex}, forwarded`
                              : v.recipientLabel}
                          </span>
                        </span>
                        <span className="shrink-0 text-ink-3 tnum">
                          {formatRelative(v.startedAt, timeZone)},{' '}
                          {formatDuration(v.engagedMs / 1000)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </aside>
  )
}

function Stat({
  label,
  value,
  divided = false,
}: {
  label: string
  value: string
  divided?: boolean
}) {
  return (
    <div className={cn('py-3', divided && 'border-l border-line pl-4')}>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tracking-tight tnum">
        {value}
      </dd>
    </div>
  )
}

function PanePlaceholder() {
  return (
    <div aria-hidden className="mt-6 space-y-2.5">
      {[70, 45, 90, 35].map((w) => (
        <div key={w} className="flex items-center gap-3">
          <span className="h-2.5 w-24 rounded bg-surface-2" />
          <span
            className="h-2 rounded-full bg-surface-2"
            style={{ width: `${w}%` }}
          />
        </div>
      ))}
    </div>
  )
}
