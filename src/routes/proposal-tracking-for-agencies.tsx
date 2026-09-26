import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
import { LongFormSections, QuestionList } from '#/components/long-form'
import { ProductShot } from '#/components/product-shot'
import { Button } from '#/components/ui/button'
import {
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'

const PATH = '/proposal-tracking-for-agencies'

const TITLE = 'Proposal Tracking for Agencies | Closewatch'
const DESCRIPTION =
  'Proposal tracking for agencies running several clients at once. See which proposals are being read, how long they spent on pricing, and who they reached.'

/**
 * The audience page for the query it is named after.
 *
 * Not a second copy of the home page with the word "agency" sprinkled through
 * it. Near-duplicate pages compete with each other and Google picks the winner,
 * so this one earns its URL by covering what the home page deliberately does
 * not: the shape of a pipeline with several clients in it, and the three
 * specific places an agency proposal dies. If it ever collapses back into a
 * paraphrase of the home page, delete it rather than keep both.
 *
 * It is also one of the five pages the 2026-09-11 search report found cut off
 * from the guide library (docs/geo:aeo/search-report-2026-09-11.md), so the
 * long-form half links into the guides in prose, with each guide's own phrase
 * as the anchor, and the guides link back here as "proposal tracking for
 * agencies".
 */
export const Route = createFileRoute('/proposal-tracking-for-agencies')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      ...socialMeta({
        title: 'Proposal tracking for agencies',
        description:
          'Nine deals across six clients, each with a different person reading. See which ones are alive, and which client to call today.',
        path: PATH,
      }),
    ],
    links: canonical(PATH),
    scripts: jsonLdScript(
      breadcrumbJsonLd([
        { name: 'Closewatch', path: '/' },
        { name: 'Proposal tracking for agencies', path: PATH },
      ]),
    ),
  }),
  component: AgenciesPage,
})

const DEATHS = [
  {
    n: '01',
    title: 'It never reached the decision maker',
    body: 'You sent it to your day-to-day contact because that is who you talk to. They meant to pass it on. Nothing about the silence tells you which of those two things went wrong, and the fix for each is completely different.',
    signal: 'Tracking shows it as one reader, weeks after sending.',
    guide: {
      href: '/guides/get-proposal-to-decision-maker',
      label: 'Getting it to the decision maker',
    },
  },
  {
    n: '02',
    title: 'The number landed badly',
    body: 'They opened it, went to pricing, and stopped. A proposal that dies on the pricing page is a scoping conversation you can still have. A proposal that dies on page one is not the same problem and does not want the same email.',
    signal: 'Tracking shows a short visit that ends on the pricing page.',
    guide: {
      href: '/guides/time-spent-on-proposal-pricing-page',
      label: 'What time on pricing means',
    },
  },
  {
    n: '03',
    title: 'It got read, and then buried',
    body: 'Three opens in the first two days, then nothing for a fortnight. That is not a lost deal, it is a stalled one, and it is the single easiest kind to recover if you notice while it is still warm.',
    signal: 'Tracking shows real reading, then a long gap.',
    guide: {
      href: '/guides/client-not-responding-to-proposal',
      label: 'When a client stops responding',
    },
  },
]

