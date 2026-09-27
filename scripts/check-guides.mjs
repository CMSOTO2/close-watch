/**
 * The content rules for the guides and the /proposal-tracking pillar, checked.
 *
 * These are the rules docs/geo:aeo/04-remaining-pages.md and docs/SEO.md state
 * in prose. They lived only in prose until a batch of guides went live over
 * every one of them, so now they fail a run instead:
 *
 * - the <title>, with " | Closewatch", at most 60 characters (metaTitle if set);
 * - the description between 110 and 160 characters;
 * - the answer block (the first paragraph of the body) under 60 words;
 * - five to eight FAQs;
 * - every /guides/ link pointing at a guide registered in index.ts, so nothing
 *   links to an unpublished draft;
 * - every registered guide in the sitemap, and no unregistered one.
 *
 * Run it before deploying content: `node scripts/check-guides.mjs`. It exits
 * non-zero on any failure and prints one line per page either way.
 */

import { readFileSync, readdirSync } from 'node:fs'

const DIR = 'src/content/guides/'
const PILLAR = 'src/content/proposal-tracking.ts'
const SITEMAP = 'src/routes/sitemap[.]xml.ts'
const SUFFIX = ' | Closewatch'

const files = readdirSync(DIR)
  // Everything else in the folder is a guide. load.ts is the lazy loader.
  .filter(
    (f) =>
      f.endsWith('.ts') && !['index.ts', 'types.ts', 'load.ts'].includes(f),
  )
  .map((f) => DIR + f)
files.push(PILLAR)

const registered = new Set(
  [
    ...readFileSync(DIR + 'index.ts', 'utf8').matchAll(
      /from '\.\/([a-z0-9-]+)'/g,
    ),
  ]
    .map((m) => m[1])
    .filter((s) => s !== 'types'),
)
const sitemap = readFileSync(SITEMAP, 'utf8')

let failures = 0

for (const path of files) {
  const src = readFileSync(path, 'utf8')
  const slug = path.split('/').pop().replace('.ts', '')
  const isGuide = path.startsWith(DIR)
  const kind = isGuide ? (registered.has(slug) ? 'live ' : 'draft') : 'pillar'
  const problems = []

  const body = src.split('body: `')[1].split('`,\n}')[0]
  const title = (src.match(/metaTitle: '([^']+)'/) ??
    src.match(/title: '([^']+)'/))[1]
  const description = src.match(/description:\s*'([^']+)'/)[1]
  const answerWords = body.split('\n\n')[0].split(/\s+/).length
  const faqs = (
    (body.split('## Frequently asked questions')[1] ?? '').match(/^### /gm) ??
    []
  ).length
  const links = [...body.matchAll(/\]\(\/guides\/([a-z0-9-]+)\)/g)].map(
    (m) => m[1],
  )

  const titleLength = (title + SUFFIX).length
  if (titleLength > 60) problems.push(`title ${titleLength} chars`)
  if (description.length < 110 || description.length > 160)
    problems.push(`description ${description.length} chars`)
  if (answerWords >= 60) problems.push(`answer ${answerWords} words`)
  if (faqs < 5 || faqs > 8) problems.push(`${faqs} FAQs`)
  for (const l of links.filter((l) => !registered.has(l)))
    problems.push(`links to unregistered /guides/${l}`)
  if (isGuide) {
    const inSitemap = sitemap.includes(`/guides/${slug}'`)
    if (registered.has(slug) && !inSitemap)
      problems.push('missing from sitemap')
    if (!registered.has(slug) && inSitemap) problems.push('draft in sitemap')
  }

  if (problems.length) failures++
  console.log(
    `${problems.length ? 'FAIL' : 'ok  '} ${kind} ${slug.padEnd(46)} ` +
      `title ${titleLength}  desc ${description.length}  answer ${answerWords}w  faqs ${faqs}` +
      (problems.length ? `  <- ${problems.join('; ')}` : ''),
  )
}

console.log(
  `\n${files.length} pages, ${registered.size} guides registered, ${failures} failing`,
)
process.exit(failures ? 1 : 0)
