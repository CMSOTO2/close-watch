import type { PageSection } from '#/lib/supabase/types'

/**
 * The proposal a visitor reads in the demo.
 *
 * Written rather than rendered from a PDF on purpose. The demo is arguing that
 * the *readout* is worth having, not that pdf.js works, and a 2 MB download in
 * front of the argument would cost more visitors than the fidelity is worth.
 * The page shapes and the section tags are the real ones, which is what the
 * scoring reads.
 */

export type SamplePage = {
  page: number
  section: PageSection
  /** Shown in the corner of the page, the way a real deck numbers itself. */
  kicker: string
  title: string
  body: Array<string>
  /** Rendered as a priced table. Only the pricing page has one. */
  lines?: Array<{ item: string; amount: string }>
}

export const SAMPLE_CLIENT = 'Meridian Health'
export const SAMPLE_TITLE = 'Brand identity and website'

export const SAMPLE_PAGES: Array<SamplePage> = [
  {
    page: 1,
    section: 'cover',
    kicker: 'Proposal',
    title: 'Brand identity and website',
    body: [`Prepared for ${SAMPLE_CLIENT}`, 'Northwind Studio · March 2026'],
  },
  {
    page: 2,
    section: 'summary',
    kicker: '1.0 Overview',
    title: 'Where Meridian is now',
    body: [
      'Meridian has grown from one clinic to nine in four years, and the brand has not kept up. The logo predates the expansion, the site was built for a single location, and the three sub-brands picked up along the way each look like a different company.',
      'The cost is not aesthetic. Referring physicians cannot tell which Meridian they are looking at, and the intake form loses roughly a third of the people who start it.',
      'This engagement rebuilds the identity around the group as it exists now, and rebuilds the site around the two things it has to do: get a referral in, and get an appointment booked.',
    ],
  },
  {
    page: 3,
    section: 'scope',
    kicker: '2.0 Scope of work',
    title: 'What you get',
    body: [
      'Identity system — wordmark, clinic lockups, colour, and a typographic scale that survives being set at waiting-room size and at 13px in a form label.',
      'Component library — the twenty or so pieces the site is actually made of, built in Figma and handed over as code.',
      'Website — nine clinic pages, referral flow, and booking, on a CMS your team can run without us.',
      'Out of scope: photography, copywriting beyond interface text, and the patient portal, which stays on its current vendor.',
    ],
  },
  {
    page: 4,
    section: 'timeline',
    kicker: '3.0 Timeline',
    title: 'Fourteen weeks, three phases',
    body: [
      'Phase 1 — Discovery and identity, weeks 1 to 5. Stakeholder interviews in week 1, first identity review at the end of week 3, sign-off in week 5.',
      'Phase 2 — System and design, weeks 6 to 10. Component library, then the nine templates. Referral flow prototyped and tested with three referring practices.',
      'Phase 3 — Build and launch, weeks 11 to 14. Content migration runs in parallel from week 11. Launch on a Tuesday, never a Friday.',
    ],
  },
  {
    page: 5,
    section: 'pricing',
    kicker: '4.0 Investment',
    title: 'Investment',
    body: [
      'Fixed fee, billed in three instalments against the phases above. A 25% deposit holds the start date.',
    ],
    lines: [
      { item: 'Discovery and identity system', amount: '$34,000' },
      { item: 'Component library and templates', amount: '$28,000' },
      { item: 'Website build and migration', amount: '$22,500' },
      { item: 'Referral flow testing', amount: '$6,500' },
      { item: 'Total', amount: '$91,000' },
    ],
  },
  {
    page: 6,
    section: 'terms',
    kicker: '5.0 Terms',
    title: 'The short version',
    body: [
      'Intellectual property in the delivered work transfers to Meridian on final payment. Source files come with it.',
      'Either side may terminate with 14 days written notice; work completed to that point is invoiced at the phase rate.',
      'This proposal is valid for 30 days from the date on the cover.',
    ],
  },
]

/** Page numbers the scorer treats as the pricing section. */
export const PRICING_PAGES = SAMPLE_PAGES.filter(
  (p) => p.section === 'pricing',
).map((p) => p.page)

export const SAMPLE_PAGE_COUNT = SAMPLE_PAGES.length
