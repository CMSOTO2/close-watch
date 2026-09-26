import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { redirectTrailingSlash, wwwRedirect } from '#/lib/www-redirect'
import type { ServerEntry } from '@tanstack/react-start/server-entry'

/**
 * The worker's entry, reached through `main` in wrangler.jsonc. Start resolves
 * `src/server` by name too, but that resolution loses: the Cloudflare plugin
 * hands `main` to the worker build as its input, so whatever `main` names is
 * what ships. Left at the package default, this file builds clean and is never
 * called.
 *
 * It is the package default — createStartHandler over defaultStreamHandler —
 * plus one thing: an answer for www.getclosewatch.com before the router sees
 * it. The router has no concept of a hostname and should not grow one for this;
 * a route is a path, and this is a question about which name of the site you
 * arrived under. See lib/www-redirect for why it is answered at all.
 *
 * The trailing slash is folded in here too, so `www.…/about/` takes one 301
 * rather than two. Only for reads: a redirected POST arrives as a GET, and the
 * webhook and tracking endpoints should keep failing loudly on a bad URL
 * instead of quietly losing their body.
 */
const handler = createStartHandler(defaultStreamHandler)

const entry: ServerEntry = {
  async fetch(request, ...rest) {
    const fromWww = wwwRedirect(request.url)
    const isRead = request.method === 'GET' || request.method === 'HEAD'
    const target =
      (isRead && redirectTrailingSlash(fromWww ?? request.url)) || fromWww
    if (target) return Response.redirect(target, 301)

    return handler(request, ...rest)
  },
}

export default entry
