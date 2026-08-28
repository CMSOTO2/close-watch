import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import { shareUrl } from '#/constants'
import type { PageSection, ProposalStatus } from '#/lib/supabase/types'

export type ProposalPage = {
  pageNumber: number
  section: PageSection
  label: string | null
}

export type ShareLink = {
  id: string
  token: string
  url: string
  recipientName: string | null
  recipientEmail: string | null
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
}

export type ProposalDetail = {
  id: string
  title: string
  clientName: string
  status: ProposalStatus
  pageCount: number
  dealValueCents: number | null
  currency: string
  createdAt: string
  pages: Array<ProposalPage>
  shareLinks: Array<ShareLink>
}

export const getProposalDetail = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<ProposalDetail | null> => {
    const supabase = getSupabaseServerClient()

    // RLS scopes every read to the signed-in owner, so an id that isn't theirs
    // simply comes back empty rather than leaking.
    const { data: proposal } = await supabase
      .from('proposals')
      .select(
        'id, title, client_name, status, page_count, deal_value_cents, currency, created_at',
      )
      .eq('id', data.id)
      .maybeSingle()

    if (!proposal) return null

    const [{ data: pages }, { data: links }] = await Promise.all([
      supabase
        .from('proposal_pages')
        .select('page_number, section, label')
        .eq('proposal_id', data.id)
        .order('page_number'),
      supabase
        .from('share_links')
        .select('id, token, recipient_name, recipient_email, expires_at, revoked_at, created_at')
        .eq('proposal_id', data.id)
        .order('created_at', { ascending: false }),
    ])

    return {
      id: proposal.id,
      title: proposal.title,
      clientName: proposal.client_name,
      status: proposal.status,
      pageCount: proposal.page_count,
      dealValueCents: proposal.deal_value_cents,
      currency: proposal.currency,
      createdAt: proposal.created_at,
      pages: (pages ?? []).map((p) => ({
        pageNumber: p.page_number,
        section: p.section,
        label: p.label,
      })),
      shareLinks: (links ?? []).map((l) => ({
        id: l.id,
        token: l.token,
        url: shareUrl(l.token),
        recipientName: l.recipient_name,
        recipientEmail: l.recipient_email,
        expiresAt: l.expires_at,
        revokedAt: l.revoked_at,
        createdAt: l.created_at,
      })),
    }
  })
