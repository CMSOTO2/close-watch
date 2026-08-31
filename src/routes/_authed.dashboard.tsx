import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getProposalSummaries,
  getSecuredTotals,
} from '#/lib/analytics/summaries'
import { queryKeys } from '#/constants'
import { ClosedRow } from '#/components/dashboard/closed-row'
import { ListControls } from '#/components/dashboard/list-controls'
import { ProposalRow } from '#/components/dashboard/proposal-row'
import { ClientGroup } from '#/components/dashboard/client-group'
import { groupByClient } from '#/components/dashboard/grouping'
import { filterByQuery } from '#/components/dashboard/search'
import { useListKeys } from '#/components/dashboard/use-list-keys'
import {
  sinceLabel,
  useSinceLastVisit,
} from '#/components/dashboard/since-last-visit'
import { PageContainer } from '#/components/page-container'
import { Button } from '#/components/ui/button'
import { SummaryStrip } from '#/components/dashboard/summary-strip'
import { usePersistedChoice } from '#/components/dashboard/use-persisted-choice'
import {
  comparatorFor,
  HEAT_KEYS,
  isClosed,
  SORT_KEYS,
} from '#/components/dashboard/sorting'
import type { HeatFilter, SortKey } from '#/components/dashboard/sorting'
import type { Delta } from '#/components/dashboard/since-last-visit'
import type { ProposalSummary } from '#/lib/analytics/summaries'

const GROUP_KEYS = ['on', 'off'] as const

// refetchOnMount: 'always' — the first render right after login can run its
// SSR fetch before the Supabase session is fully in play, caching an empty
// list that is then served as fresh until a mutation invalidates it. Forcing a
// mount refetch (which carries the now-present auth cookie) repopulates the
// list on the client without waiting for the user to create a proposal.
const summariesQuery = queryOptions({
  queryKey: queryKeys.proposalSummaries,
  queryFn: () => getProposalSummaries(),
  refetchOnMount: 'always',
})

const securedQuery = queryOptions({
  queryKey: queryKeys.securedTotals,
  queryFn: () => getSecuredTotals(),
  refetchOnMount: 'always',
})

export const Route = createFileRoute('/_authed/dashboard')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(summariesQuery),
      context.queryClient.query(securedQuery),
    ]),
  component: Dashboard,
})

function Dashboard() {
  const { data } = useSuspenseQuery(summariesQuery)
  const { data: secured } = useSuspenseQuery(securedQuery)
  useListKeys()
  const { deltas, since } = useSinceLastVisit(data)
  const [tab, setTab] = useState<'active' | 'closed'>('active')
  // Not persisted, unlike sort and heat: a query restored on next login would
  // hide rows for a reason the owner no longer remembers setting.
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = usePersistedChoice<SortKey>(
    'cw.dashboard.sort',
    'priority',
    SORT_KEYS,
  )
  const [heat, setHeat] = usePersistedChoice<HeatFilter>(
    'cw.dashboard.heat',
    'all',
    HEAT_KEYS,
  )
  const [grouping, setGrouping] = usePersistedChoice<'on' | 'off'>(
    'cw.dashboard.group',
    'off',
    GROUP_KEYS,
  )
  const grouped = grouping === 'on'
  // Collapsed rather than expanded, so a group never silently hides rows the
  // owner has not chosen to fold away. Session-only: which groups are shut is
  // a scratch decision, not a preference worth restoring weeks later.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }

  // Active: open deals. Default is hottest first — the point of this page is who
  // to call — but the owner can re-sort and filter by heat.
  // Closed: most recently finalized first.
  //
  // Search narrows both tabs, so the tab counts report matches and a query that
  // only hits the other tab can say so rather than looking like no results.
  const activeAll = data.filter((p) => !isClosed(p))
  const activeMatched = filterByQuery(activeAll, query)
  const closedMatched = filterByQuery(data.filter(isClosed), query)

  const active = activeMatched
    .filter((p) => heat === 'all' || p.intent.band === heat)
    .sort(comparatorFor(sortKey))
  const closed = [...closedMatched].sort((a, b) =>
    (b.outcomeAt ?? '').localeCompare(a.outcomeAt ?? ''),
  )
  const list = tab === 'active' ? active : closed
  const hotCount = activeAll.filter((p) => p.intent.band === 'hot').length
  const otherTabMatches =
    tab === 'active' ? closedMatched.length : activeMatched.length
  const news = since === null ? null : summarizeNews(deltas, since)
  const entries = grouped
    ? groupByClient(list)
    : list.map((proposal) => ({ kind: 'single' as const, proposal }))

  return (
    <PageContainer className="py-8 sm:py-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Proposals
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {activeAll.length === 0
              ? 'Nothing open right now.'
              : `${activeAll.length} open ${activeAll.length === 1 ? 'deal' : 'deals'} \u00b7 ${hotCount} running hot`}
          </p>
          {news !== null && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-brand">
              <span aria-hidden className="size-1.5 rounded-full bg-brand" />
              {news}
            </p>
          )}
        </div>
        <Button asChild size="sm">
          <Link to="/proposals/new">
            <span aria-hidden className="text-base leading-none opacity-70">
              +
            </span>
            New proposal
          </Link>
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="mt-10 rounded-lg border border-line bg-surface px-6 py-10 text-center shadow-sm">
          <p className="font-display text-lg font-semibold tracking-tight">
            No proposals yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-2">
            Upload a proposal to get a tracked link — you will see who opened
            it, how long they read, and when a deal is worth a call.
          </p>
          <Button asChild className="mt-5">
            <Link to="/proposals/new">Upload a proposal</Link>
          </Button>
        </div>
      ) : (
        <>
          <SummaryStrip secured={secured} active={activeAll} />

          <ListControls
            tab={tab}
            onTab={setTab}
            activeCount={activeMatched.length}
            closedCount={closedMatched.length}
            query={query}
            onQuery={setQuery}
            grouped={grouped}
            onGrouped={(next) => setGrouping(next ? 'on' : 'off')}
            sortKey={sortKey}
            onSort={setSortKey}
            heat={heat}
            onHeat={setHeat}
          />

          {list.length === 0 ? (
            <EmptyList
              tab={tab}
              query={query}
              onClearQuery={() => setQuery('')}
              hasOpenDeals={activeAll.length > 0}
              otherTabMatches={otherTabMatches}
              onSwitchTab={() => setTab(tab === 'active' ? 'closed' : 'active')}
            />
          ) : (
            <ul className="mt-3.5 flex flex-col gap-2">
              {entries.map((entry) =>
                entry.kind === 'single' ? (
                  <Row
                    key={entry.proposal.id}
                    tab={tab}
                    proposal={entry.proposal}
                    delta={deltas.get(entry.proposal.id)}
                  />
                ) : (
                  <ClientGroup
                    key={entry.key}
                    group={entry}
                    open={!collapsed.has(entry.key)}
                    onToggle={() => toggleGroup(entry.key)}
                  >
                    {entry.proposals.map((p) => (
                      <Row
                        key={p.id}
                        tab={tab}
                        proposal={p}
                        delta={deltas.get(p.id)}
                      />
                    ))}
                  </ClientGroup>
                ),
              )}
            </ul>
          )}
        </>
      )}
    </PageContainer>
  )
}

