import { HEAT_FILTERS, SORTS } from './sorting'
import type { HeatFilter, SortKey } from './sorting'

type Tab = 'active' | 'closed'

/** Tabs plus, on the active tab, the sort and heat-filter selects. */
export function ListControls({
  tab,
  onTab,
  activeCount,
  closedCount,
  sortKey,
  onSort,
  heat,
  onHeat,
}: {
  tab: Tab
  onTab: (tab: Tab) => void
  activeCount: number
  closedCount: number
  sortKey: SortKey
  onSort: (key: SortKey) => void
  heat: HeatFilter
  onHeat: (heat: HeatFilter) => void
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-fit gap-1 rounded-lg bg-neutral-100 p-1 text-sm">
        <TabButton active={tab === 'active'} onClick={() => onTab('active')} label="Active" count={activeCount} />
        <TabButton active={tab === 'closed'} onClick={() => onTab('closed')} label="Closed" count={closedCount} />
      </div>

      {tab === 'active' && activeCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <select
            aria-label="Filter by heat"
            value={heat}
            onChange={(e) => onHeat(e.target.value as HeatFilter)}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-neutral-700"
          >
            {HEAT_FILTERS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort proposals"
            value={sortKey}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-neutral-700"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
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
