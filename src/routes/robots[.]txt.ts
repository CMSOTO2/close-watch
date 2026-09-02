import { createFileRoute } from '@tanstack/react-router'
import { publicEnv } from '#/env'

const origin = publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')

/**
 * Everything public is crawlable. The two things that should not be indexed
 * say so themselves instead of being blocked here.
 *
 * Share links are deliberately not disallowed. A crawler has to fetch a page to
 * read its noindex, and a Disallow would leave a leaked link eligible for a
 * URL-only listing in results with no way for us to suppress it. /p/:token
 * already sends `noindex` and `no-referrer`, which is the stronger control.
 *
 * The /r/:source pages are crawlable for the same reason: each carries a
 * canonical pointing at /, and a blocked page is a canonical nobody reads.
 */
const BODY = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(BODY, {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        }),
    },
  },
})
