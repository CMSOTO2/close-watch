import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageContainer } from '#/components/page-container'
import { SiteHeader } from '#/components/landing/site-header'
import { SiteFooter } from '#/components/site-footer'
import { cn } from '#/lib/utils'

/**
 * The type every reading page shares: the guides, the legal pages and About.
 *
 * They used to be three designs. Guides had a centred 680px column; the legal
 * pages had a 70ch column pinned left under their own header, grey links and a
 * footer of their own; About was a third variation. Someone moving between them
 * saw the site change shape for no reason, and LegalPage's private header is
 * how a signed-in owner came to be told to sign in on the terms. One layout and
 * one set of element styles ends both.
 *
 * `prose` carries no vertical margin on flow elements (p, ul, ol). Markdown
 * adds its own `mt-4` between siblings; JSX pages use `body`, which spaces its
 * children with a gap instead. Headings keep their top margin because a section
 * break is part of what a heading is, in either kind of page.
 */
export const prose = {
  h2: 'mt-12 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-[26px]',
  h3: 'mt-8 font-display text-lg font-semibold tracking-[-0.015em]',
  p: 'text-[15px] leading-relaxed text-ink-2',
  /** A run of paragraphs and lists written as JSX rather than markdown. */
  body: 'flex flex-col gap-4 text-[15px] leading-relaxed text-ink-2',
  ul: 'flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-ink-3',
  ol: 'flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-2 marker:text-ink-3',
  strong: 'font-semibold text-ink',
  // The underline is what marks a link here: brand against the ink-2 body
  // text is only 1.4:1, so it has to be drawn in the link's own colour (5:1
  // light, 8.9:1 dark) rather than brand-line, which was 1.3:1 and close to
  // invisible. Hover goes to ink, not brand-2, which is 3:1 on the light canvas.
  a: 'font-medium text-brand underline decoration-current decoration-1 underline-offset-[3px] hover:text-ink',
  blockquote: 'mt-4 border-l-2 border-brand-line pl-4 text-ink-2 italic',
} as const

export function ContentPage({
  back,
  kicker,
  title,
  dek,
  meta,
  children,
  after,
}: {
  /** A way up to the listing this page belongs to, above the title. */
  back?: { to: string; label: string }
  /** A small brand-coloured label above the title. */
  kicker?: string
  title: string
  /** The line under the title: a guide's dek, a policy's summary. */
  dek?: string
  /** Dates, in the small mono label style. */
  meta?: ReactNode
  children: ReactNode
  /** Below the article, outside it: a call to action, a contact line. */
  after?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        <PageContainer asMain className="py-14 sm:py-16">
          {/* A reading column centred on its own rather than left-aligned under
              the wide marketing container: 680px keeps lines around 65-75
              characters at any viewport, so the eye finds the start of the next
              line without losing it.

              Selected text uses the brand fill and its paired ink: 7.5:1 light,
              8.9:1 dark, and the highlight itself stands clear of the canvas.
              The browser default kept the text colour, which put brand links
              and ink-2 body text on an unknown blue. */}
          <div className="mx-auto max-w-[680px] selection:bg-brand-fill selection:text-brand-fill-ink">
            {back && (
              <Link
                to={back.to}
                className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink"
              >
                <ArrowLeft aria-hidden className="size-3.5" />
                {back.label}
              </Link>
            )}

            <article className={cn(back && 'mt-6')}>
              {kicker && <p className="kicker text-brand">{kicker}</p>}
              <h1
                className={cn(
                  'font-display text-3xl font-semibold tracking-[-0.03em] sm:text-[34px]',
                  kicker && 'mt-3',
                )}
              >
                {title}
              </h1>
              {dek && (
                <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
                  {dek}
                </p>
              )}
              {meta && <p className="kicker mt-4">{meta}</p>}

              <div className="mt-2">{children}</div>
            </article>

            {after}
          </div>
        </PageContainer>
      </main>

      <SiteFooter />
    </div>
  )
}
