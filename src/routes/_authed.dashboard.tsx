import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { OPEN_FOLDER_KEY, foldersQuery } from '#/lib/folders'
import { FolderBar } from '#/components/dashboard/folder-bar'
import {
  getSecuredTotals,
  proposalSummariesQuery,
} from '#/lib/analytics/summaries'
import { queryKeys } from '#/constants'
import { ClosedRow } from '#/components/dashboard/closed-row'
import { ListControls } from '#/components/dashboard/list-controls'
import { ProposalPreview } from '#/components/dashboard/proposal-preview'
import { ProposalRow } from '#/components/dashboard/proposal-row'
import { filterByQuery } from '#/components/dashboard/search'
import { useListKeys } from '#/components/dashboard/use-list-keys'
import {
  sinceLabel,
  useSinceLastVisit,
} from '#/components/dashboard/since-last-visit'
import { entitlementsQuery } from '#/lib/billing/entitlements'
import { PageContainer } from '#/components/page-container'
import { Button } from '#/components/ui/button'
import { SummaryStrip } from '#/components/dashboard/summary-strip'
import { usePersistedChoice } from '#/components/dashboard/use-persisted-choice'
import {
  comparatorFor,
  HEAT_KEYS,
  isClosed,
  SORT_KEYS,
} from '#/components/dashboard/sorting'
import type { HeatFilter, SortKey } from '#/components/dashboard/sorting'
import type { Delta } from '#/components/dashboard/since-last-visit'
import type { ProposalSummary } from '#/lib/analytics/summaries'

const summariesQuery = proposalSummariesQuery

const securedQuery = queryOptions({
  queryKey: queryKeys.securedTotals,
  queryFn: () => getSecuredTotals(),
  refetchOnMount: 'always',
})

export const Route = createFileRoute('/_authed/dashboard')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query(summariesQuery),
      context.queryClient.query(securedQuery),
      context.queryClient.query(entitlementsQuery),
      context.queryClient.query(foldersQuery),
    ]),
  component: Dashboard,
})

