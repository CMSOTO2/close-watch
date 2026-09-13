import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { CornerDownRight } from 'lucide-react'
import { getProposalAnalytics } from '#/lib/analytics/proposal-analytics'
import { formatDuration } from '#/lib/analytics/intent'
import { SECTION_LABELS, queryKeys } from '#/constants'
import { formatDay, useTimeZone } from '#/lib/local-date'
import { sinceLabel } from '#/components/dashboard/since-last-visit'
import { useSinceLastCheck } from '#/components/proposal-activity-delta'
import type { ActivityDelta } from '#/components/proposal-activity-delta'
import type {
  OwnerPreview,
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
  // Hooks cannot sit behind the early return below, and the analytics query is
  // suspense-backed, so `data` is only null for a proposal with no rows at all.
  const empty = {
    qualifiedVisits: 0,
    distinctViewers: 0,
    totalEngagedMs: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
    botVisits: 0,
    downloads: 0,
    prints: 0,
  }
  const { delta, since } = useSinceLastCheck(proposalId, data?.totals ?? empty)

  if (!data) return null

  const { totals } = data

  return (
    <section className="mt-10">
      <h2 className="font-display text-base font-semibold tracking-tight">
        Activity
      </h2>

      {delta !== null && since !== null && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-brand">
          <span aria-hidden className="size-1.5 rounded-full bg-brand-2" />
          {summarizeDelta(delta)} {sinceLabel(since)}
        </p>
      )}

      {totals.qualifiedVisits === 0 ? (
        <p className="mt-3 text-[13px] text-ink-2">
          No qualified opens yet.
          {totals.botVisits > 0 &&
            ` ${totals.botVisits} automated ${totals.botVisits === 1 ? 'fetch was' : 'fetches were'} filtered out.`}
        </p>
      ) : (
        <>
          <StatTiles totals={totals} delta={delta} />
          <PageAttentionChart pages={data.pages} />
          <RecentVisits visits={data.visits} since={since} />
        </>
      )}

      {data.ownerPreview && <OwnerPreviewPanel preview={data.ownerPreview} />}
    </section>
  )
}

/**
 * The owner's own reads, shown as what they are.
 *
 * This is the first-run win: a new account can see the report work on their
 * own proposal before any client is involved. It sits under the client numbers
 * and never inside them.
 */
function OwnerPreviewPanel({ preview }: { preview: OwnerPreview }) {
  const timeZone = useTimeZone()
  return (
    <div className="mt-8 rounded-lg border border-line bg-surface-2 px-4 py-4">
      <h3 className="kicker">Your preview</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
        You read it for {formatDuration(preview.engagedMs / 1000)}, last{' '}
        {formatRelative(preview.lastSeenAt, timeZone)}. When your client opens
        the link, their read turns into a report like this one. Your own opens
        stay separate: they never count as a client open, never use a free slot,
        and never email you.
      </p>
      <PageAttentionChart pages={preview.pages} />
    </div>
  )
}

/**
 * The headline for the delta line, in the order a reader cares about: who
 * looked, then how many of them, then what they did. Reading time is left out
 * of the sentence — it is on its own tile, and "3 new opens and 4m 20s more
 * reading" is a mouthful for something the tiles already say.
 */
function summarizeDelta(delta: ActivityDelta): string {
  const parts: Array<string> = []
  const add = (n: number, one: string, many: string) => {
    if (n > 0) parts.push(`${n} new ${n === 1 ? one : many}`)
  }

  add(delta.opens, 'open', 'opens')
  add(delta.viewers, 'reader', 'readers')
  add(delta.downloads, 'download', 'downloads')
  add(delta.prints, 'print', 'prints')

  if (parts.length === 0) {
    // Only the clock moved: someone re-read a proposal they had already opened.
    return `${formatDuration(delta.engagedMs / 1000)} more reading`
  }
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

function StatTiles({
  totals,
  delta,
}: {
  totals: ProposalAnalytics['totals']
  delta: ActivityDelta | null
}) {
  const timeZone = useTimeZone()
  const tiles = [
    { label: 'Opens', value: String(totals.qualifiedVisits), up: delta?.opens },
    {
      label: 'Viewers',
      value: String(totals.distinctViewers),
      up: delta?.viewers,
    },
    {
      label: 'Total time',
      value: formatDuration(totals.totalEngagedMs / 1000),
      // Seconds, not a count: shown as "+1m 20s" rather than "+80".
      upLabel:
        delta && delta.engagedMs > 0
          ? `+${formatDuration(delta.engagedMs / 1000)}`
          : null,
    },
    {
      label: 'Last opened',
      value: formatRelative(totals.lastOpenedAt, timeZone),
    },
    {
      label: 'Downloads',
      value: String(totals.downloads),
      up: delta?.downloads,
    },
    { label: 'Prints', value: String(totals.prints), up: delta?.prints },
  ]
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-md border border-line bg-surface px-3 py-2.5 shadow-sm"
        >
          <dt className="kicker">{t.label}</dt>
          <dd className="mt-1 flex items-baseline gap-1.5 font-display text-lg font-semibold tracking-tight tnum text-ink">
            {t.value}
            {(t.upLabel ?? (t.up ? `+${t.up}` : null)) && (
              <span className="text-[12px] font-medium text-brand">
                {t.upLabel ?? `+${t.up}`}
              </span>
            )}
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
        <Badge
          key={e}
          className="border border-warm-line bg-warm-soft text-warm"
        >
          {e}
        </Badge>
      ))}
    </>
  )
}

function RecentVisits({
  visits,
  since,
}: {
  visits: Array<VisitActivity>
  /** When this page was last open; visits after it are marked new. */
  since: string | null
}) {
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
                      className="size-3.5 shrink-0 text-brand-2"
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
                {since !== null && v.startedAt > since && (
                  <Badge className="border border-brand-line bg-brand-soft text-brand">
                    new
                  </Badge>
                )}
                {v.isReturn && (
                  <Badge className="bg-surface-3 text-ink">return</Badge>
                )}
                <EventBadges events={v.events} />
              </p>
              <p className="truncate text-xs text-ink-3">
                {formatRelative(v.startedAt, timeZone)}
                {v.device && ` · ${v.device}`}
                {v.location && ` · ${v.location}`}
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
