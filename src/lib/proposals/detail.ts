import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import { PROPOSALS_BUCKET, senderName, shareUrl } from '#/constants'
import type { PageSection, ProposalStatus } from '#/lib/supabase/types'

export type ProposalPage = {
  pageNumber: number
  section: PageSection
  /** The section is the classifier's guess until the owner picks one. */
  sectionAuto: boolean
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

export type ProposalOwner = {
  name: string | null
  email: string | null
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
  outcomeAt: string | null
  owner: ProposalOwner
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
        'id, title, client_name, status, page_count, deal_value_cents, currency, created_at, outcome_at, owner_id',
      )
      .eq('id', data.id)
      .maybeSingle()

    if (!proposal) return null

    const [{ data: owner }, { data: pages }, { data: links }] =
      await Promise.all([
        // The owner is always the signed-in user (RLS scopes proposals to them),
        // so the "own profile" policy lets this read through.
        supabase
          .from('profiles')
          .select('full_name, company_name, email')
          .eq('id', proposal.owner_id)
          .maybeSingle(),
        supabase
          .from('proposal_pages')
          .select('page_number, section, section_auto, label')
          .eq('proposal_id', data.id)
          .order('page_number'),
        supabase
          .from('share_links')
          .select(
            'id, token, recipient_name, recipient_email, expires_at, revoked_at, created_at',
          )
          .eq('proposal_id', data.id)
          .order('created_at', { ascending: false }),
      ])

    const name = owner ? senderName(owner) : null

    return {
      id: proposal.id,
      title: proposal.title,
      clientName: proposal.client_name,
      status: proposal.status,
      pageCount: proposal.page_count,
      dealValueCents: proposal.deal_value_cents,
      currency: proposal.currency,
      createdAt: proposal.created_at,
      outcomeAt: proposal.outcome_at,
      owner: {
        name,
        email: owner?.email ?? null,
      },
      pages: (pages ?? []).map((p) => ({
        pageNumber: p.page_number,
        section: p.section,
        sectionAuto: p.section_auto,
        label: p.label,
      })),
      shareLinks: (links ?? []).map((l) => ({
        id: l.id,
        token: l.token,
        url: shareUrl(l.token, name),
        recipientName: l.recipient_name,
        recipientEmail: l.recipient_email,
        expiresAt: l.expires_at,
        revokedAt: l.revoked_at,
        createdAt: l.created_at,
      })),
    }
  })

/**
 * A short-lived signed URL for the owner's own copy of the PDF.
 *
 * Signed on demand rather than handed out with the rest of the detail payload.
 * A signed URL carries an expiry, so one minted at page load is stale by the
 * time someone who left the tab open comes back to it, and most visits to this
 * page never ask for the file at all. Sixty seconds is plenty for a browser to
 * start a download and short enough that a URL copied out of the network tab
 * is worthless almost immediately.
 *
 * `download` sets the Content-Disposition, which is the difference between
 * saving `a1b2c3.pdf` out of a storage path and saving something the owner will
 * recognise in their downloads folder a week later.
 *
 * No ownership check here beyond RLS, which is the point: the select below is
 * scoped to the signed-in owner, so another account's id returns nothing and
 * there is nothing to sign.
 */
export const getProposalFileUrl = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<{ url: string; filename: string }> => {
    const supabase = getSupabaseServerClient()

    const { data: proposal } = await supabase
      .from('proposals')
      .select('title, client_name, storage_path')
      .eq('id', data.id)
      .maybeSingle()

    if (!proposal) throw new Error('Proposal not found')

    const filename = `${pdfFilename(proposal.client_name, proposal.title)}.pdf`

    const { data: signed, error } = await supabase.storage
      .from(PROPOSALS_BUCKET)
      .createSignedUrl(proposal.storage_path, 60, { download: filename })

    // Discriminated union: no error means `signed` is there, which is why the
    // belt-and-braces null check the repo's lint rules would otherwise flag is
    // not written here.
    if (error) throw new Error('Could not open that PDF right now')

    return { url: signed.signedUrl, filename }
  })

/**
 * "Acme Studio - Brand identity.pdf" rather than a uuid.
 *
 * Anything a filesystem or a Content-Disposition header would argue about is
 * replaced rather than stripped, so words do not run together, and the result
 * is capped because some systems still baulk at very long names.
 */
function pdfFilename(clientName: string, title: string): string {
  const cleaned = `${clientName} - ${title}`
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (cleaned || 'proposal').slice(0, 80)
}
