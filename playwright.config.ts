import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests, kept deliberately few.
 *
 * These cover the three paths where a break is both silent and expensive: a
 * proposal that cannot be sent, a read that is never recorded, and a free plan
 * that forgets to stop at two. Everything else the unit tests already reach, and
 * a broad browser suite on a product this young costs more in flakes than it
 * returns in caught bugs.
 *
 * They run against `pnpm dev` and the Supabase project in `.env`, which today is
 * the same project production uses. Every test therefore makes its own account
 * under `@e2e.closewatch.test` and deletes it afterwards. When production gets
 * its own project, point this at the other one and delete this paragraph.
 */

// Node loads .env for the dev server through Vite, but this config and the
// tests are plain Node and need it themselves.
try {
  process.loadEnvFile('.env')
} catch {
  // Absent in CI, where the variables arrive as real environment variables.
}

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
]
const missing = required.filter((key) => !process.env[key])
if (missing.length) {
  throw new Error(`e2e needs ${missing.join(', ')} — see .env.example`)
}

export default defineConfig({
  testDir: './e2e',
  // The tracking test waits out real seconds of reading; there is no honest way
  // to make visible time pass faster.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // a11y/ has its own config (playwright.a11y.config.ts) that needs no secrets.
      testIgnore: [/upload\.mobile\.spec\.ts/, /a11y\//],
      use: { ...devices['Desktop Chrome'] },
    },
    // Most arrivals are phones — the launch traffic ran 16 mobile to 6 desktop,
    // 13 of those iOS — and the upload form is the one screen they have to get
    // through. Only that spec runs here: a second full pass of the suite on
    // WebKit is the flake tax this file's header is about, while the form
    // itself has already broken on WebKit alone once (see e2e/upload.spec.ts).
    {
      name: 'mobile-safari',
      testMatch: /upload\.mobile\.spec\.ts/,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: /upload\.mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
