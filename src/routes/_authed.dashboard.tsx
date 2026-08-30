import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { formatDuration } from '#/lib/analytics/intent'
import { getProposalSummaries, getSecuredTotals } from '#/lib/analytics/summaries'
import { formatMoney } from '#/lib/utils'
import { queryKeys } from '#/constants'
import type { ProposalSummary, SecuredTotal } from '#/lib/analytics/summaries'

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

const isClosed = (p: ProposalSummary) => p.status === 'won' || p.status === 'lost'

function Dashboard() {
  const { data } = useSuspenseQuery(summariesQuery)
  const { data: secured } = useSuspenseQuery(securedQuery)
  const [tab, setTab] = useState<'active' | 'closed'>('active')

  // Active: open deals, hottest first — the point of this page is who to call.
  // Closed: most recently finalized first.
  const active = data.filter((p) => !isClosed(p)).sort((a, b) => b.intent.score - a.intent.score)
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
          <div className="mt-6 flex w-fit gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
            <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="Active" count={active.length} />
            <TabButton active={tab === 'closed'} onClick={() => setTab('closed')} label="Closed" count={closed.length} />
          </div>

          {list.length === 0 ? (
            <p className="mt-8 text-sm text-neutral-500">
              {tab === 'active' ? 'No open proposals — every deal is closed.' : 'No closed deals yet.'}
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

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 font-medium transition ${
        active ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
      }`}
    >
      {label} <span className="tabular-nums text-neutral-400">{count}</span>
    </button>
  )
}

function ClosedRow({ proposal }: { proposal: ProposalSummary }) {
  const won = proposal.status === 'won'
  const date = proposal.outcomeAt
    ? new Date(proposal.outcomeAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <li className="py-4">
      <Link
        to="/proposals/$id"
        params={{ id: proposal.id }}
        className="-mx-2 block rounded-md px-2 py-1 hover:bg-neutral-50"
      >
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{proposal.clientName}</p>
            <p className="truncate text-sm text-neutral-500">{proposal.title}</p>
          </div>
          <div className="shrink-0 text-right">
            {proposal.dealValueCents != null && (
              <p className={`text-sm font-medium ${won ? 'text-green-700' : 'text-neutral-500'}`}>
                {formatMoney(proposal.dealValueCents, proposal.currency)}
              </p>
            )}
            <p className="text-xs text-neutral-400">
              {won ? 'Won' : 'Lost'}
              {date && ` · ${date}`}
            </p>
          </div>
        </div>
      </Link>
    </li>
  )
}

function SecuredBanner({ secured }: { secured: Array<SecuredTotal> }) {
  const withValue = secured.filter((s) => s.allTimeCents > 0)
  if (withValue.length === 0) return null

  const allTime = withValue.map((s) => formatMoney(s.allTimeCents, s.currency)).join(' · ')
  const last30 = withValue
    .filter((s) => s.last30Cents > 0)
    .map((s) => formatMoney(s.last30Cents, s.currency))
    .join(' · ')

  return (
    <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-green-700/70">
        Secured with Closewatch
      </p>
      <p className="mt-1 text-2xl font-semibold text-green-700">{allTime}</p>
      {last30 && <p className="mt-0.5 text-sm text-green-600">+{last30} in the last 30 days</p>}
    </div>
  )
}

const BAND_STYLE = {
  hot: 'bg-red-50 text-red-700',
  warm: 'bg-amber-50 text-amber-700',
  cold: 'bg-neutral-100 text-neutral-500',
} as const

function ProposalRow({ proposal }: { proposal: ProposalSummary }) {
  const { intent } = proposal

  return (
    <li className="py-4">
      <Link
        to="/proposals/$id"
        params={{ id: proposal.id }}
        className="block -mx-2 rounded-md px-2 py-1 hover:bg-neutral-50"
      >
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-medium">{proposal.clientName}</p>
          <p className="text-sm text-neutral-500">{proposal.title}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BAND_STYLE[intent.band]}`}>
          {intent.band}
        </span>
      </div>

      <p className="mt-2 text-sm text-neutral-700">
        {proposal.qualifiedVisits === 0
          ? 'Not opened yet'
          : `Viewed ${proposal.qualifiedVisits} ${proposal.qualifiedVisits === 1 ? 'time' : 'times'} · ${formatDuration(proposal.totalEngagedMs / 1000)} total`}
      </p>

      {intent.signals.length > 0 && (
        <ul className="mt-1 text-sm text-neutral-500">
          {intent.signals.slice(0, 3).map((s) => (
            <li key={s.label}>{s.label}</li>
          ))}
        </ul>
      )}
      </Link>
    </li>
  )
}
