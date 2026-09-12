/**
 * Plain-text helpers for the markdown the guides, the pillar and the
 * comparison pages are written in.
 *
 * Kept apart from lib/seo.ts and the renderer because both of those import
 * things that need the app's environment, and these need to run in a unit
 * test: they are what keep the table of contents pointing at real headings and
 * the FAQPage markup matching the visible FAQ.
 */

/** Markdown reduced to the words a reader sees. */
export function plainText(md: string) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|`/g, '')
    .replace(/^> ?/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The id a heading gets. The renderer passes this to @tanstack/markdown as
 * `headingIds`, and the table of contents calls it on the same text, so a
 * contents link always lands on its heading.
 */
export function headingId(text: string) {
  return text
    .toLowerCase()
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The H2s of a markdown body, as the table of contents lists them. */
export function sectionsOf(body: string) {
  return [...body.matchAll(/^## (.+)$/gm)].map((m) => {
    const text = plainText(m[1])
    return { id: headingId(text), text }
  })
}

/**
 * The questions under a body's "Frequently asked questions" heading, read out
 * of the same markdown that renders them. That is what makes FAQPage markup
 * safe to carry: there is one copy of every answer, so the markup cannot drift
 * from the page.
 */
export function faqsFromMarkdown(body: string) {
  const section = body.split('## Frequently asked questions')[1]
  if (!section) return []
  return section
    .split(/^### /m)
    .slice(1)
    .map((chunk) => {
      const [question, ...answer] = chunk.split('\n')
      return {
        question: plainText(question),
        answer: plainText(answer.join('\n')),
      }
    })
    .filter((f) => f.answer)
}
