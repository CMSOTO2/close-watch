import { createFileRoute } from '@tanstack/react-router'
import { LandingPage, landingMeta } from '#/components/landing/landing-page'
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
