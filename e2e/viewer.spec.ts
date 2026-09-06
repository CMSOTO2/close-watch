import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import {
  admin,
  createTestOwner,
  deleteTestOwner,
  seedProposal,
} from './support/supabase'
import type { TestOwner } from './support/supabase'

/**
 * The product's whole claim: someone read it, and the owner gets told.
 *
 * This is the test worth having even though it is the slowest, because a break
 * here is silent. The dashboard would keep loading, every unit test would keep
 * passing, and the only symptom would be proposals that nobody ever seems to
 * open. That is indistinguishable from a quiet week.
 *
 * It waits out real seconds because there is no honest shortcut: a visit only
 * counts after three seconds of *visible* attention, by design, and faking the
 * clock would test a tracker that does not exist.
 *
 * In local dev `/api/track` answers 503 even though the row is written, which
 * PRODUCTION.md documents as a dev-proxy quirk around beacon POSTs. So the
 * assertion is on the row, not the response. That is the better assertion
 * anyway: the owner cares whether the read was recorded, not what an internal
 * endpoint said while recording it.
 */

const PDF = fileURLToPath(
  new URL('./fixtures/sample-proposal.pdf', import.meta.url),
)

let owner: TestOwner
let token: string
let proposalId: string

test.beforeAll(async () => {
  owner = await createTestOwner()
  const seeded = await seedProposal(owner, { pdf: readFileSync(PDF) })
  token = seeded.token!
  proposalId = seeded.id
})

test.afterAll(async () => {
  await deleteTestOwner(owner)
})

test('a real read is recorded as a qualified visit', async ({ page }) => {
  await page.goto(`/p/${token}`)

  // The reader is looking at the proposal, not a spinner.
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })

  // Time only accrues while the tab is visible and there has been recent input,
  // so the test has to behave like a person for longer than the three-second
  // qualifying threshold, and past the ten-second flush.
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(400 + i * 20, 300 + i * 10)
    await page.waitForTimeout(2000)
  }

  // Leaving is what forces the final flush, the same as closing the tab.
  await page.goto('/')

  const db = admin()
  await expect
    .poll(
      async () => {
        const { data } = await db
          .from('visits')
          .select('is_qualified, is_bot, engaged_ms')
          // Scoped to this proposal: the project holds real visits too, and an
          // unscoped count would pass without the read under test happening.
          .eq('proposal_id', proposalId)
          .eq('is_qualified', true)
          .eq('is_bot', false)
          .gt('engaged_ms', 0)
        return data?.length ?? 0
      },
      {
        timeout: 20_000,
        message: 'no qualified visit was recorded for the read',
      },
    )
    .toBeGreaterThan(0)
})
