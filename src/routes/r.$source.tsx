import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '#/components/landing/landing-page'
import { landingMeta } from '#/components/landing/landing-meta'
import { publicEnv } from '#/env'

// The landing page again, under a path that names where the visitor came from:
// getclosewatch.com/r/hn, /r/reddit, /r/linkedin. Cloudflare Web Analytics
// logs the path but drops query strings, so `?utm_source=hn` would tell us
// nothing while `/r/hn` shows up as its own row in Top pages. It survives the
// cases a Referer header does not: an app that opens links in a webview, a
// paste into a DM, a client that sends no referrer at all.
//
// This serves the page rather than redirecting to `/` on purpose. A 302 sends
// no HTML, so the beacon never runs and the visit is never counted, which is
// the one thing the path was for. The canonical link is what keeps the
// duplicate out of search results: every /r/… page points home.
export const Route = createFileRoute('/r/$source')({
  head: () => ({
    meta: landingMeta(),
    links: [{ rel: 'canonical', href: `${publicEnv.VITE_PUBLIC_URL}/` }],
  }),
  component: LandingPage,
})
