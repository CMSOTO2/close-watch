import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '#/components/landing/landing-page'
import { landingMeta } from '#/components/landing/landing-meta'
import {
  canonical,
  jsonLdScript,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from '#/lib/seo'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: landingMeta(),
    links: canonical('/'),
    scripts: [
      ...jsonLdScript(productJsonLd()),
      ...jsonLdScript(organizationJsonLd()),
      ...jsonLdScript(websiteJsonLd()),
    ],
  }),
  component: LandingPage,
})
