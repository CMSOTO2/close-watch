import { Link } from '@tanstack/react-router'
import { Wordmark } from '#/components/brand-mark'
import { LaunchBadge } from '#/components/launch-badge'
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
 *
 * Four even columns rather than one wide nav and one narrow one, so the grid
 * balances at every breakpoint instead of leaving Product looking heavier than
 * everything beside it: two columns stacked two-by-two below `sm`, four in a
 * row from `sm` up. Brand spans both columns of the mobile pair because a
 * wordmark and a badge next to a bare link list reads lopsided otherwise.
 */
const PRODUCT = [
  { label: 'vs Proposify', to: '/vs/proposify' },
  { label: 'vs PandaDoc', to: '/vs/pandadoc' },
  { label: 'vs DocSend', to: '/vs/docsend' },
  { label: 'For agencies', to: '/proposal-tracking-for-agencies' },
  {
    label: 'For fractional execs',
    to: '/proposal-tracking-for-fractional-executives',
  },
] as const

const COMPANY = [{ label: 'About', to: '/about' }] as const

const LEGAL = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'DPA', to: '/dpa' },
] as const

function FooterColumn({
  heading,
  items,
}: {
  heading: string
  items: ReadonlyArray<{ label: string; to: string }>
}) {
  return (
    <nav aria-label={heading} className="flex flex-col gap-3">
      <p className="kicker">{heading}</p>
      <ul className="flex flex-col gap-2 text-xs text-ink-2">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <PageContainer className="py-10">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8">
          {/* The badge sits under the wordmark rather than in a link row,
              because it is not navigation: it is the one outbound link here
              that a reader clicks to check us out rather than to go deeper. */}
          <div className="col-span-2 flex flex-col items-start gap-5 sm:col-span-1">
            <Wordmark />
            <LaunchBadge />
            {/* Feedback sits here rather than in a nav column because it is
                not a page to read, it is the one thing in this footer you
                click to talk to us. The subject is pre-filled so a reply
                lands in one thread instead of a dozen "(no subject)" ones. */}
            <a
              href="mailto:hello@getclosewatch.com?subject=Closewatch%20feedback"
              className="text-xs text-ink-2 transition-colors hover:text-ink"
            >
              Send feedback
            </a>
          </div>

          <FooterColumn heading="Product" items={PRODUCT} />
          <FooterColumn heading="Company" items={COMPANY} />
          <FooterColumn heading="Legal" items={LEGAL} />
        </div>

        <div className="mt-10 border-t border-line pt-6 text-xs text-ink-3">
          © {new Date().getUTCFullYear()} Closewatch
        </div>
      </PageContainer>
    </footer>
  )
}
