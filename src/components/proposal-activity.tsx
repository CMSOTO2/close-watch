import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { CornerDownRight } from 'lucide-react'
import { getProposalAnalytics } from '#/lib/analytics/proposal-analytics'
import { formatDuration } from '#/lib/analytics/intent'
import { SECTION_LABELS, queryKeys } from '#/constants'
import { formatDay, useTimeZone } from '#/lib/local-date'
import type {
  PageAttention,
  ProposalAnalytics,
  VisitActivity,
} from '#/lib/analytics/proposal-analytics'

export const proposalAnalyticsQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.proposalAnalytics(id),
    queryFn: () => getProposalAnalytics({ data: { id } }),
  })

function formatRelative(iso: string | null, timeZone: string): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 30) return `${d}d ago`
  return formatDay(iso, timeZone)
}

export function ProposalActivity({ proposalId }: { proposalId: string }) {
  const { data } = useSuspenseQuery(proposalAnalyticsQuery(proposalId))
  if (!data) return null

  const { totals } = data

  return (
    <section className="mt-10">
      <h2 className="font-display text-base font-semibold tracking-tight">
        Activity
      </h2>

      {totals.qualifiedVisits === 0 ? (
        <p className="mt-3 text-[13px] text-ink-2">
          No qualified opens yet.
          {totals.botVisits > 0 &&
            ` ${totals.botVisits} automated ${totals.botVisits === 1 ? 'fetch was' : 'fetches were'} filtered out.`}
        </p>
      ) : (
        <>
          <StatTiles totals={totals} />
          <PageAttentionChart pages={data.pages} />
          <RecentVisits visits={data.visits} />
        </>
      )}
    </section>
  )
}

function StatTiles({ totals }: { totals: ProposalAnalytics['totals'] }) {
  const timeZone = useTimeZone()
  const tiles = [
    { label: 'Opens', value: String(totals.qualifiedVisits) },
    { label: 'Viewers', value: String(totals.distinctViewers) },
    {
      label: 'Total time',
      value: formatDuration(totals.totalEngagedMs / 1000),
    },
    { label: 'Last opened', value: formatRelative(totals.lastOpenedAt, timeZone) },
    { label: 'Downloads', value: String(totals.downloads) },
    { label: 'Prints', value: String(totals.prints) },
  ]
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-md border border-line bg-surface px-3 py-2.5 shadow-sm"
        >
          <dt className="kicker">{t.label}</dt>
          <dd className="mt-1 font-display text-lg font-semibold tracking-tight tnum text-ink">
            {t.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function PageAttentionChart({ pages }: { pages: Array<PageAttention> }) {
  const max = Math.max(1, ...pages.map((p) => p.engagedMs))

  return (
    <div className="mt-8">
      <h3 className="kicker">Attention by page</h3>
      <ul className="mt-3 space-y-2">
        {pages.map((page) => {
          const seconds = page.engagedMs / 1000
          const pct = (page.engagedMs / max) * 100
          const isPricing = page.section === 'pricing'
          // 'other' is the untagged default; leave the suffix off for it.
          const label =
            page.section === 'other' ? '' : SECTION_LABELS[page.section]
          return (
            <li key={page.pageNumber} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-ink-2 sm:w-32">
                Page {page.pageNumber}
                {label && <span className="text-ink-3"> · {label}</span>}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={`h-full rounded-full ${isPricing ? 'bg-bar-lead' : 'bg-bar'}`}
                  style={{
                    width: `${Math.max(pct, page.engagedMs > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs tnum text-ink-2 sm:w-16">
                {seconds >= 1 ? formatDuration(seconds) : '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EventBadges({ events }: { events: Array<string> }) {
  return (
    <>
      {events.map((e) => (
        <Badge key={e} className="bg-warm-soft text-warm">
          {e}
        </Badge>
      ))}
    </>
  )
}

function RecentVisits({ visits }: { visits: Array<VisitActivity> }) {
  const timeZone = useTimeZone()
  if (visits.length === 0) return null
  const recent = visits.slice(0, 12)

  return (
    <div className="mt-8">
      <h3 className="kicker">Recent visits</h3>
      <ul className="mt-3 divide-y divide-line-soft">
        {recent.map((v) => (
          <li
            key={v.id}
            className={`flex items-center justify-between gap-3 py-2 ${v.isForward ? 'pl-4' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-[13px] text-ink">
                {v.isForward ? (
                  <>
                    <CornerDownRight
                      className="size-3.5 shrink-0 text-brand"
                      aria-hidden
                    />
                    <span>Reader {v.viewerIndex}</span>
                    <span className="truncate text-ink-3">
                      forwarded from {v.recipientLabel}
                    </span>
                  </>
                ) : (
                  <span className="truncate">{v.recipientLabel}</span>
                )}
                {v.isReturn && (
                  <Badge className="bg-surface-2 text-ink-2">return</Badge>
                )}
                <EventBadges events={v.events} />
              </p>
              <p className="text-xs text-ink-3">
                {formatRelative(v.startedAt, timeZone)}
                {v.device && ` · ${v.device}`}
              </p>
            </div>
            <span className="shrink-0 text-xs tnum text-ink-2">
              {formatDuration(v.engagedMs / 1000)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Badge({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span
      className={`ml-2 rounded-full px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  )
}
