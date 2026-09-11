import { Link } from '@tanstack/react-router'
import { PageContainer } from '#/components/page-container'

/**
 * The footer inside the app, once someone is signed in.
 *
 * Not SiteFooter. That one's first column is comparison and audience pages,
 * which exist to be crawled and to persuade someone still deciding; a signed-in
 * owner has decided, and "vs DocSend" under their dashboard is an ad for the
 * thing they already bought. What survives the move is what an owner still
 * reaches for: the guides, which answer the questions that come up right after
 * sending a proposal (how long to wait, what silence means), the legal pages a
 * paying customer should be able to find without signing out, and a way to
 * tell us something is wrong.
 *
 * One quiet row, ink-2 on canvas (7:1), so it reads as the edge of the page
 * rather than a second navigation competing with the bar at the top.
 */
const LINKS = [
  { label: 'Guides', to: '/guides' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'DPA', to: '/dpa' },
] as const

export function AppFooter() {
  return (
    <footer className="border-t border-line">
      <PageContainer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 text-xs text-ink-2">
        <nav aria-label="Resources">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition-colors hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Same pre-filled subject as the public footer, so replies from inside
            the app land in the same thread as everyone else's. */}
        <a
          href="mailto:hello@getclosewatch.com?subject=Closewatch%20feedback"
          className="transition-colors hover:text-ink"
        >
          Send feedback
        </a>
      </PageContainer>
    </footer>
  )
}
