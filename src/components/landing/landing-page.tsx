import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PageContainer } from '#/components/page-container'
import { ProductHuntBadge } from '#/components/product-hunt-badge'
import { Button } from '#/components/ui/button'
import { Faq } from '#/components/landing/faq'
import { Pricing } from '#/components/landing/pricing'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
import {
  AttentionShot,
  DashboardShot,
  ForwardShot,
  IntentShot,
  LinkShot,
} from '#/components/landing/product-shots'
import { COMPETITORS } from '#/components/compare/competitors'
import { PDF_MAX_MB } from '#/constants'
import { socialMeta } from '#/lib/seo'
import { cn } from '#/lib/utils'

// Two titles, on purpose. The tab and the search result answer what someone
// types into Google when they have this problem — "proposal tracking software
// for agencies" — while the H1 stays the hook, because a page that opens with
// its own category name sells nothing. Google reads the title for intent and
// the page for whether it delivers on it.
const TITLE = 'Proposal Tracking Software for Agencies | Closewatch'
const DESCRIPTION =
  'Proposal tracking for agencies: turn the PDF you already send into a link that shows who opened it, how long they spent on pricing, and who they forwarded it to.'

// The card, on the other hand, is read in a feed by someone who was not
// looking for anything. Hook first, audience second.
const SOCIAL_TITLE = 'Proposal tracking built for agencies'
const SOCIAL_DESCRIPTION =
  'Stop guessing whether they read it. See which client opened the proposal, how long they spent on pricing, and whether it reached the person who signs.'

// The landing page is the one URL that gets pasted into a chat or a search
// result, so it carries its own title and description rather than inheriting
// the app's bare "Closewatch".
//
// og:url is the home page even on /r/hn and the rest. Without it a scraper
// keys the card off whatever URL it was handed, and the same page shared from
// three threads becomes three unrelated cards.
export function landingMeta() {
  return [
    { title: TITLE },
    { name: 'description', content: DESCRIPTION },
    ...socialMeta({
      title: SOCIAL_TITLE,
      description: SOCIAL_DESCRIPTION,
      path: '/',
    }),
  ]
}

const COMPARISONS = [
  { to: '/vs/proposify', ...COMPETITORS.proposify },
  { to: '/vs/pandadoc', ...COMPETITORS.pandadoc },
  { to: '/vs/docsend', ...COMPETITORS.docsend },
] as const

