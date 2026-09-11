import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ContentPage } from '#/components/content-page'
import { GuideMarkdown } from '#/components/guides/guide-markdown'
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
    <ContentPage
      back={{ to: '/guides', label: 'Guides' }}
      title={guide.title}
      dek={guide.dek}
      meta={
        <>
          {/* The same person the Article markup names as author (FOUNDER in
              lib/seo.ts). Linked to /about, which is where he is introduced. */}
          By{' '}
          <Link to="/about" className="transition-colors hover:text-ink">
            Carlos Soto
          </Link>{' '}
          · Published {guide.datePublished}
          {guide.dateModified !== guide.datePublished &&
            ` · Updated ${guide.dateModified}`}
        </>
      }
      after={
        <div className="mt-14 border-t border-line pt-8">
          <p className="font-display text-lg font-semibold tracking-[-0.015em]">
            Put a real proposal through Closewatch.
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
            Two proposals can be live and read at once on the free plan, all the
            tracking switched on. $19 a month for unlimited, with follow-up
            alerts.
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link to="/login">
              Start free
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </div>
      }
    >
      <GuideMarkdown>{guide.body}</GuideMarkdown>
    </ContentPage>
  )
}
