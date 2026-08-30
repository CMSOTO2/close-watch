import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import type { PageSection } from '#/lib/supabase/types'

export type PageAttention = {
  pageNumber: number
  section: PageSection
  engagedMs: number
  viewCount: number
}

export type VisitActivity = {
  id: string
  startedAt: string
  engagedMs: number
  device: string | null
  recipientLabel: string
  isReturn: boolean
  isForward: boolean
  /** 1 = named recipient, 2+ = the Nth distinct forwardee on this link. */
  viewerIndex: number
  events: Array<string>
}

export type ProposalAnalytics = {
  totals: {
    qualifiedVisits: number
    distinctViewers: number
    totalEngagedMs: number
    firstOpenedAt: string | null
    lastOpenedAt: string | null
    botVisits: number
    downloads: number
    prints: number
  }
  pages: Array<PageAttention>
  visits: Array<VisitActivity>
}

const EVENT_LABELS: Record<string, string> = {
  print: 'printed',
  download: 'downloaded',
}

function deviceLabel(browser: string | null, os: string | null): string | null {
  const parts = [browser, os].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/**
 * Everything the detail page needs to answer "who read this, when, and what
 * did they linger on". Aggregated in TypeScript like the dashboard summaries;
 * push it into SQL only once a single proposal has thousands of visits.
 */
export const getProposalAnalytics = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<ProposalAnalytics | null> => {
    const supabase = getSupabaseServerClient()

    // RLS confirms ownership; a foreign id returns no proposal.
    const { data: proposal } = await supabase
      .from('proposals')
      .select('id')
      .eq('id', data.id)
      .maybeSingle()
    if (!proposal) return null

    const [{ data: links }, { data: pages }, { data: allVisits }] = await Promise.all([
      supabase
        .from('share_links')
        .select('id, recipient_name, recipient_email, revoked_at')
        .eq('proposal_id', data.id),
      supabase
        .from('proposal_pages')
        .select('page_number, section')
        .eq('proposal_id', data.id)
        .order('page_number'),
      supabase
        .from('visits')
        .select(
          'id, share_link_id, visitor_id, visit_seq, started_at, last_seen_at, engaged_ms, browser, os, is_bot, is_qualified',
        )
        .eq('proposal_id', data.id)
        .order('started_at', { ascending: false }),
    ])

    const visits = allVisits ?? []
    const humanQualified = visits.filter((v) => !v.is_bot && v.is_qualified)
    const qualifiedIds = new Set(humanQualified.map((v) => v.id))

    const [{ data: pageViews }, { data: events }] = await Promise.all([
      supabase
        .from('page_views')
        .select('visit_id, page_number, engaged_ms, view_count')
        .eq('proposal_id', data.id),
      qualifiedIds.size
        ? supabase
            .from('events')
            .select('visit_id, type')
            .in('visit_id', [...qualifiedIds])
        : Promise.resolve({ data: [] as Array<{ visit_id: string; type: string }> }),
    ])

    const linkById = new Map((links ?? []).map((l) => [l.id, l]))
    const linkLabel = (id: string) => {
      const l = linkById.get(id)
      return l?.recipient_name ?? l?.recipient_email ?? 'Untitled recipient'
    }

    // Order the distinct people who opened each link by first appearance. Index
    // 1 is the named recipient; 2+ are the people it was forwarded to.
    const firstSeen = new Map<string, number>()
    for (const v of humanQualified) {
      const key = `${v.share_link_id}:${v.visitor_id}`
      const t = new Date(v.started_at).getTime()
      if (!firstSeen.has(key) || t < firstSeen.get(key)!) firstSeen.set(key, t)
    }
    const viewerIndexByLink = new Map<string, Map<string, number>>()
    for (const link of links ?? []) {
      const ids = [
        ...new Set(
          humanQualified.filter((v) => v.share_link_id === link.id).map((v) => v.visitor_id),
        ),
      ].sort((a, b) => firstSeen.get(`${link.id}:${a}`)! - firstSeen.get(`${link.id}:${b}`)!)
      viewerIndexByLink.set(link.id, new Map(ids.map((id, i) => [id, i + 1])))
    }
    const viewerIndexOf = (linkId: string, visitorId: string) =>
      viewerIndexByLink.get(linkId)?.get(visitorId) ?? 1

    // Events per visit, deduped to labels.
    const eventsByVisit = new Map<string, Set<string>>()
    for (const e of events ?? []) {
      const label = EVENT_LABELS[e.type]
      if (!label) continue
      if (!eventsByVisit.has(e.visit_id)) eventsByVisit.set(e.visit_id, new Set())
      eventsByVisit.get(e.visit_id)!.add(label)
    }

    // Per-page attention, restricted to qualified human reads.
    const engagedByPage = new Map<number, number>()
    const viewsByPage = new Map<number, number>()
    for (const pv of pageViews ?? []) {
      if (!qualifiedIds.has(pv.visit_id)) continue
      engagedByPage.set(pv.page_number, (engagedByPage.get(pv.page_number) ?? 0) + pv.engaged_ms)
      viewsByPage.set(pv.page_number, (viewsByPage.get(pv.page_number) ?? 0) + pv.view_count)
    }
    const pageAttention: Array<PageAttention> = (pages ?? []).map((p) => ({
      pageNumber: p.page_number,
      section: p.section,
      engagedMs: engagedByPage.get(p.page_number) ?? 0,
      viewCount: viewsByPage.get(p.page_number) ?? 0,
    }))

    const visitActivity: Array<VisitActivity> = humanQualified.map((v) => ({
      id: v.id,
      startedAt: v.started_at,
      engagedMs: v.engaged_ms,
      device: deviceLabel(v.browser, v.os),
      recipientLabel: linkLabel(v.share_link_id),
      isReturn: v.visit_seq > 1,
      isForward: viewerIndexOf(v.share_link_id, v.visitor_id) > 1,
      viewerIndex: viewerIndexOf(v.share_link_id, v.visitor_id),
      events: [...(eventsByVisit.get(v.id) ?? [])],
    }))

    const starts = humanQualified.map((v) => new Date(v.started_at).getTime())
    const seenAll = humanQualified.map((v) => new Date(v.last_seen_at).getTime())

    // Total download / print actions across qualified human reads.
    let downloads = 0
    let prints = 0
    for (const e of events ?? []) {
      if (e.type === 'download') downloads++
      else if (e.type === 'print') prints++
    }

    return {
      totals: {
        qualifiedVisits: humanQualified.length,
        distinctViewers: new Set(humanQualified.map((v) => v.visitor_id)).size,
        totalEngagedMs: humanQualified.reduce((sum, v) => sum + v.engaged_ms, 0),
        firstOpenedAt: starts.length ? new Date(Math.min(...starts)).toISOString() : null,
        lastOpenedAt: seenAll.length ? new Date(Math.max(...seenAll)).toISOString() : null,
        botVisits: visits.filter((v) => v.is_bot).length,
        downloads,
        prints,
      },
      pages: pageAttention,
      visits: visitActivity,
    }
  })
