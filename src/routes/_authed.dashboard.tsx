import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getProposalSummaries, getSecuredTotals } from '#/lib/analytics/summaries'
import { queryKeys } from '#/constants'
import { ClosedRow } from '#/components/dashboard/closed-row'
import { ListControls } from '#/components/dashboard/list-controls'
import { ProposalRow } from '#/components/dashboard/proposal-row'
import { SecuredBanner } from '#/components/dashboard/secured-banner'
import { usePersistedChoice } from '#/components/dashboard/use-persisted-choice'
import {
  comparatorFor,
  HEAT_KEYS,
  isClosed,
  SORT_KEYS,
} from '#/components/dashboard/sorting'
import type { HeatFilter, SortKey } from '#/components/dashboard/sorting'

const summariesQuery = queryOptions({
  queryKey: queryKeys.proposalSummaries,
  queryFn: () => getProposalSummaries(),
})

const securedQuery = queryOptions({
  queryKey: queryKeys.securedTotals,
  queryFn: () => getSecuredTotals(),
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
  const [tab, setTab] = useState<'active' | 'closed'>('active')
  const [sortKey, setSortKey] = usePersistedChoice<SortKey>(
    'cw.dashboard.sort',
    'priority',
    SORT_KEYS,
  )
  const [heat, setHeat] = usePersistedChoice<HeatFilter>('cw.dashboard.heat', 'all', HEAT_KEYS)

  // Active: open deals. Default is hottest first — the point of this page is who
  // to call — but the owner can re-sort and filter by heat.
  // Closed: most recently finalized first.
  const activeAll = data.filter((p) => !isClosed(p))
  const active = activeAll
    .filter((p) => heat === 'all' || p.intent.band === heat)
    .sort(comparatorFor(sortKey))
  const closed = data
    .filter(isClosed)
    .sort((a, b) => (b.outcomeAt ?? '').localeCompare(a.outcomeAt ?? ''))
  const list = tab === 'active' ? active : closed

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Proposals</h1>
        <Link
          to="/proposals/new"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          New proposal
        </Link>
      </div>

      <SecuredBanner secured={secured} />

      {data.length === 0 ? (
        <div className="mt-10">
          <p className="text-sm text-neutral-500">
            Upload a proposal to get a tracked link.
          </p>
          <Link
            to="/proposals/new"
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Upload a proposal
          </Link>
        </div>
      ) : (
        <>
          <ListControls
            tab={tab}
            onTab={setTab}
            activeCount={activeAll.length}
            closedCount={closed.length}
            sortKey={sortKey}
            onSort={setSortKey}
            heat={heat}
            onHeat={setHeat}
          />

          {list.length === 0 ? (
            <p className="mt-8 text-sm text-neutral-500">
              {tab === 'active'
                ? activeAll.length === 0
                  ? 'No open proposals — every deal is closed.'
                  : 'No proposals match this filter.'
                : 'No closed deals yet.'}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-200">
              {list.map((p) =>
                tab === 'active' ? (
                  <ProposalRow key={p.id} proposal={p} />
                ) : (
                  <ClosedRow key={p.id} proposal={p} />
                ),
              )}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
