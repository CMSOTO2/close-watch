import type { Competitor } from '#/components/compare/competitors'
import {
  breadcrumbJsonLd,
  canonical,
  jsonLdScript,
  socialMeta,
} from '#/lib/seo'

// Apart from comparison-page.tsx so the routes' head() does not pull the page
// template into the entry chunk. See landing-meta.ts for the rule.

/** The head for a /vs/… route. Shared so the three routes cannot drift. */
export function comparisonHead(c: Competitor) {
  const path = `/vs/${c.slug}`
  return {
    meta: [
      { title: c.title },
      { name: 'description', content: c.description },
      ...socialMeta({
        title: c.socialTitle,
        description: c.wedge,
        path,
      }),
    ],
    links: canonical(path),
    scripts: jsonLdScript(
      breadcrumbJsonLd([
        { name: 'Closewatch', path: '/' },
        { name: `Closewatch vs ${c.name}`, path },
      ]),
    ),
  }
}
