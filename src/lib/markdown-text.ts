/**
 * Plain-text helpers for the markdown the guides, the pillar and the
 * comparison pages are written in.
 *
 * Kept apart from lib/seo.ts and the renderer because both of those import
 * things that need the app's environment, and these need to run in a unit
 * test: they are what keep the table of contents pointing at real headings.
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

/**
 * A markdown body cut at every heading of one level: whatever comes before the
 * first, then each heading's text with the markdown under it. Deeper headings
 * stay inside their section's body. The comparison and audience pages use it
 * to lay each section out in their own style rather than as a guide.
 */
export function splitAtHeadings(md: string, level: 2 | 3) {
  const [lead, ...parts] = md.split(new RegExp(`^${'#'.repeat(level)} `, 'm'))
  return {
    lead: lead.trim(),
    sections: parts.map((part) => {
      const newline = part.indexOf('\n')
      const title = (newline === -1 ? part : part.slice(0, newline)).trim()
      const body = newline === -1 ? '' : part.slice(newline + 1).trim()
      return { title, body }
    }),
  }
}

/** The H2s of a markdown body, as the table of contents lists them. */
export function sectionsOf(body: string) {
  return [...body.matchAll(/^## (.+)$/gm)].map((m) => {
    const text = plainText(m[1])
    return { id: headingId(text), text }
  })
}
