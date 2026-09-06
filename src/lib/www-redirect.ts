import { publicEnv } from '#/env'

/**
 * The hostname this deployment answers to, from VITE_PUBLIC_URL. Exported so a
 * test can assert the wrapper below uses it without reading the environment a
 * second way and quietly disagreeing with this one.
 */
export const CANONICAL_HOST = new URL(publicEnv.VITE_PUBLIC_URL).hostname

/**
 * Where a request to `requestUrl` should be sent instead, given the host this
 * site answers to, or null to serve it here.
 *
 * Split from the wrapper below and given its host rather than reading one,
 * because the rule is about two hostnames and nothing else. Reading the
 * configured host in here made every assertion depend on the ambient
 * environment: the tests passed locally against `.env`, and in CI — where
 * VITE_PUBLIC_URL is deliberately `http://localhost:3000` — they did something
 * worse than fail. Four went red, and the two checking that a host is *left
 * alone* went green for the wrong reason, because at that point every input
 * returns null. A test that cannot fail is not covering anything.
 *
 * Only one case answers non-null: the www copy of our own host. Cloudflare
 * warns that www.getclosewatch.com resolves nowhere, and a hostname that
 * resolves nowhere is the worst of the three options — a visitor who types it
 * gets a DNS error rather than a page, and any inbound link written with the
 * www is dead on arrival. Backlinks are the one thing actually holding the
 * young pages out of the index, so losing one to a prefix nobody meant to type
 * is a bad trade for a redirect that costs a line.
 *
 * The scheme is forced to https because a 301 is cached hard by browsers: an
 * http://www request that redirected to http:// apex would be remembered as
 * the route for that hostname, and the edge's own upgrade would then run on
 * every visit forever after.
 */
export function redirectFromWww(
  requestUrl: string,
  canonicalHost: string,
): string | null {
  const url = new URL(requestUrl)
  if (url.hostname !== `www.${canonicalHost}`) return null

  url.protocol = 'https:'
  // hostname, not host: the port belongs to whoever is listening and is none
  // of this function's business. In production there is never one.
  url.hostname = canonicalHost
  return url.toString()
}

/**
 * The same rule against the host this deployment actually answers to. This is
 * what src/server.ts calls; 301 rather than 302 because the move is permanent
 * and we want Google to fold the hostname into the canonical one rather than
 * keep crawling both.
 */
export function wwwRedirect(requestUrl: string): string | null {
  return redirectFromWww(requestUrl, CANONICAL_HOST)
}
