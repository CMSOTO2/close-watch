import { Link } from '@tanstack/react-router'
import { formatMoney } from '#/lib/utils'
import type { ProposalSummary } from '#/lib/analytics/summaries'

export function ClosedRow({ proposal }: { proposal: ProposalSummary }) {
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
