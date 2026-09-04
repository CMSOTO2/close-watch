import { Link } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { PageContainer } from '#/components/page-container'

/**
 * The footer on every public page.
 *
 * It carries the comparison and audience pages because otherwise nothing links
 * to them. A page reachable only from a sitemap is a page a crawler visits
 * once and never weighs: internal links are most of how a small site tells
 * search engines which of its pages matter, and this is the cheapest place to
 * spend them. It is also the honest kind of navigation — someone weighing this
 * against DocSend genuinely wants that page.
 */
const COMPARE = [
  { label: 'vs Proposify', to: '/vs/proposify' },
  { label: 'vs PandaDoc', to: '/vs/pandadoc' },
  { label: 'vs DocSend', to: '/vs/docsend' },
  { label: 'For agencies', to: '/proposal-tracking-for-agencies' },
] as const

const LEGAL = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'DPA', to: '/dpa' },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <PageContainer className="py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <Wordmark />

          <nav
            aria-label="Compare"
            className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-2"
          >
            {COMPARE.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-xs text-ink-2">
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-4">
            {LEGAL.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="text-ink-3">
            © {new Date().getUTCFullYear()} Closewatch
          </span>
        </div>
      </PageContainer>
    </footer>
  )
}
