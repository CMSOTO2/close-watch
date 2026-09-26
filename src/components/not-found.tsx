import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { HeatMeter } from '#/components/dashboard/heat-meter'
import { PageContainer } from '#/components/page-container'
import { SiteFooter } from '#/components/site-footer'
import { SiteHeader } from '#/components/landing/site-header'
import { Button } from '#/components/ui/button'

/**
 * The 404 for anything the router does not match.
 *
 * It used to be TanStack's built-in fallback — the literal string "Not Found"
 * on a white page, no header, no footer, no link anywhere. A visitor who
 * mistyped a URL or followed a stale link had the back button and nothing
 * else, and a crawler that found one saw a page with no route out of it into
 * the rest of the site. So the point of this component is the chrome: the
 * normal header and the normal footer, which between them reach the demo, the
 * pricing, the questions, the comparison pages and the legal pages.
 *
 * The joke in the middle is the product's own vocabulary turned on itself. The
 * whole app exists to tell you whether the thing you sent was ever opened, and
 * a missing page is the one document in the system that never will be — so it
 * gets a real proposal row, a real heat meter reading cold, and a score of
 * zero. It reads as a joke to someone who already uses Closewatch and as a
 * demonstration to someone who does not, which is most of who lands on a 404.
 */
export function NotFound() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // The path is echoed back because "we could not find it" is more convincing
  // when it names the thing, and a mistyped URL is usually obvious once seen.
  // Capped and truncated rather than trusted: it is whatever was in the
  // address bar, and a 2,000-character path should not be able to shove the
  // buttons below the fold. React escapes it, so length is the only risk.
  const shown = pathname.length > 42 ? `${pathname.slice(0, 42)}…` : pathname

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />

      <PageContainer asMain className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-xl">
          <p className="kicker">404 · never opened</p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl">
            This one went cold.
          </h1>
          <p className="mt-4 text-ink-2">
            There is no page at that address — it may have moved, or the link
            that brought you here may have been mistyped. Nothing was tracked,
            which is the one thing we can tell you for certain.
          </p>

          {/* A real proposal row, built from the same parts the dashboard uses
              rather than a picture of one, so it stays right when the row or
              the meter changes. The cold spine is transparent in the list too:
              a deal nobody has opened does not earn a mark. */}
          <div className="relative mt-8 overflow-hidden rounded-md border border-line bg-surface px-4 py-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px] font-medium">
                  {shown}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-2">
                  Requested once · by you
                </p>
              </div>
              <HeatMeter band="cold" score={0} />
            </div>
            <p className="mt-2 text-xs text-ink-2">
              Not opened yet · 0 readers · no time on any page
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="brand">
              <Link to="/">
                Back to the homepage
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/demo">Try the demo instead</Link>
            </Button>
          </div>
        </div>
      </PageContainer>

      <SiteFooter />
    </div>
  )
}
