import { createFileRoute, Link } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { PageContainer } from '#/components/page-container'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

const POINTS = [
  {
    kicker: 'Who opened it',
    body: 'Qualified opens only — bots and your own previews are filtered out before anything counts.',
  },
  {
    kicker: 'How long on pricing',
    body: 'Per-page dwell time, so you know whether they read the number or skipped past it.',
  },
  {
    kicker: 'Who else saw it',
    body: 'A second reader on a one-recipient link means it reached a budget holder. That is your call.',
  },
]

function Home() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <PageContainer className="flex items-center justify-between gap-4 py-3">
          <Wordmark />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </PageContainer>
      </header>

      <PageContainer asMain className="py-16 sm:py-20 lg:py-24">
        <p className="kicker text-brand">Proposal intelligence</p>
        <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">
          Know which proposals are actually being read.
        </h1>
        <p className="mt-5 max-w-[58ch] text-base text-ink-2">
          Upload the PDF you already send. Closewatch gives you a link that
          tells you when your client opened it, how long they spent on pricing,
          and whether they forwarded it to someone else.
        </p>
        <Button asChild className="mt-8">
          <Link to="/login">Get started</Link>
        </Button>

        <div className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {POINTS.map((p) => (
            <div key={p.kicker} className="bg-surface px-4 py-5">
              <p className="kicker">{p.kicker}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </PageContainer>
    </div>
  )
}
