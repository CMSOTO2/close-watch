import { publicEnv } from '#/env'

const CANONICAL_HOST = new URL(publicEnv.VITE_PUBLIC_URL).hostname

/**
 * Where a request should be sent instead, or null to serve it here.
 *
 * Only one case answers non-null: the www copy of our own host. Cloudflare
 * warns that www.getclosewatch.com resolves nowhere, and a hostname that
 * resolves nowhere is the worst of the three options — a visitor who types it
 * gets a DNS error rather than a page, and any inbound link written with the
 * www is dead on arrival. Backlinks are the one thing actually holding the
 * young pages out of the index, so losing one to a prefix nobody meant to type
 * is a bad trade for a redirect that costs a line.
 *
 * 301 rather than 302 because this is permanent and we want Google to fold the
 * hostname into the canonical one rather than keep crawling both.
 *
 * The scheme is forced to https because a 301 is cached hard by browsers: an
 * http://www request that redirected to http:// apex would be remembered as
 * the route for that hostname, and the edge's own upgrade would then run on
 * every visit forever after.
 */
export function wwwRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl)
  if (url.hostname !== `www.${CANONICAL_HOST}`) return null

  url.protocol = 'https:'
  // hostname, not host: the port belongs to whoever is listening and is none
  // of this function's business. In production there is never one.
  url.hostname = CANONICAL_HOST
  return url.toString()
}
