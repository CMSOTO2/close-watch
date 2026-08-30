import { formatMoney } from '#/lib/utils'
import type { SecuredTotal } from '#/lib/analytics/summaries'

export function SecuredBanner({ secured }: { secured: Array<SecuredTotal> }) {
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
