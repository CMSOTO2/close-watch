import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ContentPage, prose } from '#/components/content-page'
import { ArticleBody } from '#/components/guides/guide-markdown'
import { Button } from '#/components/ui/button'
import { GUIDES, STAGES } from '#/content/guides'
import { pillar } from '#/content/proposal-tracking'
import {
  AUTHOR_LINK,
  AUTHOR_META,
  articleJsonLd,
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'
import { cn } from '#/lib/utils'

const PATH = '/proposal-tracking'

export const Route = createFileRoute('/proposal-tracking')({
  head: () => ({
    meta: [
      { title: `${pillar.metaTitle ?? pillar.title} | Closewatch` },
      { name: 'description', content: pillar.description },
      AUTHOR_META,
      ...socialMeta({
        title: pillar.title,
        description: pillar.dek,
        path: PATH,
      }),
    ],
    links: [...canonical(PATH), AUTHOR_LINK],
    scripts: [
      ...jsonLdScript(
        breadcrumbJsonLd([
          { name: 'Closewatch', path: '/' },
          { name: 'Proposal tracking', path: PATH },
        ]),
      ),
      ...jsonLdScript(
        articleJsonLd({
          title: pillar.title,
          description: pillar.description,
          path: PATH,
          datePublished: pillar.datePublished,
          dateModified: pillar.dateModified,
        }),
      ),
    ],
  }),
  component: ProposalTracking,
})

/**
 * The category page. It reads like a guide, because an assistant quotes a
 * reference and skips an advert, and it is the one page that links down to
 * every guide: the list under the body is built from GUIDES and STAGES, so a
 * new guide appears here without anyone remembering to add it.
 */
function ProposalTracking() {
  return (
    <ContentPage
      readingProgress
      kicker="Proposal tracking"
      title={pillar.title}
      dek={pillar.dek}
      meta={
        <>
          By{' '}
          <Link to="/about" className="transition-colors hover:text-ink">
            Carlos Soto
          </Link>{' '}
          · Updated {pillar.dateModified}
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
            <Link to="/login" search={{ mode: 'signup' }}>
              Start free
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        </div>
      }
    >
      <ArticleBody body={pillar.body} />

      <section aria-labelledby="every-guide">
        <h2 id="every-guide" className={prose.h2}>
          Every guide, in the order the questions come up
        </h2>
        {STAGES.map((stage) => {
          const guides = GUIDES.filter((g) => g.stage === stage.key)
          if (guides.length === 0) return null
          return (
            <div key={stage.key}>
              <h3 className={prose.h3}>{stage.label}</h3>
              <ul className={cn('mt-3', prose.ul)}>
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link
                      to="/guides/$slug"
                      params={{ slug: g.slug }}
                      className={prose.a}
                    >
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </ContentPage>
  )
}
