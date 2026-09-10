import { createFileRoute } from '@tanstack/react-router'
import { publicEnv } from '#/env'

const origin = publicEnv.VITE_PUBLIC_URL.replace(/\/$/, '')

/**
 * Only pages worth landing on from a search result.
 *
 * /login is a form, /r/:source is the landing page under another name, and
 * /p/:token is somebody's private proposal. None of them belong here, and a
 * sitemap that lists junk teaches a crawler to trust the file less.
 *
 * priority and changefreq are omitted on purpose: Google has said for years it
 * ignores both, and writing numbers nobody reads invites arguments about them.
 *
 * lastmod is the exception. Google does read it, and on a site this young it is
 * the only crawl-scheduling hint we get to send: a page whose lastmod moved is
 * a page worth re-fetching, and one whose lastmod has not is one to skip. That
 * only holds while the dates are true. Google demotes the whole file to noise
 * the moment it notices every URL claiming to have changed on every deploy,
 * which is exactly what a build timestamp here would do. So these are written
 * by hand, and changing a page's copy means changing its date in the same
 * commit.
 */
const PAGES: Array<{ path: string; lastmod: string }> = [
  { path: '/', lastmod: '2026-09-04' },
  { path: '/demo', lastmod: '2026-09-03' },
  { path: '/proposal-tracking-for-agencies', lastmod: '2026-09-03' },
  {
    path: '/proposal-tracking-for-fractional-executives',
    lastmod: '2026-09-03',
  },
  { path: '/vs/proposify', lastmod: '2026-09-05' },
  { path: '/vs/pandadoc', lastmod: '2026-09-05' },
  { path: '/vs/docsend', lastmod: '2026-09-05' },
  { path: '/about', lastmod: '2026-09-09' },
  { path: '/guides', lastmod: '2026-09-10' },
  {
    path: '/guides/how-to-know-if-client-read-proposal',
    lastmod: '2026-09-10',
  },
  {
    path: '/guides/proposal-tracking-vs-email-open-tracking',
    lastmod: '2026-09-10',
  },
  { path: '/privacy', lastmod: '2026-09-03' },
  { path: '/terms', lastmod: '2026-09-05' },
  { path: '/dpa', lastmod: '2026-09-03' },
]

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const urls = PAGES.map(
          ({ path, lastmod }) =>
            `  <url><loc>${origin}${path}</loc><lastmod>${lastmod}</lastmod></url>`,
        ).join('\n')

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
        return new Response(body, {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
