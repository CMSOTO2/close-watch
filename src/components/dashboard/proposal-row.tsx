import { Link } from '@tanstack/react-router'
import { formatDuration } from '#/lib/analytics/intent'
import { formatMoney } from '#/lib/utils'
import type { ProposalSummary } from '#/lib/analytics/summaries'

const BAND_STYLE = {
  hot: 'bg-red-50 text-red-700',
  warm: 'bg-amber-50 text-amber-700',
  cold: 'bg-neutral-100 text-neutral-500',
} as const

export function ProposalRow({ proposal }: { proposal: ProposalSummary }) {
  const { intent } = proposal

  return (
    <li className="py-4">
      <Link
        to="/proposals/$id"
        params={{ id: proposal.id }}
        className="block -mx-2 rounded-md px-2 py-1 hover:bg-neutral-50"
      >
        <div className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{proposal.clientName}</p>
            <p className="truncate text-sm text-neutral-500">{proposal.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {proposal.dealValueCents != null && (
              <span className="text-sm font-medium tabular-nums text-neutral-700">
                {formatMoney(proposal.dealValueCents, proposal.currency)}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BAND_STYLE[intent.band]}`}>
              {intent.band}
            </span>
          </div>
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