/**
 * Why the list is empty is different every time — no deals at all, a heat
 * filter, a search that only matches the other tab — and each case has its own
 * way out, so the message carries the action rather than just stating the fact.
 */
function EmptyList({
  tab,
  query,
  onClearQuery,
  hasOpenDeals,
  otherTabMatches,
  onSwitchTab,
}: {
  tab: 'active' | 'closed'
  query: string
  onClearQuery: () => void
  hasOpenDeals: boolean
  otherTabMatches: number
  onSwitchTab: () => void
}) {
  const other = tab === 'active' ? 'closed' : 'active'

  return (
    <div className="mt-8 rounded-md border border-dashed border-line px-4 py-8 text-center">
      <p className="text-[13px] text-ink-2">
        {query ? (
          <>
            No {tab} proposals match{' '}
            <span className="font-medium text-ink">“{query}”</span>.
          </>
        ) : tab === 'active' ? (
          hasOpenDeals ? (
            'No proposals match this filter.'
          ) : (
            'No open proposals \u2014 every deal is closed.'
          )
        ) : (
          'No closed deals yet.'
        )}
      </p>

      {query && otherTabMatches > 0 && (
        <button
          onClick={onSwitchTab}
          className="mt-2 text-[13px] font-medium text-brand hover:underline"
        >
          {otherTabMatches} {other}{' '}
          {otherTabMatches === 1 ? 'proposal matches' : 'proposals match'} —
          show {other}
        </button>
      )}

      {query && otherTabMatches === 0 && (
        <button
          onClick={onClearQuery}
          className="mt-2 text-[13px] font-medium text-brand hover:underline"
        >
          Clear search
        </button>
      )}
    </div>
  )
}

function Row({
  tab,
  proposal,
  delta,
}: {
  tab: 'active' | 'closed'
  proposal: ProposalSummary
  delta?: Delta
}) {
  return tab === 'active' ? (
    <ProposalRow proposal={proposal} delta={delta} />
  ) : (
    <ClosedRow proposal={proposal} />
  )
}

/**
 * The one line that turns the page from a table into news. Silent when nothing
 * moved — an always-present "0 new opens" would train the eye to skip it.
 */
function summarizeNews(
  deltas: Map<string, Delta>,
  since: string,
): string | null {
  if (deltas.size === 0) return null

  let opens = 0
  for (const d of deltas.values()) opens += d.opens

  const where = `${deltas.size} proposal${deltas.size === 1 ? '' : 's'}`
  if (opens === 0) return `Activity on ${where} ${sinceLabel(since)}`
  return `${opens} new open${opens === 1 ? '' : 's'} across ${where} ${sinceLabel(since)}`
}
