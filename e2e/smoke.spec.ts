import { expect, test } from '@playwright/test'
import {
  createTestOwner,
  deleteTestOwner,
  sessionCookies,
} from './support/supabase'
import type { TestOwner } from './support/supabase'

/**
 * Proves the session cookies in `support/supabase.ts` are the ones the app
 * accepts. Every other signed-in test rests on that, so when they all fail at
 * once this is the one that says whether the cause is the sign-in shim.
 */

let owner: TestOwner

test.beforeAll(async () => {
  owner = await createTestOwner()
})

test.afterAll(async () => {
  await deleteTestOwner(owner)
})

test('a session cookie signs the owner into the dashboard', async ({
  context,
  page,
}) => {
  await context.addCookies(await sessionCookies(owner))

  await page.goto('/dashboard')

  // Signed out, /dashboard bounces to /login. Staying put is the assertion.
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('link', { name: /new proposal/i })).toBeVisible()
})
