/**
 * The PDF the e2e upload test sends.
 *
 * Committed rather than generated at test time so a run does not depend on a
 * browser launch it does not otherwise need. Rerun this if the fixture has to
 * change shape, and expect the page count assertion in upload.spec.ts to move
 * with it.
 */
import { chromium } from '@playwright/test'

const page = `
<style>
  @page { size: A4; margin: 0 }
  /* The default body margin spills each section onto a second page. */
  body { margin: 0 }
  section { height: 297mm; padding: 24mm; font: 16px/1.6 Helvetica, Arial, sans-serif;
            box-sizing: border-box }
  /* Not on the last one: a trailing break adds a sixth, blank page. */
  section:not(:last-child) { page-break-after: always }
  h1 { font-size: 34px } h2 { font-size: 26px }
  td { padding: 4px 18px 4px 0 }
</style>
<section>
  <h1>Website Redesign Proposal</h1>
  <p>Prepared for Northwind Studio</p>
  <p>4 September 2026</p>
</section>
<section>
  <h2>Executive summary</h2>
  <p>Northwind Studio needs a site that loads fast and converts. This proposal
  covers the redesign, the build and the handover, over ten weeks.</p>
  <p>The opportunity is a measurable lift in qualified enquiries.</p>
</section>
<section>
  <h2>Scope of work</h2>
  <p>Deliverables: a design system, twelve page templates and a headless CMS
  integration. Our approach runs in three workstreams.</p>
  <p>Out of scope: content writing, photography, ongoing hosting.</p>
</section>
<section>
  <h2>Pricing</h2>
  <table>
    <tr><td>Design system</td><td>$18,000</td></tr>
    <tr><td>Template build</td><td>$14,500</td></tr>
    <tr><td>CMS integration</td><td>$6,500</td></tr>
    <tr><td>Total investment</td><td>$39,000</td></tr>
  </table>
  <p>Payment terms: 40% on signature, 60% on handover.</p>
</section>
<section>
  <h2>Timeline</h2>
  <p>Kick-off in week 1, design through week 4, build to week 9, handover week 10.
  Milestones are reviewed fortnightly.</p>
</section>
`

const browser = await chromium.launch()
const p = await browser.newPage()
await p.setContent(page, { waitUntil: 'load' })
await p.pdf({ path: 'e2e/fixtures/sample-proposal.pdf', format: 'A4', printBackground: true })
await browser.close()
console.log('written')
