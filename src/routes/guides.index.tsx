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
  'Straight answers on proposal tracking: how to tell if a client read your proposal, and how it differs from email open tracking.'

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
            otherwise ask an assistant, and says plainly where the honest
            answer isn&rsquo;t Closewatch.
          </p>

          <ol className="mt-10 flex max-w-3xl flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
            {GUIDES.map((g) => (
              <li key={g.slug} className="bg-surface">
                <Link
                  to="/guides/$slug"
                  params={{ slug: g.slug }}
                  className="group flex items-start justify-between gap-4 px-5 py-6 transition-colors hover:bg-surface-2"
                >
                  <div>
                    <p className="font-display text-lg font-semibold tracking-[-0.015em] text-ink group-hover:text-brand">
                      {g.title}
                    </p>
                    <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
                      {g.dek}
                    </p>
                  </div>
                  <ArrowRight
                    aria-hidden
                    className="mt-1 size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </PageContainer>
      </main>

      <SiteFooter />
    </div>
  )
}