const QUESTIONS = [
  {
    q: 'We run nine deals across six clients. Does it stay legible?',
    a: 'File proposals in folders, by client or by service, and look at one folder at a time. Search runs across all of them, the list can be filtered by heat, and closing a deal moves it out of the pipeline without losing anything it recorded.',
  },
  {
    q: 'Different people at the client read it. Can we tell them apart?',
    a: 'You send one link per person. That is the whole mechanism: when the link you sent to the marketing lead is opened by a second and third reader, it went upstairs, and that is the clearest sign from outside the room that your proposal is being circulated to somebody who can approve it.',
  },
  {
    q: 'Do we have to change how we make proposals?',
    a: 'No, and that is the point. Your proposal keeps coming out of InDesign, Figma, Docs or Canva as a PDF with your typography and your case studies in it. Closewatch takes that file. There is no editor, no template library and nothing to migrate.',
  },
  {
    q: 'What about the rest of the team?',
    a: 'Today one account holds the pipeline, which fits an agency where one or two people send every proposal. Shared seats are still to come, so if three people need their own logins right now, this is not the tool for you yet.',
  },
  {
    q: 'How much does proposal tracking cost for an agency?',
    a: 'Closewatch is $19 a month flat for unlimited proposals, and free for two proposals being read at a time. Most document trackers are priced per user; DocSend Standard, for example, is $45 per user a month. For an agency where one or two people send every proposal, a flat price is usually the cheaper shape.',
  },
  {
    q: 'Will our clients know the proposal is tracked?',
    a: 'Only if you tell them. The Closewatch viewer shows your proposal and nothing else, so it is your call, and one sentence in the covering email does it. Being told up front costs a client nothing. Finding out later costs you their trust.',
  },
  {
    q: 'Does it work with proposals over 20 pages, or with photography?',
    a: 'Yes. Closewatch takes PDFs up to 25 MB, which is the same limit Gmail puts on an attachment, and shows them as designed. A long proposal is scored fairly: reading depth is measured per page, with the divisor capped at 12 pages, so a 40-page proposal is not punished against a 6-page one.',
  },
]

/**
 * The long-form half: how the tracking works for an agency, one link per
 * person, what to do with the data, and the honest limits. Markdown, so it can
 * link into the guides in a sentence and carry screenshots the same way they
 * do.
 */
const DETAILS = `## How proposal tracking works for an agency

Closewatch tracks the proposal PDF your studio already makes. Upload it, type the name of the person it is going to, and Closewatch gives you a link to paste into your own email. Nothing about how you design proposals changes, and the client needs no account to open it.

![The Closewatch new-proposal form, with a title, a client name, the person it is going to, a deal value and the proposal PDF](/images/closewatch-upload-proposal-pdf.webp "Setting up a proposal takes a title, a client and the PDF. Sample data.")

When the client opens the link, Closewatch records the visit: which pages they read, how long they spent on each, whether they reached pricing, and whether they came back on a later day. A visit only counts after three seconds of visible attention. An agency pitching into companies with strict email security will not mistake a gateway's scan for a client reading. [Proposal tracking vs email open tracking](/guides/proposal-tracking-vs-email-open-tracking) explains why an open pixel on the covering email cannot make that distinction.

## One tracked link per person at the client

Agency proposals are rarely read by one person. The marketing lead reads it first, then the founder, then someone in finance. Closewatch lets you create as many links on a proposal as you like, each named for the person it is for, so you can see who has opened theirs and who has not.

![Closewatch recent visits on a sample proposal, with two readers it was forwarded to, and the named share links and page tags below](/images/closewatch-forwarded-proposal-new-readers.webp "Named links per recipient, and the forwarded readers each one produced. Sample data.")

When a link is opened by a browser that has never opened it before, Closewatch marks a new reader. For an agency, that is usually the moment a proposal goes upstairs, and the moment to offer a call with whoever is now reading it. [How to tell if a client forwarded your proposal](/guides/did-my-client-forward-my-proposal) covers how to tell a forward from your contact on their phone.

## What an agency does with the reading data

Proposal tracking is only useful if it changes what you do on Monday. Three patterns come up most often:

- **Read closely, then quiet for a week.** A decision is in progress. Follow up with a question about the decision, not the document. [How to follow up on a proposal](/guides/how-to-follow-up-on-a-proposal) has the whole sequence.
- **A long stay on pricing, then nothing.** The number is being tested against a budget. Offer a phased start or different terms before a discount.
- **Never opened.** Resend with a new subject line rather than chase. It was probably buried or filtered.

## What proposal tracking will not do for an agency

Closewatch has one login per account today. If three account leads each need their own seat and pipeline, it is not the right tool yet. It has no CRM integration, no e-signature and no proposal editor, and it only tracks PDFs. If you need those in one place, [the best proposal tracking software](/guides/best-proposal-tracking-software) compares the builders that have them, with prices.

It also cannot tell you why a client went quiet. It tells you what they did with the proposal, which narrows the reasons down to a likely few. For what [proposal tracking](/proposal-tracking) can and cannot tell you in general, the category page starts with its limits.

Before you upload anything, [the demo](/demo) shows the report on a sample agency proposal, produced by your own reading of it.`

function AgenciesPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        <PageContainer className="pt-12 pb-14 sm:pt-16">
          <p className="kicker">For agencies</p>
          <h1 className="mt-3 max-w-[18ch] font-display text-3xl sm:text-4xl">
            Proposal tracking for agencies.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
            A freelancer with one proposal out can hold it in their head. An
            agency with nine live across six clients, each read by a different
            person for different reasons, cannot &mdash; and the deal that
            quietly dies is rarely the one you were worried about. Closewatch is
            proposal tracking built around that pipeline.
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
            <h2 className="max-w-[26ch] font-display text-2xl sm:text-3xl">
              Three places an agency proposal goes quiet.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
              Without proposal tracking they look identical from your side. All
              three produce the same week of nothing, and the follow-up that
              would rescue each one is different.
            </p>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
              {DEATHS.map((d) => (
                <li key={d.n} className="flex flex-col bg-surface px-5 py-6">
                  <p className="kicker text-brand">{d.n}</p>
                  <p className="mt-3 font-semibold text-base">{d.title}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                    {d.body}
                  </p>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink">
                    {d.signal}
                  </p>
                  <a
                    href={d.guide.href}
                    className="mt-3 text-[13px] font-medium text-brand underline decoration-1 underline-offset-[3px] hover:text-ink"
                  >
                    {d.guide.label}
                  </a>
                </li>
              ))}
            </ol>
          </PageContainer>
        </section>

        <section>
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker">Running a book of clients</p>
            <h2 className="mt-3 max-w-[28ch] font-display text-2xl sm:text-3xl">
              What changes when it is nine proposals and not one.
            </h2>

            <div className="mt-6 flex max-w-[64ch] flex-col gap-4">
              <p className="text-[15px] leading-relaxed text-ink-2">
                Most tracking tools are built around a document. You open the
                document, you look at its numbers, you close it again. That
                works when there is one. At agency volume it turns into a chore
                nobody does on a Friday, and a chore nobody does is a tool that
                quietly stops being used.
              </p>
              <p className="text-[15px] leading-relaxed text-ink-2">
                Closewatch is built around the pipeline instead. Proposals sit
                in folders you choose, the list orders itself by intent rather
                than by date, and a &ldquo;since you last looked&rdquo; diff
                tells you what moved while you were doing the actual work. The
                question it answers is not &ldquo;how is this proposal
                doing&rdquo; but &ldquo;who should I call today&rdquo;, which is
                the only version of the question anyone has time for.
              </p>
            </div>

            <ProductShot
              src="/images/closewatch-proposal-dashboard-ranked-by-intent.webp"
              alt="The Closewatch dashboard for a sample agency: five open proposals across five clients, ranked hot, warm and cold, each with the signal behind it"
              className="mt-10 max-w-4xl"
            />

            <dl className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
              {[
                {
                  k: 'Folders',
                  v: 'File proposals by client or by service, then look at one folder at a time instead of nine loose files.',
                },
                {
                  k: 'Since you last looked',
                  v: 'What changed since your last visit, called out on arrival. You are not asked to remember Tuesday.',
                },
                {
                  k: 'Won and lost, kept',
                  v: 'Close a deal and it leaves the pipeline with its whole reading history intact. What a loss was read for is worth knowing.',
                },
              ].map((f) => (
                <div key={f.k} className="bg-surface px-4 py-5">
                  <dt className="kicker">{f.k}</dt>
                  <dd className="mt-2 text-[13px] leading-relaxed text-ink-2">
                    {f.v}
                  </dd>
                </div>
              ))}
            </dl>
          </PageContainer>
        </section>

        <LongFormSections markdown={DETAILS} className="border-t border-line" />

        <section className="border-y border-line bg-surface">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker">Questions agencies ask</p>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl">
              Proposal tracking for agencies, the questions that come up.
            </h2>

            <QuestionList items={QUESTIONS} />
          </PageContainer>
        </section>

        <section>
          <PageContainer className="py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-[22ch] font-display text-2xl sm:text-3xl">
              Put your next proposal through it.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
              Two proposals can be live at once on the free plan with all the
              tracking switched on. One real send is enough to find out whether
              this changes how your week runs.
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
