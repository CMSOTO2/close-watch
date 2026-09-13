import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { Cookie } from '@playwright/test'
import type { Database } from '../../src/lib/supabase/types'

/**
 * Test accounts, and the sessions that let a browser act as one.
 *
 * Signing in the way a real user does is not available to a test: the app
 * offers magic links and Google, and both end at an inbox. So the account is
 * made with the service key and given a password, and the browser is handed the
 * cookies that a completed sign-in would have left behind.
 *
 * Those cookies are built by `@supabase/ssr` itself rather than by this file.
 * The name, the `base64-` encoding and the chunking across `.0`/`.1` when a
 * session runs long are all details that library owns and has changed before,
 * and a hand-rolled copy would pass until the day it silently did not.
 */

const url = process.env.VITE_SUPABASE_URL!
const publishable = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
const secret = process.env.SUPABASE_SECRET_KEY!

export function admin() {
  return createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Everything a test makes is named so a human reading the table later can tell
 * it apart from a real account, and so a failed run leaves something greppable
 * rather than a mystery row.
 */
export const TEST_EMAIL_DOMAIN = 'e2e.closewatch.test'
const PASSWORD = 'e2e-only-password-not-a-secret'

export type TestOwner = { id: string; email: string }

export async function createTestOwner(): Promise<TestOwner> {
  const email = `owner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@${TEST_EMAIL_DOMAIN}`
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw new Error(`could not create test owner: ${error.message}`)

  // The app sends anyone without the name clients see to /welcome before
  // anything else, so a test owner needs one to land where the tests expect.
  const { error: nameError } = await admin()
    .from('profiles')
    .update({ company_name: 'E2E Test Studio' })
    .eq('id', data.user.id)
  if (nameError)
    throw new Error(`could not name test owner: ${nameError.message}`)

  return { id: data.user.id, email }
}

/**
 * Deleting the auth user is enough: every table hangs off it by a foreign key
 * that cascades. Storage does not, so the objects go first.
 */
export async function deleteTestOwner(owner: TestOwner) {
  const db = admin()

  const { data: proposals } = await db
    .from('proposals')
    .select('id, storage_path')
    .eq('owner_id', owner.id)

  const paths = (proposals ?? []).map((p) => p.storage_path).filter(Boolean)
  if (paths.length) await db.storage.from('proposals').remove(paths)

  await db.auth.admin.deleteUser(owner.id)
}

/**
 * A client holding the test owner's own session and the publishable key, so
 * every query runs under row-level security exactly as the browser's would.
 * The paywall is an RLS policy, so this is the only client that can prove it.
 */
export async function userClient(owner: TestOwner) {
  const client = createClient<Database>(url, publishable, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({
    email: owner.email,
    password: PASSWORD,
  })
  if (error) throw new Error(`could not sign in test owner: ${error.message}`)
  return client
}

/**
 * A proposal that already exists, for the tests that are about what happens
 * after one does. Uploading through the form is its own test; the others should
 * not fail because it broke.
 */
export async function seedProposal(
  owner: TestOwner,
  {
    pdf,
    share = true,
    opened = false,
  }: { pdf: Buffer; share?: boolean; opened?: boolean },
) {
  const db = admin()
  const id = randomUUID()
  const storagePath = `${owner.id}/${id}.pdf`

  const up = await db.storage
    .from('proposals')
    .upload(storagePath, pdf, { contentType: 'application/pdf', upsert: true })
  if (up.error) throw new Error(`seed upload failed: ${up.error.message}`)

  await db
    .from('profiles')
    .upsert({ id: owner.id, email: owner.email }, { onConflict: 'id' })

  const proposal = await db
    .from('proposals')
    .insert({
      id,
      owner_id: owner.id,
      title: 'Seeded proposal',
      client_name: 'Northwind Studio',
      storage_path: storagePath,
      page_count: 5,
      // Live means sent, and the paywall reads exactly this: a proposal with no
      // share link is a draft, and drafts do not count against the cap.
      status: share ? 'sent' : 'draft',
      currency: 'USD',
    })
    .select('id')
    .single()
  if (proposal.error)
    throw new Error(`seed proposal failed: ${proposal.error.message}`)

  await db.from('proposal_pages').insert(
    [1, 2, 3, 4, 5].map((page_number) => ({
      proposal_id: id,
      page_number,
      section: page_number === 4 ? ('pricing' as const) : ('other' as const),
      section_auto: true,
    })),
  )

  let token: string | null = null
  if (share) {
    token = randomBytes(18).toString('base64url')
    const link = await db
      .from('share_links')
      .insert({
        proposal_id: id,
        token,
        recipient_name: 'Jordan at Acme',
        expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
      })
      .select('id')
      .single()
    if (link.error)
      throw new Error(`seed share link failed: ${link.error.message}`)

    // A real person having read it, which is what the free cap counts. Not a
    // bot and qualified: ingest sets that at three seconds of visible
    // attention, and the engaged_ms here is over that line so the row means the
    // same thing whether it is written directly or arrives through ingest.
    if (opened) {
      const visit = await db.from('visits').insert({
        share_link_id: link.data.id,
        proposal_id: id,
        visitor_id: randomBytes(9).toString('base64url'),
        engaged_ms: 12_000,
        is_bot: false,
        is_qualified: true,
      })
      if (visit.error)
        throw new Error(`seed visit failed: ${visit.error.message}`)
    }
  }

  return { id, token }
}

/** Cookies a signed-in browser would be holding, for `context.addCookies`. */
export async function sessionCookies(owner: TestOwner): Promise<Array<Cookie>> {
  const { data, error } = await createClient(
    url,
    publishable,
  ).auth.signInWithPassword({
    email: owner.email,
    password: PASSWORD,
  })
  if (error) throw new Error(`could not sign in test owner: ${error.message}`)

  // A throwaway server client whose only job is to hand back what it would have
  // written to a response. Nothing here talks to the app.
  const written: Array<{ name: string; value: string }> = []
  const client = createServerClient(url, publishable, {
    cookies: {
      getAll: () => [],
      setAll: (cookies) => written.push(...cookies),
    },
  })
  await client.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })

  if (!written.length) throw new Error('supabase/ssr wrote no session cookies')

  return written.map(({ name, value }) => ({
    name,
    value,
    domain: 'localhost',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }))
}
