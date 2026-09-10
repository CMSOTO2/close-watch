import { guide as howToKnowIfClientRead } from './how-to-know-if-client-read-proposal'
import { guide as proposalTrackingVsEmailOpenTracking } from './proposal-tracking-vs-email-open-tracking'
import type { Guide } from './types'

/**
 * Newest first — this is the order the index page lists them in.
 *
 * Each entry is a question with a real, checkable answer, not a landing page.
 * If a topic can't say something a general-purpose model couldn't already
 * generate, it belongs as an FAQ line on an existing page instead of a guide
 * of its own.
 */
export const GUIDES: Array<Guide> = [
  howToKnowIfClientRead,
  proposalTrackingVsEmailOpenTracking,
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}
