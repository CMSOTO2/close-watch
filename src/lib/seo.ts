import { publicEnv } from '#/env'

const origin = publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')

/**
 * The person behind Closewatch, named on /about since 2026-09-11.
 *
 * Named because a one-person product that will not say which person reads as
 * hiding to the consultants it sells to, and because "Closewatch" alone is
 * claimed by a farm-camera company and a police tip app: a real founder tied to
 * "Closewatch proposal tracking" gives search engines and assistants a second
 * thread to the right entity. `sameAs` is what makes that thread checkable:
 * "Carlos Soto" is a common name, and the LinkedIn profile (which links back
 * to getclosewatch.com from its Featured section) says which one. /about links
 * the same profile, so the markup and the visible page agree.
 */
export const FOUNDER_LINKEDIN = 'https://www.linkedin.com/in/carlos-m-soto/'

const FOUNDER = {
  '@type': 'Person',
  name: 'Carlos Soto',
  url: `${origin}/about`,
  sameAs: [FOUNDER_LINKEDIN],
}

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
      founder: FOUNDER,
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        description:
          'All tracking and a first-open email. Send as many as you like; two being read at a time.',
      },
      {
        '@type': 'Offer',
        name: 'Solo',
        price: '19',
        priceCurrency: 'USD',
        description:
          'Unlimited live proposals, plus emails when a client comes back, a new reader opens it, or it turns hot. Billed monthly.',
      },
    ],
  }
}

/**
 * Breadcrumbs for a page inside a cluster.
 *
 * The one piece of structured data on these pages, and the only one here that
 * still earns a visible result: Google renders the trail in place of the raw
 * URL. Everything else a comparison page could claim in JSON-LD is either a
 * rich result Google retired or a review nobody wrote.
 */
export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: `${origin}${step.path}`,
    })),
  }
}

/**
 * Structured data for a guide.
 *
 * `author` is the founder, matching the visible byline on every guide. It was
 * the Closewatch organization while the founder went unnamed; the two have to
 * agree with each other and with /about, or the markup describes a page that
 * does not exist.
 */
export function articleJsonLd({
  title,
  description,
  path,
  datePublished,
  dateModified,
}: {
  title: string
  description: string
  path: string
  datePublished: string
  dateModified: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${origin}${path}`,
    mainEntityOfPage: `${origin}${path}`,
    image: `${origin}/og.png`,
    datePublished,
    dateModified,
    author: FOUNDER,
    publisher: {
      '@type': 'Organization',
      name: 'Closewatch',
      url: `${origin}/`,
      logo: `${origin}/android-chrome-512x512.png`,
      founder: FOUNDER,
    },
  }
}

/** The Product Hunt listing: the one company profile that exists besides this site. */
export const PRODUCT_HUNT = 'https://www.producthunt.com/products/closewatch'

/**
 * The company, as one entity a search engine can hang mentions on.
 *
 * On / and /about. "Closewatch" alone is also a farm-camera company and a
 * police tip app, so this is the record that says which Closewatch the proposal
 * tracker is: the founder, and every profile that really exists. Add a profile
 * to `sameAs` only once it is live. A sameAs pointing at a 404 is worse than a
 * short list.
 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: 'Closewatch',
    url: `${origin}/`,
    logo: `${origin}/android-chrome-512x512.png`,
    description:
      'Closewatch is proposal tracking software. It turns the proposal PDF you already send into a tracked link and shows who opened it, how long they spent on pricing, and whether it was forwarded.',
    email: 'hello@getclosewatch.com',
    founder: FOUNDER,
    sameAs: [PRODUCT_HUNT],
  }
}

/**
 * The byline, in the two forms a crawler looks for. Every guide and the pillar
 * already show "By Carlos Soto" and name him as Article.author; a crawler that
 * only reads <meta name="author"> or rel="author" missed both.
 */
export const AUTHOR_META = { name: 'author', content: FOUNDER.name }
export const AUTHOR_LINK = { rel: 'author', href: FOUNDER.url }

/** The JSON-LD block as a head script. */
export function jsonLdScript(data: unknown) {
  return [
    {
      type: 'application/ld+json',
      children: JSON.stringify(data),
    },
  ]
}
