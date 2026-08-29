import { createServerFn } from '@tanstack/react-start'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import { PAGE_SECTIONS, PROPOSALS_BUCKET, SHARE_LINK_TTL_DAYS, shareUrl } from '#/constants'

function newToken(): string {
  // URL-safe, unguessable. 18 bytes -> 24 chars, plenty of entropy for a link
  // anyone with the URL can open.
  return randomBytes(18).toString('base64url')
}

/** Creates a share link for a proposal and returns its full public URL. */
export const createShareLink = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      proposalId: z.uuid(),
      recipientName: z.string().trim().max(200).optional(),
      recipientEmail: z.email().trim().max(320).optional().or(z.literal('')),
    }),
  )
  .handler(async ({ data }): Promise<{ id: string; token: string; url: string }> => {
    const supabase = getSupabaseServerClient()
    const token = newToken()

    const expiresAt = new Date(Date.now() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)

    // RLS's insert check confirms the caller owns the proposal; a foreign id
    // is rejected rather than silently linked.
    const { data: link, error } = await supabase
      .from('share_links')
      .insert({
        proposal_id: data.proposalId,
        token,
        recipient_name: data.recipientName || null,
        recipient_email: data.recipientEmail || null,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, token')
      .maybeSingle()

    if (error || !link) throw new Error(error?.message ?? 'Could not create the link')

    return {
      id: link.id,
      token: link.token,
      url: shareUrl(link.token),
    }
  })

/** Revokes a share link. The viewer route refuses any revoked token. */
export const revokeShareLink = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('share_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', data.id)

    if (error) throw new Error(error.message)
    return { id: data.id }
  })

/** Tags a page's section. Pricing is what powers the pricing-attention signal. */
export const setPageSection = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      proposalId: z.uuid(),
      pageNumber: z.number().int().min(1),
      section: z.enum(PAGE_SECTIONS),
    }),
  )
  .handler(async ({ data }): Promise<{ pageNumber: number; section: string }> => {
    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('proposal_pages')
      .update({ section: data.section })
      .eq('proposal_id', data.proposalId)
      .eq('page_number', data.pageNumber)

    if (error) throw new Error(error.message)
    return { pageNumber: data.pageNumber, section: data.section }
  })

/**
 * Permanently deletes a proposal: the row (which cascades to pages, links,
 * visits and events) and its stored PDF. RLS scopes both to the owner.
 */
export const deleteProposal = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const supabase = getSupabaseServerClient()

    // Read the storage path before the row is gone; a foreign id returns null.
    const { data: proposal } = await supabase
      .from('proposals')
      .select('storage_path')
      .eq('id', data.id)
      .maybeSingle()
    if (!proposal) throw new Error('Proposal not found')

    // Delete the row first: it is the RLS-guarded source of truth. If the file
    // removal then fails we are left with an unreachable orphan, not a dangling
    // row pointing at a missing file.
    const { error } = await supabase.from('proposals').delete().eq('id', data.id)
    if (error) throw new Error(error.message)

    await supabase.storage.from(PROPOSALS_BUCKET).remove([proposal.storage_path])
    return { id: data.id }
  })
