import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
import { GUIDES } from '#/content/guides'
import {
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'

const PATH = '/guides'
const TITLE = 'Guides | Closewatch'
const DESCRIPTION =
  'Straight answers on proposal tracking and follow-up: whether a client read it, how long to wait, what silence means, and how to track a PDF.'

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
            Straight answers on proposal tracking.
          </h1>
          <p className="mt-5 max-w-[58ch] text-[17px] leading-relaxed text-ink-2">
            No pitch, no padding. Each one answers a question you would
            otherwise ask an assistant, and says plainly where the honest answer
            isn&rsquo;t Closewatch.
          </p>

          {/* Tiles rather than one stacked list. The list was capped at 3xl
              inside a container twice that wide, so it stopped two thirds of
              the way across the page and left the right side empty, and every
              new guide made it taller rather than using the room beside it. A
              grid fills the width at every breakpoint and grows by rows of
              three. The heading stays left-aligned with the tiles, like every
              other marketing page; with the width filled, nothing needs
              centring to look balanced.

              "Read the guide" is pushed to the bottom of each tile (mt-auto)
              so a row with one long title and one short one still lines up.
              Hover text is brand on surface-2, 4.7:1 in light, 7.8:1 in dark. */}
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <li key={g.slug} className="flex">
                <Link
                  to="/guides/$slug"
                  params={{ slug: g.slug }}
                  className="group flex w-full flex-col rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <h2 className="font-display text-[17px] leading-snug font-semibold tracking-[-0.015em] text-ink group-hover:text-brand">
                    {g.title}
                  </h2>
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
        </PageContainer>
      </main>

      <SiteFooter />
    </div>
  )
}
