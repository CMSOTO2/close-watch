import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'
import { wwwRedirect } from '#/lib/www-redirect'
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
 */
const handler = createStartHandler(defaultStreamHandler)

const entry: ServerEntry = {
  async fetch(request, ...rest) {
    const target = wwwRedirect(request.url)
    if (target) return Response.redirect(target, 301)

    return handler(request, ...rest)
  },
}

export default entry
