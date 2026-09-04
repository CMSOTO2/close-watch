import { createFileRoute } from '@tanstack/react-router'
import { canonical, socialMeta } from '#/lib/seo'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { ProposalDemo } from '#/components/demo/proposal-demo'

const TITLE = 'Proposal Tracking Demo for Agencies | Closewatch'
const DESCRIPTION =
  'Read a sample agency proposal the way a client would, then see the attention report your reading produced. No sign-up, nothing stored.'

const SOCIAL_TITLE = 'Read a proposal, then see what the sender saw'
const SOCIAL_DESCRIPTION =
  'Read a sample proposal the way a client would, then see the tracking report it produced. No sign-up, nothing stored.'

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
      ...socialMeta({
        title: SOCIAL_TITLE,
        description: SOCIAL_DESCRIPTION,
        path: '/demo',
      }),
    ],
    links: canonical('/demo'),
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
