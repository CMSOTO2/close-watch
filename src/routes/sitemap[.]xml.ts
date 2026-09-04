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
 */
const PATHS = [
  '/',
  '/demo',
  '/proposal-tracking-for-agencies',
  '/proposal-tracking-for-fractional-executives',
  '/vs/proposify',
  '/vs/pandadoc',
  '/vs/docsend',
  '/privacy',
  '/terms',
  '/dpa',
]

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const urls = PATHS.map(
          (path) => `  <url><loc>${origin}${path}</loc></url>`,
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
