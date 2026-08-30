import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
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

function Dashboard() {
  const { data } = useSuspenseQuery(summariesQuery)
  const { data: secured } = useSuspenseQuery(securedQuery)

  // Hottest first. The point of opening this page is knowing who to call.
  const sorted = [...data].sort((a, b) => b.intent.score - a.intent.score)

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

      {sorted.length === 0 ? (
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
        <ul className="mt-6 divide-y divide-neutral-200">
          {sorted.map((p) => (
            <ProposalRow key={p.id} proposal={p} />
          ))}
        </ul>
      )}
    </div>
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
