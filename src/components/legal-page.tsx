import { Link } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { PageContainer } from '#/components/page-container'
import { ThemeToggle } from '#/components/theme-toggle'
import { Button } from '#/components/ui/button'
import { useSignedIn } from '#/lib/use-signed-in'

/**
 * Shared chrome for the privacy policy and the terms.
 *
 * Both are linked from Google's OAuth consent screen, which requires them to
 * sit on the same verified domain as the app, so they are real routes here
 * rather than a hosted document somewhere else.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro: string
  children: React.ReactNode
}) {
  // Terms and privacy are exactly what a paying owner opens while signed in,
  // from the app footer; "Sign in" here read as being logged out.
  const signedIn = useSignedIn()

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <PageContainer className="flex items-center justify-between gap-4 py-3">
          <Link to="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild size="sm" variant="outline">
              {signedIn ? (
                <Link to="/dashboard">Dashboard</Link>
              ) : (
                <Link to="/login">Sign in</Link>
              )}
            </Button>
          </div>
        </PageContainer>
      </header>

      <PageContainer asMain className="py-14 sm:py-16">
        <div className="max-w-[70ch]">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.025em]">
            {title}
          </h1>
          <p className="kicker mt-3">Last updated {updated}</p>
          <p className="mt-6 text-[15px] leading-relaxed text-ink-2">{intro}</p>

          <div className="mt-10 flex flex-col gap-9">{children}</div>

          <p className="mt-12 border-t border-line pt-6 text-[13px] text-ink-2">
            Questions about anything here? Email{' '}
            <a
              href="mailto:hello@getclosewatch.com"
              className="font-medium text-brand hover:underline"
            >
              hello@getclosewatch.com
            </a>
            .
          </p>
        </div>
      </PageContainer>

      <footer className="border-t border-line">
        <PageContainer className="flex flex-wrap items-center justify-between gap-4 py-8">
          <Wordmark />
          <nav className="flex items-center gap-4 text-xs text-ink-2">
            <Link to="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-ink">
              Terms
            </Link>
            <span className="text-ink-3">
              © {new Date().getUTCFullYear()} Closewatch
            </span>
          </nav>
        </PageContainer>
      </footer>
    </div>
  )
}

/** One titled block of a policy. */
export function Clause({
  heading,
  children,
}: {
  heading: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold tracking-[-0.015em]">
        {heading}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-ink-2">
        {children}
      </div>
    </section>
  )
}

/** A plain bulleted list, used for the "what we store" enumerations. */
export function Bullets({ items }: { items: Array<React.ReactNode> }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-ink-3">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
