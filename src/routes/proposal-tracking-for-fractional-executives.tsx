import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
import { LongFormSections, QuestionList } from '#/components/long-form'
import { Button } from '#/components/ui/button'
import {
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'

const PATH = '/proposal-tracking-for-fractional-executives'

const TITLE = 'Proposal Tracking for Fractional Executives | Closewatch'
const DESCRIPTION =
  'Your proposal is read by one person and decided by another. See when it was forwarded, who else read it, and how long the budget holder spent on your rate.'

/**
 * The audience page POSITIONING.md argues for hardest.
 *
 * A fractional CMO or CFO almost never sells to the person who signs. The
 * proposal goes to a founder or an operator who forwards it to a board member,
 * a partner or a co-founder, and that forward is the single signal this product
 * detects best. Which makes this the one audience whose central problem is the
 * feature rather than a use of it, and the reason this page leads on forwarding
 * where the agency page leads on volume.
 */
export const Route = createFileRoute(
  '/proposal-tracking-for-fractional-executives',
)({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      ...socialMeta({
        title: 'Proposal tracking for fractional executives',
        description:
          'You pitch the founder. The board decides. See the moment your proposal is forwarded to the person who actually signs.',
        path: PATH,
      }),
    ],
    links: canonical(PATH),
    scripts: jsonLdScript(
      breadcrumbJsonLd([
        { name: 'Closewatch', path: '/' },
        { name: 'Proposal tracking for fractional executives', path: PATH },
      ]),
    ),
  }),
  component: FractionalPage,
})

const SIGNALS = [
  {
    k: 'The forward itself',
    v: 'A link you sent to one person, opened by a second and a third. Nobody circulates a proposal they have already decided against.',
  },
  {
    k: 'Who lingered on the rate',
    v: 'A founder skims the scope and stops at the number. Four minutes there from a second reader is a budget conversation happening without you.',
  },
  {
    k: 'The second visit',
    v: 'First reads are curiosity. A return visit days later, especially to one page, is somebody building a case internally.',
  },
]

const QUESTIONS = [
  {
    q: 'I send two or three proposals a month. Is this worth it?',
    a: 'That depends entirely on what one is worth. A fractional engagement is usually five figures over several months, so the arithmetic is not about volume — recovering one stalled conversation a year covers a decade of the subscription. If your engagements are small and quick, this is genuinely not for you.',
  },
  {
    q: 'My proposals are Google Docs, not PDFs.',
    a: 'Export to PDF and upload that. It is one step, and it is the same step that makes the document stop changing under the reader, which you want anyway once a number is in it.',
  },
  {
    q: 'Is it obvious to the client that I am tracking it?',
    a: 'Only if you tell them. The viewer shows the proposal and nothing else, so disclosure is your call. For this audience it is usually worth one line in the covering email: you are selling judgement to people who will be your colleagues, and a tool they discovered later would cost more than it earned.',
  },
  {
    q: 'What if they print it for a board meeting?',
    a: 'A print is recorded as its own event and scores. It is one of the better signals there is — nobody prints a proposal they are not about to discuss with somebody else in a room.',
  },
  {
    q: 'Can it tell me who the second reader was?',
    a: 'Not by name. Closewatch sees that a browser which has never opened the link before has opened it, when, and what it read. It does not ask readers for an email address, because that step costs replies. If you know who else is deciding, send them their own named link.',
  },
  {
    q: 'Does it work for engagement letters and SOWs as well as proposals?',
    a: 'Any PDF can be tracked the same way. The pricing signal works best when the document has a page that reads as pricing or fees, which Closewatch finds from the text on upload. If it guesses wrong, you tag the page by hand in a second.',
  },
  {
    q: 'How much does proposal tracking cost?',
    a: 'Closewatch is $19 a month flat for unlimited proposals, and free for two proposals being read at a time, with all the tracking switched on. There are no per-seat charges and no annual commitment.',
  },
]

/**
 * The long-form half, in markdown so it can link into the guides in a
 * sentence and carry screenshots the way they do.
 */