const STEPS = [
  {
    n: '01',
    title: 'Upload the PDF you already send',
    body: `Any proposal up to ${PDF_MAX_MB} MB. Nothing to rebuild and no template to adopt. It is the same document you were about to email.`,
  },
  {
    n: '02',
    title: 'Send one link per recipient',
    body: 'Your client clicks it and reads the proposal. No account, no plugin, nothing to install. That separate link per person is what tells you who actually read it.',
  },
  {
    n: '03',
    title: 'Call the deal that is running hot',
    body: 'Opens, time on pricing, forwards, prints. Your pipeline sorts itself, so the client worth a call today is the one at the top of the list.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        {/* Hero */}
        <PageContainer className="pb-16 pt-14 sm:pb-20 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
            <div>
              <p className="kicker text-brand">
                Proposal tracking for agencies
              </p>
              <h1 className="mt-4 max-w-[15ch] font-display text-4xl font-semibold leading-[1.03] tracking-[-0.035em] sm:text-5xl lg:text-[3.4rem]">
                Stop guessing whether they read it.
              </h1>
              <p className="mt-5 max-w-[54ch] text-[17px] leading-relaxed text-ink-2">
                Closewatch turns the proposal PDF your agency already sends into
                a tracked link. You see which client opened it, how long they
                spent on your pricing, and whether it reached the person who
                signs, so you know which deal to chase this week and which one
                to let go.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link to="/login">
                    Start tracking your proposals
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/demo">Try it on yourself</Link>
                </Button>
              </div>

              <p className="mt-4 text-[13px] text-ink-3">
                Free to start · Your client installs nothing · Revoke any link
                at any time
              </p>

              {/* The margin lives on the badge rather than on a wrapper, so
                  that the pre-launch state — the component returning null —
                  leaves no empty element holding 32px of space open. */}
              <ProductHuntBadge className="mt-8 inline-block" />
            </div>

            <DashboardShot />
          </div>
        </PageContainer>

        {/* The problem */}
        <section className="border-y border-line bg-surface">
          <PageContainer className="py-14 sm:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
              <div>
                <h2 className="max-w-[20ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                  &ldquo;Just following up on that proposal&rdquo;
                </h2>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
                  You send the PDF and the line goes dead. Was it read? Did it
                  reach the person with the budget? Did the number scare them,
                  or did it never get opened at all? Run five of those at once,
                  one per client, and every follow-up is a guess: sent too
                  early, too late, or to the wrong person entirely.
                </p>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
                  A tracked link answers it. Not with a vanity open-rate, but
                  with the handful of things that actually predict a close.
                </p>
              </div>

              <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
                {[
                  {
                    k: 'Who opened it',
                    v: 'Qualified reads only. Bots and link previews are filtered out before anything counts.',
                  },
                  {
                    k: 'How long on pricing',
                    v: 'Per-page dwell time, so you know whether they studied the number or skipped past it.',
                  },
                  {
                    k: 'Who else saw it',
                    v: 'A second reader on a one-person link means it reached a budget holder. That is your call to make.',
                  },
                ].map((p) => (
                  <div key={p.k} className="bg-surface px-4 py-5">
                    <dt className="kicker">{p.k}</dt>
                    <dd className="mt-2 text-[13px] leading-relaxed text-ink-2">
                      {p.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </PageContainer>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">How it works</p>
            <h2 className="mt-3 max-w-[22ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Three steps, and none of them change how your agency sells.
            </h2>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="bg-surface px-5 py-6">
                  <p className="font-mono text-[11px] tracking-wider text-brand">
                    {s.n}
                  </p>
                  <p className="mt-3 font-display text-base font-semibold tracking-tight">
                    {s.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>

            {/* Centred rather than left-aligned: on its own under a
                full-width row of steps, a shot pinned to the left edge reads as
                the start of a column that never arrives. */}
            <div className="mx-auto mt-10 max-w-2xl">
              <LinkShot />
            </div>
          </PageContainer>
        </section>

        {/* Feature deep-dives */}
        <section className="border-y border-line bg-surface">
          <PageContainer className="flex flex-col gap-16 py-16 sm:gap-20 sm:py-20">
            <Feature
              kicker="Attention, page by page"
              title="See exactly where they slowed down."
              body="Closewatch measures visible attention on every page, so a proposal is not one number but a shape. Tag your pricing page and it gets tracked by name, because two minutes there means something very different from two minutes on your cover."
              shot={<AttentionShot />}
            />
            <Feature
              reverse
              kicker="Forwarding"
              title="Know when it reached the person who signs."
              body="One link per recipient is the whole trick. Closewatch counts distinct readers on each link — a browser that has not opened it before — so when a link you sent to one person turns into three readers, you know it moved. Whether that was a forward to the person who signs or your contact on their phone is a call only you can make, and the dashboard says what it saw rather than guessing for you."
              shot={<ForwardShot />}
            />
            <Feature
              kicker="Intent, explained"
              title="A score that shows its working."
              body="Repeat opens, pricing dwell, depth of read, forwards, downloads and prints all add points on a fixed scale. No model and no black box. Every proposal lists the reasons behind its own number, because the reasons are what you act on."
              shot={<IntentShot />}
            />
          </PageContainer>
        </section>

        {/* Who it is for. Sits between the feature deep-dives and the price
            on purpose: "does this fit the way we work" is the last question
            anyone asks before looking at what it costs. */}
        <section id="agencies" className="scroll-mt-16">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">For agencies</p>
            <h2 className="mt-3 max-w-[24ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Built for a pipeline with a dozen clients in it.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
              One proposal is easy to keep in your head. Nine of them across six
              clients, each with a different person reading it, is a pipeline —
              and that is where a tracked link stops being a curiosity and
              starts deciding where your week goes.
            </p>

            <dl className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
              {[
                {
                  k: 'Grouped by client',
                  v: 'Every proposal rolls up under the client it belongs to, so you read an account rather than a folder of files.',
                },
                {
                  k: 'One link per stakeholder',
                  v: 'The ops lead and the founder get their own links. When the ops lead\u2019s picks up a second reader, you know it went upstairs.',
                },
                {
                  k: 'Ordered by what to do next',
                  v: 'The list sorts by intent, so Monday starts with the deal worth a call and not the one you happened to remember.',
                },
              ].map((p) => (
                <div key={p.k} className="bg-surface px-4 py-5">
                  <dt className="kicker">{p.k}</dt>
                  <dd className="mt-2 text-[13px] leading-relaxed text-ink-2">
                    {p.v}
                  </dd>
                </div>
              ))}
            </dl>
          </PageContainer>
        </section>

        {/* Pricing. Canvas rather than surface: the deep-dives above it are
            already a surface block, and the cards carry their own. */}
        <section id="pricing" className="scroll-mt-16">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Pricing</p>
            <h2 className="mt-3 max-w-[24ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              One recovered deal pays for a decade of this.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
              Start free and send a real proposal through it. If the first one
              tells you something you did not know, the rest is nineteen
              dollars.
            </p>
            <Pricing />
          </PageContainer>
        </section>

        {/* Already shopping. Sits after the price because that is when the
            question arrives, and it links out rather than arguing here: a
            competitor grid on a landing page is a page about them. It is also
            the only internal link the comparison pages get from the page with
            any authority, which is most of why it earns the space. */}
        <section className="border-y border-line bg-surface">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Weighing it up</p>
            <h2 className="mt-3 max-w-[26ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              How this compares to what you were going to buy.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
              Each of these is a good product and each of them is a bigger
              purchase than this one. The pages say where they win, not just
              where we do.
            </p>

            <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
              {COMPARISONS.map((c) => (
                <li key={c.to} className="bg-surface">
                  <Link
                    to={c.to}
                    className="flex h-full flex-col px-5 py-6 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <p className="font-display text-base font-semibold tracking-tight">
                      Closewatch vs {c.name}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                      {c.wedge}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand">
                      Read the comparison
                      <ArrowRight aria-hidden className="size-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-5 text-[13px] text-ink-3">
              Or read how this works for{' '}
              <Link
                to="/proposal-tracking-for-agencies"
                className="text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                agencies
              </Link>{' '}
              and{' '}
              <Link
                to="/proposal-tracking-for-fractional-executives"
                className="text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                fractional executives
              </Link>
              .
            </p>
            {/* SEO.md: pages worth anything are linked from the home page body,
                not only the footer. These two are the hubs every guide sits
                under. */}
            <p className="mt-2 text-[13px] text-ink-3">
              New to proposal tracking? Start with{' '}
              <Link
                to="/proposal-tracking"
                className="text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                what it is
              </Link>
              , or browse the{' '}
              <Link
                to="/guides"
                className="text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                guides
              </Link>
              .
            </p>
          </PageContainer>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Questions</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              The things people ask first.
            </h2>
            {/* Held to a readable measure. Left to the full container, the
                questions sit at one edge and their chevrons at the other, a
                thousand pixels apart, and stop reading as one control. */}
            <div className="max-w-3xl">
              <Faq />
            </div>
          </PageContainer>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-line bg-surface">
          <PageContainer className="py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-[20ch] font-display text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Your next follow-up could be an informed one.
            </h2>
            <p className="mx-auto mt-4 max-w-[50ch] text-[15px] leading-relaxed text-ink-2">
              Upload a proposal, send the link, and watch what happens. It takes
              about a minute, and the next time a client goes quiet you will
              know why.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/login">
                Get started
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

function Feature({
  kicker,
  title,
  body,
  shot,
  reverse = false,
}: {
  kicker: string
  title: string
  body: string
  shot: React.ReactNode
  reverse?: boolean
}) {
  // `min-w-0` on both cells is load-bearing, not tidiness. A grid track is
  // floored at the min-content width of what is in it, and the shots are rows
  // of nowrap labels and fixed-width numbers whose min-content runs to about
  // 414px. Without this the track took that width on a 320px phone, the text
  // cell stretched to match it, and the whole landing page scrolled sideways.
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={cn('min-w-0', reverse && 'lg:order-2')}>
        <p className="kicker text-brand">{kicker}</p>
        <h3 className="mt-3 max-w-[20ch] font-display text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
          {title}
        </h3>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
          {body}
        </p>
      </div>
      <div className={cn('min-w-0', reverse && 'lg:order-1')}>{shot}</div>
    </div>
  )
}
