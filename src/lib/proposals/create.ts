import { createServerFn } from '@tanstack/react-start'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getSupabaseServerClient } from '#/lib/supabase/server'
import type { PageSection } from '#/lib/supabase/types'
import { assertCanCreateProposal } from '#/lib/billing/entitlements'
import {
  PAGE_SECTIONS,
  PDF_MAX_BYTES,
  PDF_MAX_MB,
  PDF_MAX_PAGES,
  PDF_MIME,
  PROPOSALS_BUCKET,
} from '#/constants'

export type CreateProposalResult = { id: string }

type ParsedInput = {
  title: string
  clientName: string
  dealValueCents: number | null
  pageCount: number
  /** Classifier guesses, one per page. Empty when the PDF had no text. */
  sections: Array<PageSection>
  bytes: ArrayBuffer
}

/**
 * Creates a proposal from an uploaded PDF. The file rides in as FormData so we
 * never trust the client with the storage path or owner id: both come from the
 * signed-in session here on the server. Page count is extracted client-side
 * (the viewer already depends on pdfjs) and only sanity-checked.
 */
export const createProposal = createServerFn({ method: 'POST' })
  .validator(async (data: unknown): Promise<ParsedInput> => {
    if (!(data instanceof FormData)) throw new Error('Expected form data')

    const file = data.get('file')
    if (!(file instanceof File) || file.size === 0)
      throw new Error('A PDF file is required')
    if (file.type !== PDF_MIME) throw new Error('File must be a PDF')
    if (file.size > PDF_MAX_BYTES)
      throw new Error(`PDF must be ${PDF_MAX_MB} MB or smaller`)

    const title = String(data.get('title') ?? '').trim()
    const clientName = String(data.get('clientName') ?? '').trim()
    if (!title) throw new Error('Title is required')
    if (!clientName) throw new Error('Client name is required')

    const pageCount = Number(data.get('pageCount'))
    if (
      !Number.isInteger(pageCount) ||
      pageCount < 1 ||
      pageCount > PDF_MAX_PAGES
    ) {
      throw new Error('Could not read the PDF page count')
    }

    // Optional deal value arrives as dollars; store integer cents.
    const rawValue = String(data.get('dealValue') ?? '').trim()
    let dealValueCents: number | null = null
    if (rawValue) {
      const dollars = Number(rawValue)
      if (!Number.isFinite(dollars) || dollars < 0)
        throw new Error('Deal value must be a positive number')
      dealValueCents = Math.round(dollars * 100)
    }

    // Guessed page tags. Never trusted: an unknown value or a length that does
    // not match the page count is dropped wholesale rather than half-applied,
    // which leaves the owner tagging by hand exactly as they did before.
    let sections: Array<PageSection> = []
    const rawSections = data.get('sections')
    if (typeof rawSections === 'string' && rawSections !== '') {
      const parsed = z
        .array(z.enum(PAGE_SECTIONS))
        .length(pageCount)
        .safeParse(JSON.parse(rawSections))
      if (parsed.success) sections = parsed.data
    }

    return {
      title,
      clientName,
      dealValueCents,
      pageCount,
      sections,
      bytes: await file.arrayBuffer(),
    }
  })
  .handler(async ({ data }): Promise<CreateProposalResult> => {
    const supabase = getSupabaseServerClient()

    // getUser's result is a discriminated union: no error means a real user,
    // so the extra `!auth.user` this used to carry was dead by the types and
    // cost the repo its only lint error.
    const { data: auth, error: authError } = await supabase.auth.getUser()
    if (authError) throw new Error('Not signed in')

    // The on_auth_user_created trigger normally creates this, but don't let a
    // missing profile row wall off proposal creation: owner_id references it.
    // ignoreDuplicates keeps an existing profile's other fields untouched.
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: auth.user.id,
        email: auth.user.email ?? null,
        full_name:
          (auth.user.user_metadata.full_name as string | undefined) ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (profileError)
      throw new Error(`Could not prepare your profile: ${profileError.message}`)

    // Before the upload, not after: the `free plan proposal cap` policy would
    // reject the insert anyway, but only once the PDF was already in storage
    // and only with a sentence about row-level security.
    await assertCanCreateProposal(supabase, auth.user.id)

    const proposalId = randomUUID()
    const storagePath = `${auth.user.id}/${proposalId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from(PROPOSALS_BUCKET)
      .upload(storagePath, data.bytes, { contentType: PDF_MIME, upsert: false })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    // From here on, roll the storage object back if a write fails so we never
    // leave an orphaned file the user cannot see or reach.
    const cleanup = async () => {
      await supabase.storage.from(PROPOSALS_BUCKET).remove([storagePath])
    }

    const { error: proposalError } = await supabase.from('proposals').insert({
      id: proposalId,
      owner_id: auth.user.id,
      title: data.title,
      client_name: data.clientName,
      deal_value_cents: data.dealValueCents,
      storage_path: storagePath,
      page_count: data.pageCount,
    })
    if (proposalError) {
      await cleanup()
      throw new Error(`Could not save proposal: ${proposalError.message}`)
    }

    // section_auto only where a section was actually guessed: a page the
    // classifier could not place stays a plain untagged 'other', so the detail
    // page does not offer to "confirm" a guess nobody made.
    const pages = Array.from({ length: data.pageCount }, (_, i) => {
      const section = data.sections[i] ?? 'other'
      return {
        proposal_id: proposalId,
        page_number: i + 1,
        section,
        section_auto: section !== 'other',
      }
    })
    const { error: pagesError } = await supabase
      .from('proposal_pages')
      .insert(pages)
    if (pagesError) {
      await supabase.from('proposals').delete().eq('id', proposalId)
      await cleanup()
      throw new Error(`Could not save proposal pages: ${pagesError.message}`)
    }

    return { id: proposalId }
  })