const DETAILS = `## How proposal tracking works for a fractional engagement

A fractional proposal is short, and it travels. It goes to the founder, who sends it to a co-founder or a board member, who reads it on a phone between meetings. Closewatch's proposal tracking is built around that trip.

Upload the proposal or engagement letter as a PDF and name the person it is going to. Closewatch gives you a link for them. If you already know who else will read it, the co-founder or the CFO, create a link for each of them too. Every link is named, so every read belongs to someone.

![Closewatch showing a tracked link ready to send, named for the person it is going to](/images/closewatch-tracked-link-per-recipient.webp "Each tracked link is named for the person it is going to. Sample data.")

## What a forwarded proposal looks like in Closewatch

When the link you sent the founder is opened in a browser that has never opened it, Closewatch marks a new reader, Reader 2, next to the founder's name. On the Solo plan it emails you when it happens. Closewatch will not claim a forward it cannot prove, because the founder on their phone looks the same as a board member. Timing usually tells you which: a new reader the next business day who goes straight to your rate is rarely the founder. [How to tell if a client forwarded your proposal](/guides/did-my-client-forward-my-proposal) has the patterns.

![Closewatch recent visits on a sample proposal, with two readers it was forwarded to and one who printed and downloaded it](/images/closewatch-forwarded-proposal-new-readers.webp "Forwarded readers on a sample proposal, and the named link each came through. Sample data.")

## What to do once your proposal has travelled

Once a proposal has been forwarded, your contact is selling you internally. Give them something to pass on: a one-page summary with the outcome, the rate and the start date, and the answer to the objection a CFO will raise. [How to get your proposal in front of the real decision maker](/guides/get-proposal-to-decision-maker) covers what to send, and how to ask for ten minutes with the person who signs.

If a week passes with only the founder reading, the proposal has not gone upstairs yet. [How to follow up on a proposal](/guides/how-to-follow-up-on-a-proposal) has the sequence for that case too.

## What proposal tracking cannot tell a fractional executive

It cannot name the second reader. Closewatch never learns a reader's name or email address from their visit. It cannot see the board meeting where your proposal was discussed, beyond the print that came before it. And it cannot tell you that the founder likes you but the budget is not there. Tracking narrows the reasons down. It does not hand you the answer.

Closewatch is also deliberately small: no e-signature, no editor, PDFs only. If you want a builder, [the best proposal tracking software](/guides/best-proposal-tracking-software) compares the tools with editors and signatures, and [proposal tracking vs email open tracking](/guides/proposal-tracking-vs-email-open-tracking) explains why a pixel on your email is no substitute. For the category itself, start with [what proposal tracking is](/proposal-tracking), or [try the demo](/demo) and read a sample proposal the way your client would.`

function FractionalPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        <PageContainer className="pt-12 pb-14 sm:pt-16">
          <p className="kicker text-brand">For fractional executives</p>
          <h1 className="mt-3 max-w-[22ch] font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            You pitch one person. Someone else decides.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
            A fractional CMO, CFO or COO almost never sells to the person who
            signs. You talk to a founder or an operator, they forward your
            proposal to a co-founder, a partner or the board, and the
            conversation that decides it happens in a room you are not in.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/login" search={{ mode: 'signup' }}>
                Start free
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/demo">Try it on yourself</Link>
            </Button>
          </div>
        </PageContainer>

        <section className="border-y border-line bg-surface">
          <PageContainer className="py-14 sm:py-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
              <div>
                <h2 className="max-w-[22ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                  The forward is the whole signal.
                </h2>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
                  Closewatch&rsquo;s proposal tracking gives every recipient
                  their own link. That is the entire mechanism, and for this
                  kind of sale it is worth more than any other number on the
                  page: when the link you sent to one founder is opened by two
                  more readers, your proposal is being circulated to people with
                  authority.
                </p>
                <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
                  A forward is also the one thing you would never learn
                  otherwise. A founder rarely writes back to say &ldquo;I have
                  sent this to my co-founder.&rdquo; They go quiet while it
                  happens, and quiet is exactly what a lost deal feels like too.
                </p>
              </div>

              <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
                {SIGNALS.map((s) => (
                  <div key={s.k} className="bg-surface px-4 py-5">
                    <dt className="kicker">{s.k}</dt>
                    <dd className="mt-2 text-[13px] leading-relaxed text-ink-2">
                      {s.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </PageContainer>
        </section>

        <section>
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Why the timing changes</p>
            <h2 className="mt-3 max-w-[30ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              The follow-up you send after a forward is a different email.
            </h2>

            <div className="mt-6 flex max-w-[64ch] flex-col gap-4">
              <p className="text-[15px] leading-relaxed text-ink-2">
                Without proposal tracking you write the same message every time,
                a week later, hedged: checking in, no pressure, let me know. It
                is addressed to somebody who may not have read it, may have
                loved it, or may have sent it upstairs three days ago. It cannot
                be good, because it is written for all three at once.
              </p>
              <p className="text-[15px] leading-relaxed text-ink-2">
                When you can see it was forwarded and that the second reader
                spent real time on scope and rate, you write to the person you
                actually have: someone selling you internally. The useful email
                is not &ldquo;just following up&rdquo; but the one that arms
                them &mdash; the case study that answers the objection you know
                a CFO will raise, offered before they have to ask for it.
              </p>
              <p className="text-[15px] leading-relaxed text-ink-2">
                And when nothing was forwarded at all, that is information too.
                It usually means the person you pitched is not the person who
                decides, and the next conversation is about getting into the
                room rather than about your rate.
              </p>
            </div>
          </PageContainer>
        </section>

        <LongFormSections markdown={DETAILS} className="border-t border-line" />

        <section className="border-y border-line bg-surface">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Questions</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              What fractional operators ask about proposal tracking.
            </h2>

            <QuestionList items={QUESTIONS} />
          </PageContainer>
        </section>

        <section>
          <PageContainer className="py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-[24ch] font-display text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
              Find out where your next proposal actually went.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
              Two proposals can be live at once on the free plan, with all the
              tracking switched on. Send the next one as a link and see whether
              it travels.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link to="/login" search={{ mode: 'signup' }}>
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
