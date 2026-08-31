import { formatMoney } from '#/lib/utils'
import type { ProposalSummary } from '#/lib/analytics/summaries'

/**
 * Totals priced proposals, keeping each currency separate and joining them
 * rather than summing across — adding dollars to euros would be a lie, and the
 * server groups secured totals the same way.
 */
export function totalByCurrency(
  proposals: Array<ProposalSummary>,
): string | null {
  const totals = new Map<string, number>()
  for (const p of proposals) {
    if (p.dealValueCents == null) continue
    totals.set(p.currency, (totals.get(p.currency) ?? 0) + p.dealValueCents)
  }
  if (totals.size === 0) return null

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([currency, cents]) => formatMoney(cents, currency))
    .join(' · ')
}
