import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import { scoreIntent } from './intent'
import type { IntentResult } from './intent'
import type { ProposalStatus } from '#/lib/supabase/types'

export type ProposalSummary = {
  id: string
  title: string
  clientName: string
  status: ProposalStatus
  pageCount: number
  createdAt: string
  qualifiedVisits: number
  distinctViewers: number
  totalEngagedMs: number
  pricingEngagedMs: number
  lastViewedAt: string | null
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

    const { data: proposals } = await supabase
      .from('proposals')
      .select('id, title, client_name, status, page_count, created_at')
      .neq('status', 'archived')
      .order('created_at', { ascending: false })

    if (!proposals?.length) return []

    const ids = proposals.map((p) => p.id)

    const [{ data: visits }, { data: pageViews }, { data: pages }] = await Promise.all([
      supabase
        .from('visits')
        .select('id, proposal_id, visitor_id, engaged_ms, started_at, last_seen_at')
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
    ])

    const pricingPages = new Set(
      (pages ?? [])
        .filter((p) => p.section === 'pricing')
        .map((p) => `${p.proposal_id}:${p.page_number}`),
    )

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
        qualifiedVisits: own.length,
        distinctViewers,
        totalEngagedMs,
        pricingEngagedMs,
        lastViewedAt: seenTimes.length ? new Date(Math.max(...seenTimes)).toISOString() : null,
        intent: scoreIntent({
          pageCount: p.page_count,
          qualifiedVisits: own.length,
          distinctViewers,
          totalEngagedMs,
          pricingEngagedMs,
          reachedLastPage: ownPages.some((pv) => pv.page_number === p.page_count),
          firstVisitAt: startTimes.length ? new Date(Math.min(...startTimes)) : null,
          lastVisitAt: startTimes.length ? new Date(Math.max(...startTimes)) : null,
        }),
      }
    })
  },
)
