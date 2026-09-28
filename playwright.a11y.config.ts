import { defineConfig, devices } from '@playwright/test'

/**
 * Accessibility checks for the signed-out pages, split from the main e2e config
 * because they need nothing that config does: no Supabase project, no secret
 * key, no test accounts. That is what lets CI run them on every push.
 *
 * `pnpm test:a11y` locally reuses a running `pnpm dev`. CI builds first and
 * serves the production bundle, so what gets scanned is what ships.
 */
export default defineConfig({
  testDir: './e2e/a11y',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'pnpm preview --port 3000' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
