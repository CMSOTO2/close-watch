import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { awaitReact, gotoHydrated } from './support/app'
import {
  admin,
  createTestOwner,
  deleteTestOwner,
  sessionCookies,
} from './support/supabase'
import type { TestOwner } from './support/supabase'

/**
 * Activation: a PDF goes in, a link a client can open comes out.
 *
 * The unit tests already know the classifier works on a string. What they
 * cannot see is the chain, and the chain is where this has broken before: the
 * page tagger once failed on WebKit and took the whole upload down with it,
 * with every unit still green. So the assertions are on the far end of the
 * chain rather than the button: pages stored, a pricing page found, a link
 * issued.
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

test('an uploaded proposal is stored, tagged and shareable', async ({
  context,
  page,
}) => {
  await context.addCookies(await sessionCookies(owner))

  await gotoHydrated(page, '/proposals/new', 'input[type="file"]')
  await page.getByLabel('Title').fill('Website redesign')
  await page.getByLabel('Client name').fill('Northwind Studio')
  await page.locator('input[type="file"]').setInputFiles(PDF)
  await page.getByRole('button', { name: 'Create proposal' }).click()

  // Upload finishes by landing back on the dashboard.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 })
  await expect(page.getByText('Website redesign')).toBeVisible()

  const db = admin()
  const { data: proposal } = await db
    .from('proposals')
    .select('id, page_count, storage_path')
    .eq('owner_id', owner.id)
    .single()

  expect(proposal?.page_count).toBe(5)
  expect(proposal?.storage_path).toContain(owner.id)

  const { data: pages } = await db
    .from('proposal_pages')
    .select('page_number, section')
    .eq('proposal_id', proposal!.id)

  expect(pages).toHaveLength(5)
  // The pricing page is the one number the product sells. If the classifier
  // silently stops finding it, "4 minutes on pricing" quietly becomes fiction.
  expect(pages?.some((p) => p.section === 'pricing')).toBe(true)

  // The row's whole card is one link, laid over the text with a pseudo-element,
  // so clicking the title itself is intercepted. Click the link.
  await page.locator('a[data-row-link]').first().click()
  await expect(page).toHaveURL(/\/proposals\//)

  const recipient = page.getByPlaceholder('Jordan at Acme')
  await awaitReact(recipient)
  await recipient.fill('Jordan at Acme')
  await page.getByRole('button', { name: 'New link' }).click()

  await expect
    .poll(
      async () => {
        const { count } = await db
          .from('share_links')
          .select('id', { count: 'exact', head: true })
          .eq('proposal_id', proposal!.id)
        return count ?? 0
      },
      { timeout: 15_000 },
    )
    .toBe(1)
})
