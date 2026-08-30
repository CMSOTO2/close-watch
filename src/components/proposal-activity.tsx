import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { CornerDownRight } from 'lucide-react'
import { getProposalAnalytics } from '#/lib/analytics/proposal-analytics'
import { formatDuration } from '#/lib/analytics/intent'
import { SECTION_LABELS, queryKeys } from '#/constants'
import type {
  PageAttention,
  ProposalAnalytics,
  ReaderActivity,
  RecipientActivity,
  VisitActivity,
} from '#/lib/analytics/proposal-analytics'

export const proposalAnalyticsQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.proposalAnalytics(id),
    queryFn: () => getProposalAnalytics({ data: { id } }),
  })

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export function ProposalActivity({ proposalId }: { proposalId: string }) {
  const { data } = useSuspenseQuery(proposalAnalyticsQuery(proposalId))
  if (!data) return null

  const { totals } = data

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-neutral-800">Activity</h2>

      {totals.qualifiedVisits === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          No qualified opens yet.
          {totals.botVisits > 0 &&
            ` ${totals.botVisits} automated ${totals.botVisits === 1 ? 'fetch was' : 'fetches were'} filtered out.`}
        </p>
      ) : (
        <>
          <StatTiles totals={totals} />
          <PageAttentionChart pages={data.pages} />
          <Recipients recipients={data.recipients} />
          <RecentVisits visits={data.visits} />
        </>
      )}
    </section>
  )
}

function StatTiles({ totals }: { totals: ProposalAnalytics['totals'] }) {
  const tiles = [
    { label: 'Opens', value: String(totals.qualifiedVisits) },
    { label: 'Viewers', value: String(totals.distinctViewers) },
    { label: 'Total time', value: formatDuration(totals.totalEngagedMs / 1000) },
    { label: 'Last opened', value: formatRelative(totals.lastOpenedAt) },
    { label: 'Downloads', value: String(totals.downloads) },
    { label: 'Prints', value: String(totals.prints) },
  ]
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-md border border-neutral-200 px-3 py-2.5">
          <dt className="text-xs text-neutral-500">{t.label}</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-neutral-900">{t.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function PageAttentionChart({ pages }: { pages: Array<PageAttention> }) {
  const max = Math.max(1, ...pages.map((p) => p.engagedMs))

  return (
    <div className="mt-8">
      <h3 className="text-xs font-medium text-neutral-500">Attention by page</h3>
      <ul className="mt-3 space-y-2">
        {pages.map((page) => {
          const seconds = page.engagedMs / 1000
          const pct = (page.engagedMs / max) * 100
          const isPricing = page.section === 'pricing'
          // 'other' is the untagged default; leave the suffix off for it.
          const label = page.section === 'other' ? '' : SECTION_LABELS[page.section]
          return (
            <li key={page.pageNumber} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-neutral-500">
                Page {page.pageNumber}
                {label && <span className="text-neutral-400"> · {label}</span>}
              </span>
              <div className="h-2.5 flex-1 rounded-full bg-neutral-100">
                <div
                  className={`h-full rounded-full ${isPricing ? 'bg-amber-500' : 'bg-neutral-700'}`}
                  style={{ width: `${Math.max(pct, page.engagedMs > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-neutral-600">
                {seconds >= 1 ? formatDuration(seconds) : '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** "3 opens · 5m 12s", or "opened once · 12s" when it's a single read. */
function readerSummary(r: ReaderActivity): string {
  const opens = r.opens === 1 ? 'opened once' : `${r.opens} opens`
  return `${opens} · ${formatDuration(r.totalEngagedMs / 1000)}`
}

function EventBadges({ events }: { events: Array<string> }) {
  return (
    <>
      {events.map((e) => (
        <Badge key={e} className="bg-blue-50 text-blue-700">
          {e}
        </Badge>
      ))}
    </>
  )
}

function Recipients({ recipients }: { recipients: Array<RecipientActivity> }) {
  const opened = recipients.filter((r) => r.visits > 0)
  if (opened.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-xs font-medium text-neutral-500">Recipients &amp; forwards</h3>
      <ul className="mt-3 space-y-5">
        {opened.map((r) => {
          // `opened` guarantees visits > 0, so readers is never empty.
          const recipient = r.readers.find((x) => x.index === 1) ?? r.readers[0]
          const forwardees = r.readers.filter((x) => x.isForward)
          return (
            <li key={r.shareLinkId}>
              {/* The named recipient. */}
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {r.label}
                    {r.revoked && <Badge className="bg-neutral-100 text-neutral-500">revoked</Badge>}
                    <EventBadges events={recipient.events} />
                  </p>
                  <p className="text-xs text-neutral-500">{readerSummary(recipient)}</p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">
                  {formatRelative(recipient.lastOpenedAt)}
                </span>
              </div>

              {/* People it was forwarded to, branching off the recipient. */}
              {forwardees.length > 0 && (
                <>
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Forwarded to {forwardees.length} {forwardees.length === 1 ? 'person' : 'people'}
                  </p>
                  <ul className="mt-1.5 space-y-2 border-l border-neutral-200 pl-4">
                    {forwardees.map((f) => (
                      <li key={f.index} className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate text-sm text-neutral-700">
                            <CornerDownRight className="size-3.5 shrink-0 text-neutral-400" aria-hidden />
                            <span>Reader {f.index}</span>
                            <span className="truncate text-neutral-400">
                              · {f.device ?? 'unknown device'}
                            </span>
                            <EventBadges events={f.events} />
                          </p>
                          <p className="text-xs text-neutral-500">{readerSummary(f)}</p>
                        </div>
                        <span className="shrink-0 text-xs text-neutral-400">
                          {formatRelative(f.lastOpenedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RecentVisits({ visits }: { visits: Array<VisitActivity> }) {
  if (visits.length === 0) return null
  const recent = visits.slice(0, 12)

  return (
    <div className="mt-8">
      <h3 className="text-xs font-medium text-neutral-500">Recent visits</h3>
      <ul className="mt-3 divide-y divide-neutral-100">
        {recent.map((v) => (
          <li
            key={v.id}
            className={`flex items-center justify-between gap-3 py-2 ${v.isForward ? 'pl-4' : ''}`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-sm text-neutral-700">
                {v.isForward ? (
                  <>
                    <CornerDownRight className="size-3.5 shrink-0 text-amber-500" aria-hidden />
                    <span>Reader {v.viewerIndex}</span>
                    <span className="truncate text-neutral-400">forwarded from {v.recipientLabel}</span>
                  </>
                ) : (
                  <span className="truncate">{v.recipientLabel}</span>
                )}
                {v.isReturn && <Badge className="bg-neutral-100 text-neutral-600">return</Badge>}
                <EventBadges events={v.events} />
              </p>
              <p className="text-xs text-neutral-500">
                {formatRelative(v.startedAt)}
                {v.device && ` · ${v.device}`}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-neutral-600">
              {formatDuration(v.engagedMs / 1000)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}
