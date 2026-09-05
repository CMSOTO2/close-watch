import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import {
  admin,
  createTestOwner,
  deleteTestOwner,
  seedProposal,
  userClient,
} from './support/supabase'
import type { TestOwner } from './support/supabase'

/**
 * The free plan stops at two proposals being read, and it has to stop in the
 * database.
 *
 * No browser here on purpose. The cap is a restrictive RLS policy rather than a
 * check in application code, which is the right design and also the reason a
 * migration can quietly remove your revenue model with every unit test still
 * green. Driving it through the UI would test the UI. This tests the policy,
 * under the user's own key, which is the only way to see it at all.
 *
 * The cap lives on `share_links`, not on `proposals`, because sending is the
 * act it governs. What it counts, though, is proposals somebody has actually
 * opened: `opened_proposal_count` requires a qualified non-bot visit, so a
 * proposal sitting unread with a client costs nothing. Uploading is capped
 * separately and far more loosely, at ten drafts, and only to stop one account
 * filling the storage bucket. A test pointed at the proposals table passes
 * while the thing anyone would call the paywall is wide open, which is how this
 * one started.
 */

const PDF = fileURLToPath(
  new URL('./fixtures/sample-proposal.pdf', import.meta.url),
)

let owner: TestOwner

test.beforeAll(async () => {
  owner = await createTestOwner()
})

test.afterAll(async () => {
  await deleteTestOwner(owner)
})

test('the free plan stops at two proposals being read, and a closed deal frees a slot', async () => {
  const pdf = readFileSync(PDF)

  // Two proposals in front of clients and read by them, and a third unsent.
  const first = await seedProposal(owner, { pdf, opened: true })
  await seedProposal(owner, { pdf, opened: true })
  const third = await seedProposal(owner, { pdf, share: false })

  const client = await userClient(owner)
  const share = () =>
    client.from('share_links').insert({
      proposal_id: third.id,
      token: randomBytes(18).toString('base64url'),
      recipient_name: 'Jordan at Acme',
      expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    })

  const blocked = await share()
  expect(
    blocked.error,
    'a third proposal went live on the free plan',
  ).not.toBeNull()

  // Closing a deal gives the slot back: the cap counts what is live, not what
  // has ever existed. POSITIONING.md calls the free tier a standing offer
  // rather than a two-use trial, and this is the line that makes it one.
  await admin().from('proposals').update({ status: 'won' }).eq('id', first.id)

  const allowed = await share()
  expect(allowed.error, 'closing a deal did not free a slot').toBeNull()
})

/**
 * The exit that does not require claiming an outcome.
 *
 * Archiving is the third way out of the cap, and the only honest one for a deal
 * still in the air. It is tested here rather than trusted because it frees a
 * slot through the same RLS function as won and lost: `sent_proposal_count`
 * counts `status = 'sent'`, so any move off that status works, and a future
 * migration that narrows the count to the two outcomes would silently turn the
 * free cap back into a machine for producing false ones.
 */
test('archiving frees a slot without recording an outcome', async () => {
  const pdf = readFileSync(PDF)

  // Its own account. The cap counts every sent proposal an owner has, so
  // sharing the suite's owner with the test above starts this one already over
  // the line, and it then fails for a reason that has nothing to do with
  // archiving.
  const solo = await createTestOwner()

  try {
    const first = await seedProposal(solo, { pdf, opened: true })
    await seedProposal(solo, { pdf, opened: true })
    const third = await seedProposal(solo, { pdf, share: false })

    const client = await userClient(solo)
    const share = () =>
      client.from('share_links').insert({
        proposal_id: third.id,
        token: randomBytes(18).toString('base64url'),
        recipient_name: 'Sam at Northwind',
        expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
      })

    expect(
      (await share()).error,
      'a third proposal went live on the free plan',
    ).not.toBeNull()

    await admin()
      .from('proposals')
      .update({ status: 'archived', outcome_at: null })
      .eq('id', first.id)

    expect((await share()).error, 'archiving did not free a slot').toBeNull()

    // The point of the status: the slot came back and nothing was asserted
    // about how the deal went. An archived row carrying an outcome_at would
    // pollute the won/lost correlation POSITIONING.md calls the moat.
    const { data: archived } = await admin()
      .from('proposals')
      .select('status, outcome_at')
      .eq('id', first.id)
      .single()

    expect(archived?.status).toBe('archived')
    expect(archived?.outcome_at, 'archiving recorded an outcome').toBeNull()
  } finally {
    await deleteTestOwner(solo)
  }
})

/**
 * The other half of the same rule, and the reason it was worth changing.
 *
 * Sending is not what spends a slot. A free account can put proposals in front
 * of as many clients as it likes; the cap only closes once two of them have
 * actually been read. POSITIONING.md is specific that the free tier exists to
 * deliver one moment, the first time somebody sees how a client read their
 * proposal, and a wall that lands before that moment asks for money in exchange
 * for nothing. This is the test that stops the cap drifting back onto 'sent'.
 */
test('sending costs nothing until a client opens it', async () => {
  const pdf = readFileSync(PDF)
  const solo = await createTestOwner()

  try {
    // Well past the cap in sent proposals, none of them read.
    await seedProposal(solo, { pdf })
    await seedProposal(solo, { pdf })
    await seedProposal(solo, { pdf })
    const next = await seedProposal(solo, { pdf, share: false })

    const client = await userClient(solo)
    const share = await client.from('share_links').insert({
      proposal_id: next.id,
      token: randomBytes(18).toString('base64url'),
      recipient_name: 'Robin at Meridian',
      expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    })

    expect(
      share.error,
      'an unread proposal spent a slot on the free plan',
    ).toBeNull()

    // A scanner opening the link must not spend one either, which is the whole
    // reason is_bot and is_qualified exist. Both flags are set the way ingest
    // would set them for a fetch that never became a read.
    const { data: link } = await admin()
      .from('share_links')
      .select('id')
      .eq('proposal_id', next.id)
      .limit(1)
      .single()

    await admin()
      .from('visits')
      .insert({
        share_link_id: link!.id,
        proposal_id: next.id,
        visitor_id: randomBytes(9).toString('base64url'),
        engaged_ms: 400,
        is_bot: true,
        is_qualified: false,
      })

    const another = await seedProposal(solo, { pdf, share: false })
    const again = await client.from('share_links').insert({
      proposal_id: another.id,
      token: randomBytes(18).toString('base64url'),
      recipient_name: 'Sam at Halcyon',
      expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
    })

    expect(again.error, 'a bot fetch spent a slot').toBeNull()
  } finally {
    await deleteTestOwner(solo)
  }
})
