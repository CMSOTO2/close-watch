import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
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
  },
  {
    n: '02',
    title: 'The number landed badly',
    body: 'They opened it, went to pricing, and stopped. A proposal that dies on the pricing page is a scoping conversation you can still have. A proposal that dies on page one is not the same problem and does not want the same email.',
  },
  {
    n: '03',
    title: 'It got read, and then buried',
    body: 'Three opens in the first two days, then nothing for a fortnight. That is not a lost deal, it is a stalled one, and it is the single easiest kind to recover if you notice while it is still warm.',
  },
]

const QUESTIONS = [
  {
    q: 'We run nine deals across six clients. Does it stay legible?',
    a: 'Proposals group under the client they belong to, so the dashboard reads as accounts rather than a folder of files. Search runs across all of them, the list can be filtered by heat, and closing a deal moves it out of the pipeline without losing anything it recorded.',
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
]

function AgenciesPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        <PageContainer className="pt-12 pb-14 sm:pt-16">
          <p className="kicker text-brand">For agencies</p>
          <h1 className="mt-3 max-w-[18ch] font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Proposal tracking for agencies.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
            A freelancer with one proposal out can hold it in their head. An
            agency with nine live across six clients, each read by a different
            person for different reasons, cannot &mdash; and the deal that
            quietly dies is rarely the one you were worried about.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/login">
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
            <h2 className="max-w-[26ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Three places an agency proposal goes quiet.
            </h2>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-relaxed text-ink-2">
              They look identical from your side. All three produce the same
              week of nothing, and the follow-up that would rescue each one is
              different.
            </p>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
              {DEATHS.map((d) => (
                <li key={d.n} className="bg-surface px-5 py-6">
                  <p className="font-mono text-[11px] tracking-wider text-brand">
                    {d.n}
                  </p>
                  <p className="mt-3 font-display text-base font-semibold tracking-tight">
                    {d.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                    {d.body}
                  </p>
                </li>
              ))}
            </ol>
          </PageContainer>
        </section>

        <section>
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Running a book of clients</p>
            <h2 className="mt-3 max-w-[28ch] font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
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
                Closewatch is built around the pipeline instead. Everything
                rolls up under the client, the list orders itself by intent
                rather than by date, and a &ldquo;since you last looked&rdquo;
                diff tells you what moved while you were doing the actual work.
                The question it answers is not &ldquo;how is this proposal
                doing&rdquo; but &ldquo;who should I call today&rdquo;, which is
                the only version of the question anyone has time for.
              </p>
            </div>

            <dl className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
              {[
                {
                  k: 'Grouped by client',
                  v: 'Six accounts rather than nine files, so a client with three proposals in flight reads as one relationship.',
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

        <section className="border-y border-line bg-surface">
          <PageContainer className="py-16 sm:py-20">
            <p className="kicker text-brand">Questions agencies ask</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              The four that come up every time.
            </h2>

            <div className="mt-8 max-w-3xl border-t border-line">
              {QUESTIONS.map(({ q, a }) => (
                <div key={q} className="border-b border-line py-5">
                  <h3 className="text-[15px] font-medium tracking-[-0.008em]">
                    {q}
                  </h3>
                  <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </PageContainer>
        </section>

        <section>
          <PageContainer className="py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-[22ch] font-display text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
              Put your next proposal through it.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
              Two proposals can be live at once on the free plan with every
              feature switched on. One real send is enough to find out whether
              this changes how your week runs.
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
