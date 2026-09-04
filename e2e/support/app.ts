import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

/**
 * Navigate, then wait for React to actually own the thing you are about to use.
 *
 * Every route here is server-rendered, so a form is on screen and typeable a
 * beat before it is wired up. Filling it in that window looks like it worked:
 * the value lands in the DOM and `inputValue()` reads it straight back.
 * Hydration then mounts the real components over the top, the controlled
 * inputs snap to their empty initial state, and submitting fails validation on
 * fields the test just filled. It reads as a broken form rather than a race,
 * which is why this exists instead of a sleep.
 *
 * React writes `__reactFiber$…` onto every DOM node it adopts, and the
 * server-rendered document has none, so their arrival on the specific element
 * is exactly the moment that element became real. `__TSR_ROUTER__` is not
 * enough on its own: the router mounts a few hundred milliseconds before the
 * route's own subtree finishes, which is a race that passes locally and fails
 * on a loaded CI box.
 */
export async function awaitReact(locator: Locator) {
  await locator.first().waitFor({ state: 'attached' })
  await expect
    .poll(
      async () =>
        locator
          .first()
          .evaluate((el) => Object.keys(el).some((k) => k.startsWith('__reactFiber'))),
      { timeout: 30_000 },
    )
    .toBe(true)
}

/** `page.goto`, plus the wait above for the element the test starts with. */
export async function gotoHydrated(page: Page, path: string, ready: string) {
  await page.goto(path)
  await awaitReact(page.locator(ready))
}
