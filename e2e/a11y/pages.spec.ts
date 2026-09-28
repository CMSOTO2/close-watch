import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Every page a signed-out visitor can reach, scanned by axe against WCAG 2.2 A
 * and AA, once per colour scheme.
 *
 * Both schemes because the theme follows `prefers-color-scheme` and the two
 * palettes fail in different places: gold that passes as a mark on charcoal is
 * exactly the colour that turns to unreadable brown as text on near-white.
 *
 * /demo is here on purpose. It renders the real dashboard, proposal page and
 * viewer components over sample data, so the signed-in UI gets checked without
 * an account, a Supabase project, or any secret. That is what lets this suite
 * run on every push in CI while the rest of e2e waits for repository secrets.
 */

type Result = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number]

const NOT_FOUND = '/this-page-does-not-exist'

const PAGES = [
  '/',
  '/demo',
  '/about',
  '/login',
  '/proposal-tracking',
  '/proposal-tracking-for-agencies',
  '/proposal-tracking-for-fractional-executives',
  '/guides',
  '/guides/how-to-know-if-client-read-proposal',
  '/vs/docsend',
  '/vs/pandadoc',
  '/vs/proposify',
  '/privacy',
  '/terms',
  '/dpa',
  NOT_FOUND,
]

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** One line per failing element, so a CI log says what to fix and where. */
function describe(violations: Result[]): string {
  return violations
    .flatMap((v) =>
      v.nodes.map(
        (n) =>
          `[${v.impact}] ${v.id}: ${v.help}\n    at ${n.target.join(' ')}\n    ${n.failureSummary?.split('\n').slice(1).join(' ').trim() ?? ''}`,
      ),
    )
    .join('\n')
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme })

    for (const path of PAGES) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        const response = await page.goto(path)
        // An error page can be perfectly accessible. Make sure it is the real one.
        expect(response?.status()).toBe(path === NOT_FOUND ? 404 : 200)
        // Hydration swaps in client-only pieces (theme toggle, demo state);
        // scanning before it would check a page nobody actually sees.
        await page.waitForLoadState('networkidle')
        // Let entrance transitions land. Mid-fade, a row is a few percent opaque
        // and axe measures that as a real contrast failure. Infinite animations
        // (pulses) never finish, so only the finite ones are waited on.
        await page.evaluate(() =>
          Promise.all(
            document
              .getAnimations()
              .filter((a) => a.effect?.getTiming().iterations !== Infinity)
              .map((a) => a.finished.catch(() => {})),
          ),
        )

        const { violations } = await new AxeBuilder({ page })
          .withTags(WCAG)
          .analyze()

        expect(violations.length, describe(violations)).toBe(0)
      })
    }
  })
}
