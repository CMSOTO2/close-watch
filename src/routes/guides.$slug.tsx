import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { GuideMarkdown } from '#/components/guides/guide-markdown'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
import { Button } from '#/components/ui/button'
import { getGuide } from '#/content/guides'
import {
  articleJsonLd,
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'

export const Route = createFileRoute('/guides/$slug')({
  loader: ({ params }) => {
    const guide = getGuide(params.slug)
    if (!guide) throw notFound()
    return guide
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const path = `/guides/${loaderData.slug}`
    return {
      meta: [
        { title: `${loaderData.title} | Closewatch` },
        { name: 'description', content: loaderData.description },
        ...socialMeta({
          title: loaderData.title,
          description: loaderData.dek,
          path,
        }),
      ],
      links: canonical(path),
      scripts: [
        ...jsonLdScript(
          breadcrumbJsonLd([
            { name: 'Closewatch', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: loaderData.title, path },
          ]),
        ),
        ...jsonLdScript(
          articleJsonLd({
            title: loaderData.title,
            description: loaderData.description,
            path,
            datePublished: loaderData.datePublished,
            dateModified: loaderData.dateModified,
          }),
        ),
      ],
    }
  },
  component: GuidePage,
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-center">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight">
          That guide doesn&rsquo;t exist
        </h1>
        <p className="mt-2 text-[13px] text-ink-2">
          <Link to="/guides" className="text-brand hover:underline">
            See every guide
          </Link>
        </p>
      </div>
    </div>
  ),
})

function GuidePage() {
  const guide = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        <PageContainer asMain className="py-14 sm:py-16">
          {/* A blog post reads best as its own centered column, not left-aligned
              under the wide marketing container every other public page uses:
              680px keeps lines around 65-75 characters regardless of viewport,
              so the eye tracks back to the start of the next line without
              losing it. */}
          <div className="mx-auto max-w-[680px]">
            <Link
              to="/guides"
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Guides
            </Link>

            <article className="mt-6">
              <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-[34px]">
                {guide.title}
              </h1>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
                {guide.dek}
              </p>
              <p className="kicker mt-4">
                Published {guide.datePublished}
                {guide.dateModified !== guide.datePublished &&
                  ` · Updated ${guide.dateModified}`}
              </p>

              <div className="mt-2">
                <GuideMarkdown>{guide.body}</GuideMarkdown>
              </div>
            </article>

            <div className="mt-14 border-t border-line pt-8">
              <p className="font-display text-lg font-semibold tracking-[-0.015em]">
                Put a real proposal through Closewatch.
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                Two proposals can be live and read at once on the free plan, all
                the tracking switched on. $19 a month for unlimited, with
                follow-up alerts.
              </p>
              <Button asChild size="lg" className="mt-5">
                <Link to="/login">
                  Start free
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </PageContainer>
      </main>

      <SiteFooter />
    </div>
  )
}
