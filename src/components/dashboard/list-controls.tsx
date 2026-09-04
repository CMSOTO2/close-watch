import { Rows3 } from 'lucide-react'
import { HEAT_FILTERS, SORTS } from './sorting'
import { SearchField } from './search-field'
import { cn } from '#/lib/utils'
import type { HeatFilter, SortKey } from './sorting'

type Tab = 'active' | 'closed'

/** Tabs and search, plus on the active tab the sort and heat-filter selects. */
export function ListControls({
  tab,
  onTab,
  activeCount,
  closedCount,
  query,
  onQuery,
  grouped,
  onGrouped,
  sortKey,
  onSort,
  heat,
  onHeat,
}: {
  tab: Tab
  onTab: (tab: Tab) => void
  activeCount: number
  closedCount: number
  query: string
  onQuery: (query: string) => void
  grouped: boolean
  onGrouped: (grouped: boolean) => void
  sortKey: SortKey
  onSort: (key: SortKey) => void
  heat: HeatFilter
  onHeat: (heat: HeatFilter) => void
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="flex w-fit shrink-0 gap-[3px] rounded-md border border-line bg-surface-2 p-[3px]">
        <TabButton
          active={tab === 'active'}
          onClick={() => onTab('active')}
          label="Active"
          count={activeCount}
        />
        <TabButton
          active={tab === 'closed'}
          onClick={() => onTab('closed')}
          label="Closed"
          count={closedCount}
        />
      </div>

      <SearchField value={query} onChange={onQuery} />

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onGrouped(!grouped)}
          aria-pressed={grouped}
          title="Group proposals by client"
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] shadow-sm transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            grouped
              ? 'border-brand bg-brand-soft text-ink'
              : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3 hover:text-ink',
          )}
        >
          <Rows3 aria-hidden className="size-3.5" />
          Group
        </button>
      </div>

      {tab === 'active' && activeCount > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          <Select
            label="Filter by heat"
            value={heat}
            onChange={(v) => onHeat(v as HeatFilter)}
            options={HEAT_FILTERS}
            // "All heat" is the no-op default; anything else is a live filter
            // worth flagging in brass so a hidden row is never a surprise.
            isSet={heat !== 'all'}
          />
          <Select
            label="Sort proposals"
            value={sortKey}
            onChange={(v) => onSort(v as SortKey)}
            options={SORTS}
            isSet={sortKey !== 'priority'}
          />
        </div>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  isSet,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<{ key: string; label: string }>
  isSet: boolean
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'cursor-pointer rounded-md border py-1.5 pl-2.5 pr-1.5 text-[13px] shadow-sm transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        isSet
          ? 'border-brand bg-brand-soft text-ink'
          : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3 hover:text-ink',
      )}
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
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
      className={cn(
        'rounded px-3 py-1.5 text-[13px] font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        active ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink',
      )}
    >
      {label}{' '}
      <span
        className={cn(
          'font-mono text-[11px] tnum',
          active ? 'text-brand' : 'text-ink-3',
        )}
      >
        {count}
      </span>
    </button>
  )
}