function Dashboard() {
  const { data } = useSuspenseQuery(summariesQuery)
  const { data: secured } = useSuspenseQuery(securedQuery)
  const { data: entitlements } = useSuspenseQuery(entitlementsQuery)
  useListKeys()
  const { deltas, since } = useSinceLastVisit(data)
  const [tab, setTab] = useState<'active' | 'closed'>('active')
  // Not persisted, unlike sort and heat: a query restored on next login would
  // hide rows for a reason the owner no longer remembers setting.
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = usePersistedChoice<SortKey>(
    'cw.dashboard.sort',
    'priority',
    SORT_KEYS,
  )
  const [heat, setHeat] = usePersistedChoice<HeatFilter>(
    'cw.dashboard.heat',
    'all',
    HEAT_KEYS,
  )
  // The open folder: 'all', 'none' for proposals in no folder, or a folder
  // id. Applied before everything else, so the tabs, the counts and the
  // summary all describe the one folder being looked at.
  const { data: folders } = useSuspenseQuery(foldersQuery)
  // The account's own name, which a folder without its own sends as.
  const { user } = Route.useRouteContext()
  const folderKeys = useMemo(
    () => ['all', 'none', ...folders.map((f) => f.id)],
    [folders],
  )
  const [storedFolder, setFolder] = usePersistedChoice<string>(
    OPEN_FOLDER_KEY,
    'all',
    folderKeys,
  )
  // A remembered folder that has since been removed falls back to everything.
  const folder = folderKeys.includes(storedFolder) ? storedFolder : 'all'
  const scoped =
    folder === 'all'
      ? data
      : data.filter((p) =>
          folder === 'none' ? p.folderId === null : p.folderId === folder,
        )
  // Under All, each row says which folder it is in. Inside a folder that
  // would only repeat the folder being looked at.
  const folderNames = new Map(folders.map((f) => [f.id, f.name]))
  const folderNameOf = (p: ProposalSummary) =>
    folder === 'all' && p.folderId
      ? (folderNames.get(p.folderId) ?? null)
      : null

  // Active: open deals. Default is hottest first — the point of this page is who
  // to call — but the owner can re-sort and filter by heat.
  // Closed: most recently finalized first.
  //
  // Search narrows both tabs, so the tab counts report matches and a query that
  // only hits the other tab can say so rather than looking like no results.
  const activeAll = scoped.filter((p) => !isClosed(p))
  const activeMatched = filterByQuery(activeAll, query)
  const closedMatched = filterByQuery(scoped.filter(isClosed), query)

  const active = activeMatched
    .filter((p) => heat === 'all' || p.intent.band === heat)
    .sort(comparatorFor(sortKey))
  // Archived rows carry no outcome date, by design, so they fall back to when
  // they were created. Sorting on outcomeAt alone would drop every one of them
  // to the bottom of the list in a heap, ordered by nothing a reader can see.
  const closed = [...closedMatched].sort((a, b) =>
    (b.outcomeAt ?? b.createdAt).localeCompare(a.outcomeAt ?? a.createdAt),
  )
  const list = tab === 'active' ? active : closed
  const hotCount = activeAll.filter((p) => p.intent.band === 'hot').length
  const otherTabMatches =
    tab === 'active' ? closedMatched.length : activeMatched.length
  const news = since === null ? null : summarizeNews(deltas, since)

  // The preview pane: open deals on a wide screen only. The selection follows
  // the list, so a filter that hides the selected row falls back to the top.
  const wide = useWideScreen()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const preview =
    wide && tab === 'active' && list.length > 0
      ? (list.find((p) => p.id === selectedId) ?? list[0])
      : null
  const limit = entitlements.liveProposalLimit

  return (
    <PageContainer className="py-8 sm:py-9">
      <div>
        <h1 className="font-display text-2xl">Proposals</h1>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {activeAll.length === 0
            ? 'Nothing open right now.'
            : `${activeAll.length} open ${activeAll.length === 1 ? 'deal' : 'deals'} \u00b7 ${hotCount} running hot`}
        </p>
        {news !== null && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-brand">
            <span aria-hidden className="size-1.5 rounded-full bg-brand-2" />
            {news}
          </p>
        )}
        {/* Only within one slot of the cap. A free plan that announces itself
            on every visit is an advert; this is a warning, and a warning that
            fires early enough to be useful. */}
        {limit !== null && entitlements.liveProposals >= limit - 1 && (
          <p className="mt-1.5 text-[13px] text-ink-2">
            {/* "Being read", not "live": a slot is spent when a client opens
                the proposal, so someone can have more out than this number and
                the plain word would look like a miscount. */}
            {entitlements.liveProposals} of {limit} free slots used, counting
            proposals a client has opened.{' '}
            <Link to="/settings" className="text-brand hover:underline">
              {entitlements.liveProposals >= limit
                ? 'Close one out or go Solo'
                : 'Go Solo for unlimited'}
            </Link>
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <div className="mt-10 rounded-lg border border-line bg-surface px-6 py-10 text-center shadow-sm">
          <p className="font-display text-xl">No proposals yet</p>
          {/* Every real signup so far stopped here, with no proposal. The
              first step used to read as "put this in front of a client",
              which is a big ask of a tool you have not seen work. Now it is a
              step that involves nobody else. */}
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ink-2">
            Upload any proposal PDF and open its link yourself to see the report
            a client&rsquo;s read produces.
          </p>
          <Button asChild className="mt-5">
            <Link to="/proposals/new">Upload a proposal</Link>
          </Button>
        </div>
      ) : (
        <>
          <FolderBar
            folders={folders}
            proposals={data}
            selected={folder}
            onSelect={setFolder}
            mainName={user.companyName}
          />

          <SummaryStrip secured={secured} active={activeAll} />

          <ListControls
            tab={tab}
            onTab={setTab}
            activeCount={activeMatched.length}
            closedCount={closedMatched.length}
            query={query}
            onQuery={setQuery}
            sortKey={sortKey}
            onSort={setSortKey}
            heat={heat}
            onHeat={setHeat}
          />

          {list.length === 0 ? (
            <EmptyList
              tab={tab}
              query={query}
              onClearQuery={() => setQuery('')}
              hasOpenDeals={activeAll.length > 0}
              otherTabMatches={otherTabMatches}
              onSwitchTab={() => setTab(tab === 'active' ? 'closed' : 'active')}
            />
          ) : (
            <div
              className={
                preview
                  ? 'mt-3.5 grid grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)] items-start gap-5'
                  : 'mt-3.5'
              }
            >
              <ul className="@container flex flex-col gap-2">
                {list.map((p) => (
                  <Row
                    key={p.id}
                    tab={tab}
                    proposal={p}
                    delta={deltas.get(p.id)}
                    folderName={folderNameOf(p)}
                    selected={preview?.id === p.id}
                    onSelect={preview ? setSelectedId : undefined}
                  />
                ))}
              </ul>
              {preview && (
                <div className="sticky top-20">
                  <ProposalPreview proposal={preview} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}

/**
 * Whether the preview pane has room. Off during SSR and the first client
 * render, so the server's HTML and hydration agree; the pane appears a frame
 * later on a wide screen, and never on a phone.
 */
function useWideScreen(): boolean {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return wide
}

/**
 * Why the list is empty is different every time — no deals at all, a heat
 * filter, a search that only matches the other tab — and each case has its own
 * way out, so the message carries the action rather than just stating the fact.
 */
function EmptyList({
  tab,
  query,
  onClearQuery,
  hasOpenDeals,
  otherTabMatches,
  onSwitchTab,
}: {
  tab: 'active' | 'closed'
  query: string
  onClearQuery: () => void
  hasOpenDeals: boolean
  otherTabMatches: number
  onSwitchTab: () => void
}) {
  const other = tab === 'active' ? 'closed' : 'active'

  return (
    <div className="mt-8 rounded-md border border-dashed border-line px-4 py-8 text-center">
      <p className="text-[13px] text-ink-2">
        {query ? (
          <>
            No {tab} proposals match{' '}
            <span className=" text-ink">“{query}”</span>.
          </>
        ) : tab === 'active' ? (
          hasOpenDeals ? (
            'No proposals match this filter.'
          ) : (
            'No open proposals \u2014 every deal is closed.'
          )
        ) : (
          'No closed deals yet.'
        )}
      </p>

      {query && otherTabMatches > 0 && (
        <button
          onClick={onSwitchTab}
          className="mt-2 text-[13px] text-brand hover:underline"
        >
          {otherTabMatches} {other}{' '}
          {otherTabMatches === 1 ? 'proposal matches' : 'proposals match'} —
          show {other}
        </button>
      )}

      {query && otherTabMatches === 0 && (
        <button
          onClick={onClearQuery}
          className="mt-2 text-[13px] text-brand hover:underline"
        >
          Clear search
        </button>
      )}
    </div>
  )
}

function Row({
  tab,
  proposal,
  delta,
  folderName,
  selected,
  onSelect,
}: {
  tab: 'active' | 'closed'
  proposal: ProposalSummary
  delta?: Delta
  folderName: string | null
  selected: boolean
  onSelect?: (id: string) => void
}) {
  return tab === 'active' ? (
    <ProposalRow
      proposal={proposal}
      delta={delta}
      folderName={folderName}
      selected={selected}
      onSelect={onSelect}
    />
  ) : (
    <ClosedRow proposal={proposal} folderName={folderName} />
  )
}

/**
 * The one line that turns the page from a table into news. Silent when nothing
 * moved — an always-present "0 new opens" would train the eye to skip it.
 */
function summarizeNews(
  deltas: Map<string, Delta>,
  since: string,
): string | null {
  if (deltas.size === 0) return null

  let opens = 0
  for (const d of deltas.values()) opens += d.opens

  const where = `${deltas.size} proposal${deltas.size === 1 ? '' : 's'}`
  if (opens === 0) return `Activity on ${where} ${sinceLabel(since)}`
  return `${opens} new open${opens === 1 ? '' : 's'} across ${where} ${sinceLabel(since)}`
}
