import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { Button } from '#/components/ui/button'
import { SiteFooter } from '#/components/site-footer'
import { PRICES_CHECKED } from '#/components/compare/competitors'
import type { Competitor } from '#/components/compare/competitors'

/**
 * The page behind every /vs/… route.
 *
 * One template rather than three hand-built pages, because the argument has
 * the same shape every time and three copies of it would drift apart by the
 * second edit. What differs between them lives in competitors.ts.
 *
 * The section order is deliberate. The case *for the other product* comes
 * before the case for this one: a reader who arrived searching "<product>
 * alternative" is already using it, and a page that opens by telling them
 * their choice was stupid is a page they close. Conceding the cases where the
 * other tool genuinely wins is what buys the right to make the case where it
 * does not.
 */
export function ComparisonPage({ c }: { c: Competitor }) {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        <PageContainer className="pt-12 pb-14 sm:pt-16">
          <p className="kicker text-brand">Honest comparison</p>
          <h1 className="mt-3 max-w-[20ch] font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Closewatch vs {c.name}
          </h1>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">
            {c.wedge}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/login">
                Start free
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/demo">See it work first</Link>
            </Button>
          </div>
        </PageContainer>

        {/* The argument */}
        <section className="border-y border-line bg-surface">
          <PageContainer className="py-14 sm:py-16">
            <h2 className="max-w-[26ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              What {c.name} is, and what this is instead
            </h2>
            <div className="mt-6 flex max-w-[64ch] flex-col gap-4">
              {c.body.map((para) => (
                <p
                  key={para}
                  className="text-[15px] leading-relaxed text-ink-2"
                >
                  {para}
                </p>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* Both cases, side by side. Theirs first, and not softened. */}
        <section>
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">The honest version</p>
            <h2 className="mt-3 max-w-[28ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              {c.name} is the better buy for plenty of people.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
              If one of the cases below is yours, buy that instead. A tool that
              is wrong for you is worse than no tool, and you would work that
              out in a fortnight anyway.
            </p>

            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-2">
              <Case
                title={`Choose ${c.name} when`}
                items={c.betterWhen}
                tone="them"
              />
              <Case title="Choose Closewatch when" items={c.usWhen} tone="us" />
            </div>
          </PageContainer>
        </section>

        {/* The table */}
        <section className="border-y border-line bg-surface">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Side by side</p>
            <h2 className="mt-3 max-w-[26ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              The differences that do not change next quarter.
            </h2>

            {/* Its own scroller: three readable columns will not fit on a
                390px phone, so the table either scrolls inside this box or
                takes the whole page sideways. The row labels are stuck to the
                left edge, which is what makes the scroller usable — panning
                across to reach the Closewatch values used to take the labels
                with it and leave two columns of answers to questions you could
                no longer see. */}
            <div className="mt-9 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[34rem] border-collapse bg-canvas text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th className="sticky left-0 z-10 w-[26%] bg-canvas px-4 py-3 text-[11px] font-medium tracking-wider text-ink-3 uppercase after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line sm:after:hidden">
                      <span className="sr-only">Compared on</span>
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold">
                      {c.name}
                    </th>
                    <th className="px-4 py-3 text-[13px] font-semibold text-brand">
                      Closewatch
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.table.map((r) => (
                    <tr
                      key={r.row}
                      className="border-b border-line last:border-0"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-canvas px-4 py-3.5 align-top text-[13px] font-medium after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line sm:after:hidden"
                      >
                        {r.row}
                      </th>
                      <td className="px-4 py-3.5 align-top text-[13px] leading-relaxed text-ink-2">
                        {r.them}
                      </td>
                      <td className="px-4 py-3.5 align-top text-[13px] leading-relaxed text-ink-2">
                        {r.us}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-line bg-surface-2/40">
                    <th
                      scope="row"
                      className="px-4 py-3.5 align-top text-[13px] font-medium"
                    >
                      Price
                    </th>
                    <td className="px-4 py-3.5 align-top text-[13px] leading-relaxed text-ink-2">
                      {c.price}
                    </td>
                    <td className="px-4 py-3.5 align-top text-[13px] leading-relaxed text-ink-2">
                      Free, then $19/mo flat
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Prices belong to somebody else and move without telling us. */}
            <p className="mt-4 text-[13px] text-ink-3">
              {c.name} pricing checked {PRICES_CHECKED} and quoted as a starting
              point rather than a quote.{' '}
              <a
                href={c.pricingUrl}
                rel="nofollow noopener"
                target="_blank"
                className="underline underline-offset-2 transition-colors hover:text-ink-2"
              >
                See their pricing page
              </a>{' '}
              for today&rsquo;s number. Closewatch is free for two proposals
              being read at a time, with unlimited sending, and $19 a month for
              unlimited, whoever sends them.
            </p>
          </PageContainer>
        </section>

        {/* Close */}
        <section>
          <PageContainer className="py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-[24ch] font-display text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
              Send one real proposal through it and decide.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
              The free plan is not a trial with a clock on it. Two proposals can
              be live at once with all the tracking switched on, which is enough
              to find out whether knowing beats guessing.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/login">
                Start free
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </PageContainer>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function Case({
  title,
  items,
  tone,
}: {
  title: string
  items: Array<string>
  tone: 'them' | 'us'
}) {
  return (
    <div className="bg-surface px-5 py-6 sm:px-6">
      <h3 className="font-display text-base font-semibold tracking-tight">
        {title}
      </h3>
      <ul className="mt-5 flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-2"
          >
            {tone === 'us' ? (
              <Check
                aria-hidden
                className="mt-1 size-3.5 shrink-0 text-brand-2"
              />
            ) : (
              <Minus
                aria-hidden
                className="mt-1 size-3.5 shrink-0 text-ink-3"
              />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
