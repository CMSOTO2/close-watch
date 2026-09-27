import type { Guide } from './types'

/** A guide without its body: everything a list, a card or a head() needs. */
export type GuideMeta = Omit<Guide, 'body'>

/**
 * The guides, reached only through route loaders and only by dynamic import.
 *
 * The bodies are about 190 KB of markdown. Imported statically from a route
 * file, they landed in the entry chunk that every page downloads, the home page
 * included, because a route's loader and head() are not split out the way its
 * component is. Behind a dynamic import they become a chunk of their own, and
 * on a first page load the browser does not fetch it at all: the loader runs on
 * the server, its data is rendered into the HTML, and hydration reuses it. Only
 * client-side navigation to a guide page fetches it.
 *
 * It goes through the GUIDES registry rather than globbing the folder, so a
 * guide file that is written but not yet registered is not a live URL.
 *
 * Nothing in the client graph may import `./index` statically, or every guide
 * is pulled back into the entry. llms.txt and the tests can, since they only
 * run on the server.
 */
export async function loadGuide(slug: string): Promise<Guide | undefined> {
  const { getGuide } = await import('./index')
  return getGuide(slug)
}

export async function loadGuideIndex() {
  const { GUIDES, STAGES } = await import('./index')
  return {
    stages: STAGES,
    guides: GUIDES.map(({ body: _body, ...meta }): GuideMeta => meta),
  }
}
