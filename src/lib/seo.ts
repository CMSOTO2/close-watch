import { publicEnv } from '#/env'

const origin = publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')

/**
 * Self-referencing canonical for a public page.
 *
 * Every indexable page gets one. Without it the same page reachable with a
 * tracking parameter, a trailing slash, or on a preview domain reads as several
 * pages competing with each other, and the one that wins is not ours to pick.
 * /r/:source is the exception that proves it: those point at / rather than at
 * themselves, because they are the landing page under another name.
 */
export function canonical(path: string) {
  return [{ rel: 'canonical', href: `${origin}${path}` }]
}

/**
 * Structured data for the product itself.
 *
 * Deliberately not a FAQPage. Google stopped showing FAQ rich results for
 * ordinary sites in 2023, and the markup would need a plain-text copy of every
 * answer in faq.tsx, which is a second version of the same words waiting to
 * drift from the first.
 *
 * No aggregateRating either. There are no reviews, and inventing them is both
 * a manual-action risk and a lie.
 */
export function productJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Closewatch',
    url: `${origin}/`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description:
      'Turn the proposal PDF you already send into a tracked link. See who opened it, how long they spent on pricing, and whether it was forwarded to the person who signs.',
    image: `${origin}/og.png`,
    publisher: {
      '@type': 'Organization',
      name: 'Closewatch',
      url: `${origin}/`,
      logo: `${origin}/android-chrome-512x512.png`,
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description: 'Every feature, two proposals live with clients at a time.',
      },
      {
        '@type': 'Offer',
        name: 'Solo',
        price: '19',
        priceCurrency: 'USD',
        description: 'Unlimited live proposals, billed monthly.',
      },
    ],
  }
}

/** The JSON-LD block as a head script. */
export function jsonLdScript(data: unknown) {
  return [
    {
      type: 'application/ld+json',
      children: JSON.stringify(data),
    },
  ]
}
