import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import { scoreIntent } from './intent'
import { shareUrl } from '#/constants'
import type { IntentResult } from './intent'
import type { ProposalStatus } from '#/lib/supabase/types'

export type SecuredTotal = {
  currency: string
  allTimeCents: number
  last30Cents: number
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * How much the owner has secured in won proposals — all-time and in the last
 * thirty days — grouped by currency so mixed currencies are never summed
 * together. `outcome_at` (set when a proposal is marked paid) drives the window.
 */
export const getSecuredTotals = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<SecuredTotal>> => {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase
      .from('proposals')
      .select('deal_value_cents, currency, outcome_at')
      .eq('status', 'won')

    const cutoff = Date.now() - THIRTY_DAYS_MS
    const byCurrency = new Map<
      string,
      { allTimeCents: number; last30Cents: number }
    >()
    for (const p of data ?? []) {
      if (p.deal_value_cents == null) continue
      const entry = byCurrency.get(p.currency) ?? {
        allTimeCents: 0,
        last30Cents: 0,
      }
      entry.allTimeCents += p.deal_value_cents
      if (p.outcome_at && new Date(p.outcome_at).getTime() >= cutoff) {
        entry.last30Cents += p.deal_value_cents
      }
      byCurrency.set(p.currency, entry)
    }

    return [...byCurrency.entries()]
      .map(([currency, v]) => ({ currency, ...v }))
      .sort((a, b) => b.allTimeCents - a.allTimeCents)
  },
)

export type ProposalSummary = {
  id: string
  title: string
  clientName: string
  status: ProposalStatus
  pageCount: number
  createdAt: string
  dealValueCents: number | null
  currency: string
  outcomeAt: string | null
  qualifiedVisits: number
  distinctViewers: number
  totalEngagedMs: number
  pricingEngagedMs: number
  lastViewedAt: string | null
  /** Newest link that is still live, so the list can offer a one-click copy. */
  shareUrl: string | null
  intent: IntentResult
}

/**
 * Aggregation happens in TypeScript rather than SQL on purpose. At MVP volume
 * the query cost is irrelevant, and keeping the scoring rules in one readable
 * file matters more than shaving milliseconds. Push it into SQL when a single
 * account has thousands of visits, not before.
 */
export const getProposalSummaries = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ProposalSummary>> => {
    const supabase = getSupabaseServerClient()

    // Archived rows are included rather than filtered out here. They used to be
    // dropped, from back when nothing could set the status and the filter cost
    // nothing; now that archiving is a button, dropping them would make a
    // proposal vanish from the app entirely the moment someone filed it away.
    // The dashboard sorts them into the closed tab, which is where they belong.
    const { data: proposals } = await supabase
      .from('proposals')
      .select(
        'id, title, client_name, status, page_count, created_at, deal_value_cents, currency, outcome_at',
      )
      .order('created_at', { ascending: false })

    if (!proposals?.length) return []

    const ids = proposals.map((p) => p.id)

    const [
      { data: visits },
      { data: pageViews },
      { data: pages },
      { data: links },
    ] = await Promise.all([
      supabase
        .from('visits')
        .select(
          'id, proposal_id, visitor_id, engaged_ms, started_at, last_seen_at',
        )
        .in('proposal_id', ids)
        .eq('is_bot', false)
        .eq('is_qualified', true),
      supabase
        .from('page_views')
        .select('proposal_id, page_number, engaged_ms')
        .in('proposal_id', ids),
      supabase
        .from('proposal_pages')
        .select('proposal_id, page_number, section')
        .in('proposal_id', ids),
      supabase
        .from('share_links')
        .select('proposal_id, token, expires_at, revoked_at, created_at')
        .in('proposal_id', ids)
        .is('revoked_at', null)
        .order('created_at', { ascending: false }),
    ])

    // Newest live link per proposal. Ordered newest-first above, so the first
    // unexpired one seen for an id wins.
    const now = Date.now()
    const liveLink = new Map<string, string>()
    for (const l of links ?? []) {
      if (liveLink.has(l.proposal_id)) continue
      if (l.expires_at && new Date(l.expires_at).getTime() < now) continue
      liveLink.set(l.proposal_id, shareUrl(l.token))
    }

    const pricingPages = new Set(
      (pages ?? [])
        .filter((p) => p.section === 'pricing')
        .map((p) => `${p.proposal_id}:${p.page_number}`),
    )

    // Which proposals were downloaded or printed, from events on their qualified
    // visits. Both are buying signals that feed the intent score below.
    const visitIds = (visits ?? []).map((v) => v.id)
    const { data: events } = visitIds.length
      ? await supabase
          .from('events')
          .select('visit_id, type')
          .in('visit_id', visitIds)
      : { data: [] as Array<{ visit_id: string; type: string }> }

    const visitProposal = new Map(
      (visits ?? []).map((v) => [v.id, v.proposal_id]),
    )
    const downloadedProposals = new Set<string>()
    const printedProposals = new Set<string>()
    for (const e of events ?? []) {
      const proposalId = visitProposal.get(e.visit_id)
      if (!proposalId) continue
      if (e.type === 'download') downloadedProposals.add(proposalId)
      else if (e.type === 'print') printedProposals.add(proposalId)
    }

    return proposals.map((p) => {
      const own = (visits ?? []).filter((v) => v.proposal_id === p.id)
      const ownPages = (pageViews ?? []).filter((pv) => pv.proposal_id === p.id)

      const totalEngagedMs = own.reduce((sum, v) => sum + v.engaged_ms, 0)
      const pricingEngagedMs = ownPages
        .filter((pv) => pricingPages.has(`${p.id}:${pv.page_number}`))
        .reduce((sum, pv) => sum + pv.engaged_ms, 0)

      const distinctViewers = new Set(own.map((v) => v.visitor_id)).size
      const startTimes = own.map((v) => new Date(v.started_at).getTime())
      const seenTimes = own.map((v) => new Date(v.last_seen_at).getTime())

      return {
        id: p.id,
        title: p.title,
        clientName: p.client_name,
        status: p.status,
        pageCount: p.page_count,
        createdAt: p.created_at,
        dealValueCents: p.deal_value_cents,
        currency: p.currency,
        outcomeAt: p.outcome_at,
        qualifiedVisits: own.length,
        distinctViewers,
        totalEngagedMs,
        pricingEngagedMs,
        lastViewedAt: seenTimes.length
          ? new Date(Math.max(...seenTimes)).toISOString()
          : null,
        shareUrl: liveLink.get(p.id) ?? null,
        intent: scoreIntent({
          pageCount: p.page_count,
          qualifiedVisits: own.length,
          distinctViewers,
          totalEngagedMs,
          pricingEngagedMs,
          reachedLastPage: ownPages.some(
            (pv) => pv.page_number === p.page_count,
          ),
          firstVisitAt: startTimes.length
            ? new Date(Math.min(...startTimes))
            : null,
          lastVisitAt: startTimes.length
            ? new Date(Math.max(...startTimes))
            : null,
          downloaded: downloadedProposals.has(p.id),
          printed: printedProposals.has(p.id),
        }),
      }
    })
  },
)
