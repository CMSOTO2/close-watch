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
 * The card every scraper shows. Regenerate with scripts/generate-og-image.py.
 *
 * The version is a cache-buster, and bumping it is part of changing the card:
 * scrapers key their copy on the URL, so a redesign at the same path can sit
 * unseen behind the old one for weeks. v3 is the agency card.
 */
export const OG_IMAGE = `${origin}/og.png?v=3`

/** Describes the card itself, so it has to match what the PNG actually shows. */
const OG_ALT =
  'Closewatch: proposal tracking for agencies. An $18,000 proposal scored hot at 86 out of 100, shared with 2 other people, 2m 14s on pricing, opened 4 times.'

/**
 * The Open Graph and Twitter block for a public page.
 *
 * Shared rather than written per route because a card is a dozen tags and the
 * pages that carry one only ever differ in three of them. Threads and LinkedIn
 * read og:* alone; X reads og:* where a twitter:* is missing, and the pair is
 * written out anyway because X is the network a link is most likely to be
 * pasted into and the fallback is not worth relying on.
 *
 * The social title is not the title tag. A search result answers "proposal
 * tracking software for agencies"; a card in a feed has to stop a scroll, and
 * nobody scrolls looking for a category.
 */
export function socialMeta({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}) {
  return [
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Closewatch' },
    { property: 'og:url', content: `${origin}${path}` },
    { property: 'og:image', content: OG_IMAGE },
    // Meta's scraper reads secure_url and type where they exist. Not required,
    // and cheap enough not to argue with.
    { property: 'og:image:secure_url', content: OG_IMAGE },
    { property: 'og:image:type', content: 'image/png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: OG_ALT },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: OG_IMAGE },
    { name: 'twitter:image:alt', content: OG_ALT },
  ]
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
 *
 * `audience` is the one place the target customer is stated outright. It earns
 * no rich result, but it is the machine-readable version of who the page is
 * written for, and it costs one field to keep it in step with the copy.
 */
export function productJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Closewatch',
    alternateName: 'Closewatch proposal tracking',
    url: `${origin}/`,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Proposal tracking software',
    operatingSystem: 'Web',
    description:
      'Proposal tracking software for agencies. Turn the proposal PDF you already send into a tracked link and see who opened it, how long they spent on pricing, and whether it reached the person who signs.',
    image: `${origin}/og.png`,
    audience: {
      '@type': 'BusinessAudience',
      audienceType:
        'Marketing, web and creative agencies, consultancies and fractional executives',
    },
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
