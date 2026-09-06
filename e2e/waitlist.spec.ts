import { expect, test } from '@playwright/test'
import { admin, TEST_EMAIL_DOMAIN } from './support/supabase'
import { awaitReact, gotoHydrated } from './support/app'
import type { Page } from '@playwright/test'

/**
 * The Studio card's button, which is the only one on the pricing page that
 * writes anything.
 *
 * Worth a browser test rather than a unit one because the interesting part is
 * the wiring, not the arithmetic: a public form, a server function, and a table
 * with RLS on and no policies. Every one of those can be right on its own while
 * the click still does nothing, and the failure is silent — the button would
 * say "On the list" either way, and nobody finds out the list is empty until
 * they go looking for it months later.
 *
 * It also pins the duplicate case, because that is the one a real visitor is
 * most likely to hit: pressing a button twice, or coming back next week having
 * forgotten. A unique index turning that into a red error would be a strange
 * way to treat someone volunteering their address.
 */

const email = `studio-waitlist-${Date.now()}@${TEST_EMAIL_DOMAIN}`

test.afterAll(async () => {
  await admin().from('studio_waitlist').delete().eq('email', email)
})

async function join(page: Page, address: string) {
  await gotoHydrated(page, '/#pricing', 'text=Join the waitlist')

  // Collapsed to a button until pressed, so the card keeps the shape of the
  // two beside it. The field only exists after this click.
  await page.getByRole('button', { name: 'Join the waitlist' }).click()

  const field = page.getByLabel('Where should we write?')
  await awaitReact(field)
  await field.fill(address)
  await page.getByRole('button', { name: 'Join the waitlist' }).click()
}

test('joining the Studio waitlist stores the address', async ({ page }) => {
  await join(page, email)

  await expect(page.getByText(/on the list/i)).toBeVisible()

  const { data } = await admin()
    .from('studio_waitlist')
    .select('email, source, user_id')
    .eq('email', email)

  expect(data).toHaveLength(1)
  expect(data![0].source).toBe('pricing')
  // Nobody was signed in, which is the ordinary case for a pricing page.
  expect(data![0].user_id).toBeNull()
})

test('joining twice is thanked, not rejected', async ({ page }) => {
  await join(page, email)

  await expect(page.getByText(/on the list/i)).toBeVisible()

  // Still one row: the unique index held, and the second attempt was absorbed
  // rather than surfaced.
  const { count } = await admin()
    .from('studio_waitlist')
    .select('email', { count: 'exact', head: true })
    .eq('email', email)

  expect(count).toBe(1)
})
