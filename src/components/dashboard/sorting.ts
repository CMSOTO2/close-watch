import type { ProposalSummary } from '#/lib/analytics/summaries'

export const isClosed = (p: ProposalSummary) => p.status === 'won' || p.status === 'lost'

// Sort options for the active list. Nulls (no price / never viewed) always sort
// last, regardless of direction, so an empty field never jumps to the top.
export type SortKey =
  | 'priority'
  | 'recent'
  | 'oldest'
  | 'price-desc'
  | 'price-asc'
  | 'viewed'
  | 'engaged'

export const SORTS: ReadonlyArray<{
  key: SortKey
  label: string
  cmp: (a: ProposalSummary, b: ProposalSummary) => number
}> = [
  { key: 'priority', label: 'Priority (hottest)', cmp: (a, b) => b.intent.score - a.intent.score },
  { key: 'recent', label: 'Newest first', cmp: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  { key: 'oldest', label: 'Oldest first', cmp: (a, b) => a.createdAt.localeCompare(b.createdAt) },
  {
    key: 'price-desc',
    label: 'Price: high to low',
    cmp: (a, b) => (b.dealValueCents ?? -1) - (a.dealValueCents ?? -1),
  },
  {
    key: 'price-asc',
    label: 'Price: low to high',
    cmp: (a, b) => (a.dealValueCents ?? Infinity) - (b.dealValueCents ?? Infinity),
  },
  {
    key: 'viewed',
    label: 'Recently viewed',
    cmp: (a, b) => (b.lastViewedAt ?? '').localeCompare(a.lastViewedAt ?? ''),
  },
  { key: 'engaged', label: 'Most engaged', cmp: (a, b) => b.totalEngagedMs - a.totalEngagedMs },
]

export type HeatFilter = 'all' | 'hot' | 'warm' | 'cold'
export const HEAT_FILTERS: ReadonlyArray<{ key: HeatFilter; label: string }> = [
  { key: 'all', label: 'All heat' },
  { key: 'hot', label: 'Hot' },
  { key: 'warm', label: 'Warm' },
  { key: 'cold', label: 'Cold' },
]

// Module-level (stable references) so they can sit in the persistence hook's
// effect deps without re-running it every render.
export const SORT_KEYS = SORTS.map((s) => s.key)
export const HEAT_KEYS = HEAT_FILTERS.map((f) => f.key)

/** The comparator for a sort key, falling back to the default (priority) sort. */
export function comparatorFor(key: SortKey) {
  return (SORTS.find((s) => s.key === key) ?? SORTS[0]).cmp
}
