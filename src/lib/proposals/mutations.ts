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
      // Choosing a tag by hand is what turns a guess into a fact, so this is
      // the one place section_auto goes back to false.
      .update({ section: data.section, section_auto: false })
      .eq('proposal_id', data.proposalId)
      .eq('page_number', data.pageNumber)

    if (error) throw new Error(error.message)
    return { pageNumber: data.pageNumber, section: data.section }
  })

/**
 * Accepts every guessed page tag at once.
 *
 * Without this the only way to clear the guessed markers is to re-pick all of
 * them from the dropdowns, which is the work the classifier exists to remove.
 * The sections themselves do not change — they were already in use for
 * tracking — this only records that a human looked at them.
 */
export const confirmPageSections = createServerFn({ method: 'POST' })
  .validator(z.object({ proposalId: z.uuid() }))
  .handler(async ({ data }): Promise<{ confirmed: number }> => {
    const supabase = getSupabaseServerClient()

    const { data: rows, error } = await supabase
      .from('proposal_pages')
      .update({ section_auto: false })
      .eq('proposal_id', data.proposalId)
      .eq('section_auto', true)
      .select('page_number')

    if (error) throw new Error(error.message)
    return { confirmed: rows.length }
  })

/**
 * Marks a proposal paid and finalized (status "won"). `outcome_at` is what the
 * dashboard's "secured" totals sum, and the last-30-days figure reads from.
 */
export const markProposalWon = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid(), revokeLinks: z.boolean().default(false) }))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('proposals')
      .update({ status: 'won', outcome_at: new Date().toISOString() })
      .eq('id', data.id)
    if (error) throw new Error(error.message)

    // Optional: cut off further access on close. Off by default, because the
    // link is often the very document the client just paid for.
    if (data.revokeLinks) {
      await supabase
        .from('share_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('proposal_id', data.id)
        .is('revoked_at', null)
    }

    return { id: data.id }
  })

/**
 * Marks a proposal lost (the deal fell through). Deliberately a status change
 * rather than a delete: the visits, readers and attention it collected are the
 * record of what happened, and they are worth as much on a deal that got away
 * as on one that closed. Nothing here touches the secured totals, which read
 * status = 'won' only.
 */
export const markProposalLost = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid(), revokeLinks: z.boolean().default(false) }))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('proposals')
      .update({ status: 'lost', outcome_at: new Date().toISOString() })
      .eq('id', data.id)
    if (error) throw new Error(error.message)

    if (data.revokeLinks) {
      await supabase
        .from('share_links')
        .update({ revoked_at: new Date().toISOString() })
        .eq('proposal_id', data.id)
        .is('revoked_at', null)
    }

    return { id: data.id }
  })

/** Reopens a finalized proposal back to "sent" and clears its outcome. */
export const reopenProposal = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('proposals')
      .update({ status: 'sent', outcome_at: null })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { id: data.id }
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
