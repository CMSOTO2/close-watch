import { GuideMarkdown } from '#/components/guides/guide-markdown'
import { PageContainer } from '#/components/page-container'
import { headingId, splitAtHeadings } from '#/lib/markdown-text'

/**
 * Long-form markdown on a marketing page: the comparison and audience pages'
 * sections on how it works, price, switching and limits.
 *
 * Written in markdown so it can link into the guides in a sentence and carry
 * screenshots, but laid out like the page around it rather than as a guide.
 * It first went in as a guide's centred 680px reading column, which read as a
 * blog post dropped into the bottom of a landing page. Here each H2 becomes a
 * block in the page's own heading style, the heading on the left and the text
 * on the right from lg up, divided by hairlines.
 */
export function LongFormSections({
  markdown,
  className,
}: {
  markdown: string
  className?: string
}) {
  const { sections } = splitAtHeadings(markdown, 2)
  return (
    <section className={className}>
      <PageContainer className="py-16 sm:py-20">
        <div className="divide-y divide-line">
          {sections.map((s) => (
            <div
              key={s.title}
              className="grid gap-5 py-12 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14"
            >
              {/* Sticky from lg up, so a long section with a screenshot in it
                  keeps its heading beside the text being read. top-24 clears
                  the sticky site header. */}
              <h2
                id={headingId(s.title)}
                className="max-w-[22ch] scroll-mt-20 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl lg:sticky lg:top-24 lg:self-start"
              >
                {s.title}
              </h2>
              <div className="max-w-[64ch] min-w-0 [&>:first-child]:mt-0">
                <GuideMarkdown>{s.body}</GuideMarkdown>
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  )
}

/**
 * Questions and answers, in the style the audience pages' FAQs were already
 * in. Answers are markdown so a comparison page's FAQ keeps its links; a plain
 * string renders as a single paragraph. The descendant selectors undo the
 * guide paragraph's 15px size and 16px top margin, which suit a reading column
 * and not a list.
 */
export function QuestionList({
  items,
}: {
  items: Array<{ q: string; a: string }>
}) {
  return (
    <div className="mt-8 max-w-3xl border-t border-line">
      {items.map(({ q, a }) => (
        <div key={q} className="border-b border-line py-5">
          <h3 className="text-[15px] font-medium tracking-[-0.008em]">{q}</h3>
          <div className="max-w-[68ch] [&_p]:mt-2 [&_p]:text-[14px]">
            <GuideMarkdown>{a}</GuideMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}
