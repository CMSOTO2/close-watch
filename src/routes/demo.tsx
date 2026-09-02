import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { ProposalDemo } from '#/components/demo/proposal-demo'
import { OG_IMAGE } from '#/components/landing/landing-page'
import { publicEnv } from '#/env'

const TITLE = 'Closewatch demo: read a proposal, then see what the sender saw'
const DESCRIPTION =
  'Read a sample proposal the way a client would, then see the attention report it produces. No sign-up, nothing stored.'

// The demo is the link worth pasting into a thread, so it carries the same
// social tags the landing page does. A title and description alone leave the
// card to whatever the scraper guesses, and the card is most of what anyone
// sees in a feed. Same image as the landing page: it says what the product is,
// which is the job here too. og:url points at /demo rather than home, because
// this one is a destination on its own.
export const Route = createFileRoute('/demo')({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${publicEnv.VITE_PUBLIC_URL}/demo` },
      { property: 'og:image', content: OG_IMAGE },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content:
          'Closewatch: stop guessing whether they read it. An intent score of 84 beside three lines of activity, opened 3 times, 4m 12s on pricing, forwarded to 2 readers.',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
})

function DemoPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader current="demo" />

      <PageContainer asMain className="py-10 sm:py-12">
        <p className="kicker text-brand">Live demo</p>
        <h1 className="mt-3 max-w-[24ch] font-display text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
          Read this proposal. Then see what you just told the sender.
        </h1>
        <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
          This is the real tracker and the real scoring, running on you. Read it
          the way you would read a proposal that landed in your inbox, then open
          the panel and see the report your reading produced.
        </p>

        <div className="mt-9">
          <ProposalDemo />
        </div>
      </PageContainer>
    </div>
  )
}
