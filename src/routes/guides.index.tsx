import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
import { GUIDES, STAGES } from '#/content/guides'
import {
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'

const PATH = '/guides'
const TITLE = 'Guides | Closewatch'
const DESCRIPTION =
  'Straight answers on what happens after you send a proposal: whether it was read or forwarded, how long to wait, what silence means, and how to follow up.'

export const Route = createFileRoute('/guides/')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      ...socialMeta({ title: TITLE, description: DESCRIPTION, path: PATH }),
    ],
    links: canonical(PATH),
    scripts: jsonLdScript(
      breadcrumbJsonLd([
        { name: 'Closewatch', path: '/' },
        { name: 'Guides', path: PATH },
      ]),
    ),
  }),
  component: GuidesIndex,
})

function GuidesIndex() {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        <PageContainer asMain className="py-14 sm:py-16">
          <p className="kicker text-brand">Guides</p>
          <h1 className="mt-3 max-w-[22ch] font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            What happens after you send a proposal.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
            Straight answers for the days between sending a proposal and hearing
            back, in the order the questions come up. No pitch, no padding, and
            each says plainly where the honest answer isn&rsquo;t Closewatch.
          </p>

          {/* Grouped by stage in the life of a sent proposal, in order, rather
              than one list. The guides are chosen to cover that sequence (see
              STAGES), and showing it makes the set read as one connected
              subject, to a person and to a crawler, instead of a pile of
              posts. A stage with no guides yet is skipped.

              Within a stage, tiles rather than rows: a grid fills the width
              and grows by rows of three. "Read the guide" is pushed to the
              bottom of each tile (mt-auto) so a row with one long title and
              one short one still lines up. Hover text is brand on surface-2,
              4.7:1 in light, 7.8:1 in dark. */}
          <div className="mt-12 flex flex-col gap-12">
            {STAGES.map((stage) => {
              const guides = GUIDES.filter((g) => g.stage === stage.key)
              if (guides.length === 0) return null
              return (
                <section key={stage.key} aria-labelledby={`stage-${stage.key}`}>
                  <h2
                    id={`stage-${stage.key}`}
                    className="font-display text-xl font-semibold tracking-[-0.02em]"
                  >
                    {stage.label}
                  </h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                    {stage.blurb}
                  </p>
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {guides.map((g) => (
                      <li key={g.slug} className="flex">
                        <Link
                          to="/guides/$slug"
                          params={{ slug: g.slug }}
                          className="group flex w-full flex-col rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <h3 className="font-display text-[17px] leading-snug font-semibold tracking-[-0.015em] text-ink group-hover:text-brand">
                            {g.title}
                          </h3>
                          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                            {g.dek}
                          </p>
                          <span className="mt-auto flex items-center gap-1.5 pt-5 text-[13px] font-medium text-ink-2 group-hover:text-brand">
                            Read the guide
                            <ArrowRight
                              aria-hidden
                              className="size-3.5 transition-transform group-hover:translate-x-0.5"
                            />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        </PageContainer>
      </main>

      <SiteFooter />
    </div>
  )
}
