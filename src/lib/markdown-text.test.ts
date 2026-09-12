import { existsSync, readFileSync } from 'node:fs'
import { renderHtml } from '@tanstack/markdown'
import { describe, expect, it } from 'vitest'
import { COMPETITORS } from '#/components/compare/competitors'
import { GUIDES } from '#/content/guides'
import { pillar } from '#/content/proposal-tracking'
import {
  headingId,
  plainText,
  sectionsOf,
  splitAtHeadings,
} from '#/lib/markdown-text'

const BODIES = [
  ...GUIDES.map((g) => ({ name: g.slug, body: g.body })),
  { name: 'pillar', body: pillar.body },
  ...Object.values(COMPETITORS).map((c) => ({
    name: `vs/${c.slug}`,
    body: [c.intro, c.details, c.faqs].join('\n\n'),
  })),
]

describe('headingId', () => {
  it('drops quotes and joins words with hyphens', () => {
    expect(headingId('When "we need to think about it" means no')).toBe(
      'when-we-need-to-think-about-it-means-no',
    )
    expect(headingId("Proposify's price, in 2026?")).toBe(
      'proposifys-price-in-2026',
    )
  })

  it('is the id the markdown renderer puts on the heading', () => {
    for (const { body } of BODIES) {
      const html = renderHtml(body, { headingIds: headingId })
      for (const s of sectionsOf(body)) {
        expect(html).toContain(`id="${s.id}"`)
      }
    }
  })
})

describe('splitAtHeadings', () => {
  it('cuts at one heading level and keeps deeper ones in the body', () => {
    const { lead, sections } = splitAtHeadings(
      'Intro.\n\n## One\n\nText.\n\n### Deeper\n\nMore.\n\n## Two\n\nLast.',
      2,
    )
    expect(lead).toBe('Intro.')
    expect(sections).toEqual([
      { title: 'One', body: 'Text.\n\n### Deeper\n\nMore.' },
      { title: 'Two', body: 'Last.' },
    ])
  })

  it('reads every comparison page FAQ as a list of questions', () => {
    for (const c of Object.values(COMPETITORS)) {
      const { sections } = splitAtHeadings(c.faqs, 3)
      expect(sections.length, c.slug).toBeGreaterThanOrEqual(5)
      for (const s of sections) {
        expect(s.title.endsWith('?'), s.title).toBe(true)
        expect(s.body.length, s.title).toBeGreaterThan(0)
      }
    }
  })
})

describe('plainText', () => {
  it('keeps link text and drops images and emphasis', () => {
    expect(
      plainText('See **this** [guide](/guides/x). ![alt](/images/y.webp "t")'),
    ).toBe('See this guide.')
  })
})

describe('images', () => {
  // The audience pages keep their long-form markdown in the route file.
  const routes = [
    'src/routes/proposal-tracking-for-agencies.tsx',
    'src/routes/proposal-tracking-for-fractional-executives.tsx',
  ].map((path) => readFileSync(path, 'utf8'))

  it('every /images/ path a page uses exists in public/, with a dark twin', () => {
    const text = [...BODIES.map((b) => b.body), ...routes].join('\n')
    const paths = new Set(
      [...text.matchAll(/\/images\/[a-z0-9-]+\.webp/g)].map((m) => m[0]),
    )
    expect(paths.size).toBeGreaterThan(0)
    for (const path of paths) {
      expect(existsSync(`public${path}`), path).toBe(true)
      // ProductShot swaps to this in the dark theme.
      const dark = path.replace(/\.webp$/, '-dark.webp')
      expect(existsSync(`public${dark}`), dark).toBe(true)
    }
  })
})
