import { SAMPLE_CLIENT, SAMPLE_PAGES, SAMPLE_TITLE } from './sample'

/**
 * The sample proposal as a real file, so the demo's Download and Print buttons
 * do the thing they are named after.
 *
 * They used to do nothing but record the event, and the report then said
 * "Printed it +18" for a print that never happened. On a page whose whole
 * argument is that the numbers are honest, a button that scores you for an
 * action it did not perform is the worst possible bug to ship. The proposal is
 * written as HTML rather than a PDF (see `sample.ts` for why there is no PDF),
 * so this builds a self-contained document from the same pages on screen.
 */

const STYLES = `
  @page { margin: 18mm; }
  body { font: 12pt/1.55 Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
  section { page-break-after: always; }
  section:last-of-type { page-break-after: auto; }
  .kicker { font: 600 9pt/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #6b6b6b; }
  h1 { font: 600 22pt/1.2 ui-sans-serif, system-ui, sans-serif; margin: 8pt 0 14pt; }
  h2 { font: 600 16pt/1.25 ui-sans-serif, system-ui, sans-serif; margin: 8pt 0 12pt; }
  p { margin: 0 0 10pt; max-width: 34em; }
  table { border-collapse: collapse; margin-top: 14pt; min-width: 22em; }
  td { padding: 5pt 0; border-top: 1px solid #ddd; }
  td + td { text-align: right; padding-left: 24pt; }
  tr:last-child td { border-top: 2px solid #333; font-weight: 700; }
  footer { margin-top: 16pt; font: 9pt ui-sans-serif, system-ui, sans-serif; color: #6b6b6b; }
`

const escape = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  )

/** The sample proposal as a standalone HTML document. */
export function sampleProposalHtml(): string {
  const pages = SAMPLE_PAGES.map((page) => {
    const lines = page.lines
      ? `<table><tbody>${page.lines
          .map(
            (l) =>
              `<tr><td>${escape(l.item)}</td><td>${escape(l.amount)}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : ''
    const heading = page.page === 1 ? 'h1' : 'h2'
    return `<section>
  <p class="kicker">${escape(page.kicker)}</p>
  <${heading}>${escape(page.title)}</${heading}>
  ${page.body.map((b) => `<p>${escape(b)}</p>`).join('\n  ')}
  ${lines}
</section>`
  }).join('\n')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escape(SAMPLE_TITLE)} — ${escape(SAMPLE_CLIENT)}</title>
<style>${STYLES}</style>
</head><body>
${pages}
<footer>Sample proposal from the Closewatch demo. Northwind Studio and ${escape(
    SAMPLE_CLIENT,
  )} are invented.</footer>
</body></html>`
}

/** Filename for the download, matching the viewer's `title.pdf` shape. */
export const SAMPLE_FILE_NAME = 'Brand-identity-and-website-sample.html'

export function sampleProposalBlob(): Blob {
  return new Blob([sampleProposalHtml()], { type: 'text/html;charset=utf-8' })
}
