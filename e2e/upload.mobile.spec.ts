import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from './support/app'
import {
  admin,
  createTestOwner,
  deleteTestOwner,
  sessionCookies,
} from './support/supabase'
import type { TestOwner } from './support/supabase'

/**
 * The upload form on a phone, which is how most people meet it.
 *
 * `e2e/upload.spec.ts` already proves the chain end to end on a desktop
 * browser; repeating that here would buy a slower suite and the same answer.
 * What is different on a phone is the getting-through, and the two things that
 * go wrong there are invisible to a desktop run: an input small enough to make
 * iOS zoom, and a tap target too small to hit. Both are silent — nothing
 * throws, the test passes, and the form is just unpleasant to use.
 *
 * So this asserts the two properties, then uploads once on a real touch device
 * to show the whole thing still completes at 390px with a soft keyboard's worth
 * of viewport missing.
 */

const PDF = fileURLToPath(
  new URL('./fixtures/sample-proposal.pdf', import.meta.url),
)

/**
 * Below this, iOS Safari zooms the page when the field takes focus and does not
 * zoom back out when it blurs. It is a WebKit constant, not a preference.
 */
const NO_ZOOM_PX = 16

/** Apple's minimum comfortable tap target, and Android's within a pixel. */
const MIN_TAP_PX = 44

let owner: TestOwner

test.beforeAll(async () => {
  owner = await createTestOwner()
})

test.afterAll(async () => {
  await deleteTestOwner(owner)
})

test('the form does not zoom the viewport or hide behind small tap targets', async ({
  context,
  page,
}) => {
  await context.addCookies(await sessionCookies(owner))
  await gotoHydrated(page, '/proposals/new', 'input[type="file"]')

  // Every text field, not a sample: the rule that keeps them 16px is one
  // stylesheet rule, and the failure mode is someone adding a field that a
  // future refactor of that rule stops covering.
  const text = page.locator(
    'form input:not([type="file"]):not([type="checkbox"]):not([type="radio"])',
  )
  const count = await text.count()
  expect(count).toBeGreaterThan(0)

  for (let i = 0; i < count; i++) {
    const field = text.nth(i)
    const size = await field.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    )
    const name = await field.getAttribute('placeholder')
    expect(
      size,
      `"${name}" is ${size}px — iOS will zoom on focus`,
    ).toBeGreaterThanOrEqual(NO_ZOOM_PX)
  }

  const submit = page.getByRole('button', { name: 'Create proposal' })
  const box = await submit.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(MIN_TAP_PX)

  // Nothing may overflow sideways. A form that scrolls horizontally on a phone
  // reads as broken even when every field works.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a proposal uploads from a phone', async ({ context, page }) => {
  await context.addCookies(await sessionCookies(owner))
  await gotoHydrated(page, '/proposals/new', 'input[type="file"]')

  await page.getByLabel('Title').fill('Roof replacement')
  await page.getByLabel('Client name').fill('Harbour Row')
  await page.locator('input[type="file"]').setInputFiles(PDF)
  await page.getByRole('button', { name: 'Create proposal' }).click()

  // No recipient was named, so the link is named for the client and this
  // lands on the proposal's page with it — the same branch the desktop test
  // takes.
  await expect(page).toHaveURL(/\/proposals\/[0-9a-f-]{36}\?sent=true$/, {
    timeout: 60_000,
  })
  await expect(
    page.getByText('Now send this link to Harbour Row'),
  ).toBeVisible()
  await expect(page.getByText('Roof replacement')).toBeVisible()

  // The point of the upload is the PDF being read on *this* device: pdfjs runs
  // in the page, and WebKit is where it has failed before. A stored page count
  // is the proof it ran rather than silently degrading.
  const { data: proposal } = await admin()
    .from('proposals')
    .select('page_count')
    .eq('owner_id', owner.id)
    .eq('title', 'Roof replacement')
    .single()

  expect(proposal?.page_count).toBe(5)
})
