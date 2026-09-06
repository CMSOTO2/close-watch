import { createFileRoute } from '@tanstack/react-router'
import { ComparisonPage } from '#/components/compare/comparison-page'
import { COMPETITORS } from '#/components/compare/competitors'
import {
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'

const c = COMPETITORS.docsend
const PATH = '/vs/docsend'

export const Route = createFileRoute('/vs/docsend')({
  head: () => ({
    meta: [
      { title: c.title },
      { name: 'description', content: c.description },
      ...socialMeta({
        title: c.socialTitle,
        description: c.wedge,
        path: PATH,
      }),
    ],
    links: canonical(PATH),
    scripts: jsonLdScript(
      breadcrumbJsonLd([
        { name: 'Closewatch', path: '/' },
        { name: `Closewatch vs ${c.name}`, path: PATH },
      ]),
    ),
  }),
  component: () => <ComparisonPage c={c} />,
})
