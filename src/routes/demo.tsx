import { createFileRoute, Link } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { PageContainer } from '#/components/page-container'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { ProposalDemo } from '#/components/demo/proposal-demo'

export const Route = createFileRoute('/demo')({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: 'Closewatch demo: read a proposal, then see what the sender saw' },
      {
        name: 'description',
        content:
          'Read a sample proposal the way a client would, then see the attention report it produces. No sign-up, nothing stored.',
      },
    ],
  }),
})

function DemoPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <PageContainer className="flex items-center justify-between gap-4 py-3">
          <Link
            to="/"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Wordmark />
          </Link>
          <nav aria-label="Demo" className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </nav>
        </PageContainer>
      </header>

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
